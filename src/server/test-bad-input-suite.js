const axios = require('axios');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Issue = require('./models/Issue');

try {
  require('dns').setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

const BASE_URL = 'http://localhost:5000/api';
const PRIMARY_MONGO_URI = process.env.MONGO_URI;
const FALLBACK_MONGO_URI = 'mongodb://127.0.0.1:27017/civictrack';
const UPLOADS_DIR = path.join(__dirname, 'uploads');

async function runBadInputVerificationSuite() {
  console.log('\n================================================================');
  console.log('  CIVICTRACK: HACKMYSURU BAD-INPUT VERIFICATION TEST SUITE       ');
  console.log('  Testing Cases A (Duplicate), B (Location), C (Photo), D (Text)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`\x1b[32m✔ PASS:\x1b[0m ${name}`);
      passed++;
    } else {
      console.log(`\x1b[31m✘ FAIL:\x1b[0m ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    try {
      await mongoose.connect(PRIMARY_MONGO_URI);
      console.log('[Test Setup] Connected to primary MongoDB for authoritative verification.\n');
    } catch (primaryErr) {
      console.log('[Test Setup] Primary connection failed, connecting to fallback local MongoDB...\n');
      await mongoose.connect(FALLBACK_MONGO_URI);
      console.log('[Test Setup] Connected to fallback local MongoDB.\n');
    }

    // Acquire Citizen JWT
    console.log('--- Step 0: Citizen Authentication ---');
    const loginRes = await axios.post(`${BASE_URL}/auth/demo-login`, { role: 'CITIZEN' });
    const token = loginRes.data.token;
    assert(token && loginRes.data.user.role === 'CITIZEN', 'Citizen authenticated via demo login');

    const authHeaders = {
      Authorization: `Bearer ${token}`
    };

    // -------------------------------------------------------------
    // Case A: Duplicate Report Detection
    // -------------------------------------------------------------
    console.log('\n--- Case A: Duplicate Report Prevention & 409 Conflict ---');
    const uniqueBatchSuffix = `t${Date.now()}`;
    const initialReportTitle = `Flooded Underpass near Railway Station ${uniqueBatchSuffix}`;

    const validPayload = {
      title: initialReportTitle,
      category: 'Drainage & Sewage',
      description: 'Underpass drainage is completely blocked with standing stormwater 2 feet high.',
      ward: 'Ward 01 - Mysore Palace & City Center',
      address: 'City Railway Station Underbridge, Dhanvantri Road',
      landmark: 'Near Railway Main Exit Gate',
      priority: 'P2',
      lat: 12.3115,
      lng: 76.6492
    };

    // 1. Submit Initial Report -> Should Succeed with 201
    const resA1 = await axios.post(`${BASE_URL}/issues`, validPayload, { headers: authHeaders });
    assert(resA1.status === 201, 'Test 1: Initial valid report accepted (HTTP 201)');
    const originalCaseId = resA1.data.data?.caseId;
    assert(originalCaseId && originalCaseId.startsWith('CT-2026-'), `Case ID assigned: ${originalCaseId}`);

    // 2. Submit Exact Duplicate -> Should Return 409 Conflict
    let resA2;
    try {
      resA2 = await axios.post(`${BASE_URL}/issues`, validPayload, { headers: authHeaders });
    } catch (err) {
      resA2 = err.response;
    }

    assert(resA2?.status === 409, 'Test 2: Duplicate submission rejected with HTTP 409 Conflict');
    assert(resA2?.data?.code === 'DUPLICATE_REPORT', 'Test 2b: Error code is DUPLICATE_REPORT');
    assert(
      resA2?.data?.message === 'Duplicate report detected. This report was already submitted.',
      'Test 2c: Informative message: "Duplicate report detected. This report was already submitted."'
    );
    assert(resA2?.data?.existingCaseId === originalCaseId, `Test 2d: Returns original Case ID ${originalCaseId}`);

    // 3. Authoritative DB Check -> Exactly 1 document in Mongo
    const dbDuplicates = await Issue.countDocuments({ title: initialReportTitle });
    assert(dbDuplicates === 1, `Test 3: Authoritative MongoDB verification: EXACTLY 1 document exists (count: ${dbDuplicates})`);

    // -------------------------------------------------------------
    // Case B: Invalid / Impossible Location
    // -------------------------------------------------------------
    console.log('\n--- Case B: Invalid / Impossible Location Coordinates ---');

    // Test 4: Latitude > 90 (e.g. 200)
    let resB1;
    try {
      resB1 = await axios.post(
        `${BASE_URL}/issues`,
        { ...validPayload, title: `Bad Lat ${uniqueBatchSuffix}`, lat: 200, lng: 76.6492 },
        { headers: authHeaders }
      );
    } catch (err) {
      resB1 = err.response;
    }
    assert(resB1?.status === 400, 'Test 4: Out-of-bounds Latitude (200) rejected with HTTP 400');
    assert(resB1?.data?.code === 'INVALID_LOCATION', 'Test 4b: Error code is INVALID_LOCATION');

    // Test 5: Longitude > 180 (e.g. 300)
    let resB2;
    try {
      resB2 = await axios.post(
        `${BASE_URL}/issues`,
        { ...validPayload, title: `Bad Lng ${uniqueBatchSuffix}`, lat: 12.3115, lng: 300 },
        { headers: authHeaders }
      );
    } catch (err) {
      resB2 = err.response;
    }
    assert(resB2?.status === 400, 'Test 5: Out-of-bounds Longitude (300) rejected with HTTP 400');
    assert(resB2?.data?.code === 'INVALID_LOCATION', 'Test 5b: Error code is INVALID_LOCATION');

    // Test 6: Non-numeric coordinates string
    let resB3;
    try {
      resB3 = await axios.post(
        `${BASE_URL}/issues`,
        { ...validPayload, title: `Non-numeric Coords ${uniqueBatchSuffix}`, lat: 'not_a_latitude', lng: 'not_a_longitude' },
        { headers: authHeaders }
      );
    } catch (err) {
      resB3 = err.response;
    }
    assert(resB3?.status === 400, 'Test 6: Non-numeric coordinate string rejected with HTTP 400');
    assert(resB3?.data?.code === 'INVALID_LOCATION', 'Test 6b: Error code is INVALID_LOCATION');

    // -------------------------------------------------------------
    // Case C: Invalid / Fake Photo File (Binary Magic Bytes)
    // -------------------------------------------------------------
    console.log('\n--- Case C: Invalid / Fake Photo File (Binary Magic-Byte Inspection) ---');

    // Create a disguised fake file: plain text disguised as a .jpg
    const fakeFilePath = path.join(__dirname, 'test-fake-photo.jpg');
    fs.writeFileSync(fakeFilePath, 'This is plain text content trying to bypass file upload filters by using a jpg extension.');

    const formC1 = new FormData();
    formC1.append('title', `Fake Photo Report ${uniqueBatchSuffix}`);
    formC1.append('category', 'Sanitation & Waste');
    formC1.append('description', 'Attempting upload with disguised text file.');
    formC1.append('ward', 'Ward 02 - Devaraja Mohalla');
    formC1.append('address', 'Sayyaji Rao Road');
    formC1.append('lat', '12.3080');
    formC1.append('lng', '76.6530');
    formC1.append('attachments', fs.createReadStream(fakeFilePath));

    let resC1;
    try {
      resC1 = await axios.post(`${BASE_URL}/issues`, formC1, {
        headers: {
          ...authHeaders,
          ...formC1.getHeaders()
        }
      });
    } catch (err) {
      resC1 = err.response;
    }

    assert(resC1?.status === 400, 'Test 7: Disguised text file (.jpg extension) rejected with HTTP 400');
    assert(resC1?.data?.code === 'INVALID_IMAGE_FILE', 'Test 7b: Error code is INVALID_IMAGE_FILE');
    assert(
      resC1?.data?.details?.includes('JPEG binary signature') || resC1?.data?.message?.includes('Invalid image file'),
      'Test 7c: Rejection details clearly identify binary signature mismatch'
    );

    // Clean up scratch file
    if (fs.existsSync(fakeFilePath)) fs.unlinkSync(fakeFilePath);

    // Verify unlinked file on server: No orphaned file in uploads
    const uploadedFiles = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : [];
    const leakedFake = uploadedFiles.filter(f => f.includes('test-fake-photo'));
    assert(leakedFake.length === 0, 'Test 8: Rejected disguised file was purged and not orphaned on server disk');

    // -------------------------------------------------------------
    // Case D: Abusive Text Filter & Content Moderation
    // -------------------------------------------------------------
    console.log('\n--- Case D: Abusive Text & Content Moderation ---');

    // Test 9: Deterministic test abusive word
    let resD1;
    try {
      resD1 = await axios.post(
        `${BASE_URL}/issues`,
        {
          ...validPayload,
          title: `Abusive Test Report ${uniqueBatchSuffix}`,
          description: 'This is a description containing an abusive_test_word that must be blocked.'
        },
        { headers: authHeaders }
      );
    } catch (err) {
      resD1 = err.response;
    }
    assert(resD1?.status === 400, 'Test 9: Report with abusive_test_word rejected with HTTP 400');
    assert(resD1?.data?.code === 'ABUSIVE_CONTENT', 'Test 9b: Error code is ABUSIVE_CONTENT');
    assert(
      resD1?.data?.message === 'Please remove abusive language from the report description.',
      'Test 9c: Informative prompt to remove abusive language'
    );

    // Test 10: Evasion normalization (leetspeak: @busive_test_w0rd)
    let resD2;
    try {
      resD2 = await axios.post(
        `${BASE_URL}/issues`,
        {
          ...validPayload,
          title: `Leetspeak Evasion Report ${uniqueBatchSuffix}`,
          description: 'Attempting to evade moderation filter with @busive_test_w0rd substitution.'
        },
        { headers: authHeaders }
      );
    } catch (err) {
      resD2 = err.response;
    }
    assert(resD2?.status === 400, 'Test 10: Leetspeak evasion attempt (@busive_test_w0rd) rejected with HTTP 400');
    assert(resD2?.data?.code === 'ABUSIVE_CONTENT', 'Test 10b: Error code is ABUSIVE_CONTENT');

    // -------------------------------------------------------------
    // Recovery & Valid Resubmission
    // -------------------------------------------------------------
    console.log('\n--- Recovery & Authentic Resubmission ---');

    // Create a genuine minimal 1x1 JPEG with valid FF D8 FF signature
    const realJpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
      0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
      0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
      0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
      0x00, 0xbf, 0x80, 0xff, 0xd9
    ]);

    const genuineFilePath = path.join(__dirname, 'test-genuine-photo.jpg');
    fs.writeFileSync(genuineFilePath, realJpegBuffer);

    const formValid = new FormData();
    formValid.append('title', `Clean Recovered Report with Real Photo ${uniqueBatchSuffix}`);
    formValid.append('category', 'Roads & Infrastructure');
    formValid.append('description', 'Recovered submission with corrected polite description and valid photo.');
    formValid.append('ward', 'Ward 08 - Jayalakshmipuram');
    formValid.append('address', 'Kalidasa Road, Near Anikethana Junction');
    formValid.append('lat', '12.3168');
    formValid.append('lng', '76.6315');
    formValid.append('attachments', fs.createReadStream(genuineFilePath));

    const resRecovered = await axios.post(`${BASE_URL}/issues`, formValid, {
      headers: {
        ...authHeaders,
        ...formValid.getHeaders()
      }
    });

    assert(resRecovered.status === 201, 'Test 11: Corrected resubmission with genuine JPEG succeeds (HTTP 201)');
    assert(resRecovered.data.data?.attachments?.length === 1, 'Test 11b: Genuine attachment saved in issue record');

    if (fs.existsSync(genuineFilePath)) fs.unlinkSync(genuineFilePath);

    // Final Database Sanity Check
    console.log('\n--- Final Authoritative State & Health Check ---');
    const badIssues = await Issue.find({
      $or: [
        { 'location.coordinates.lat': { $gt: 90 } },
        { 'location.coordinates.lat': { $lt: -90 } },
        { 'location.coordinates.lng': { $gt: 180 } },
        { 'location.coordinates.lng': { $lt: -180 } },
        { description: /abusive_test_word/i }
      ]
    });
    assert(badIssues.length === 0, `Test 12: Zero corrupted/bad-input records exist in MongoDB (found ${badIssues.length})`);

    console.log('\n================================================================');
    console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED across 12 assertions`);
    console.log('================================================================\n');

    if (failed === 0) {
      console.log('\x1b[32m✔ ALL BAD-INPUT CASES VERIFIED WITH BACKEND AUTHORIZATION!\x1b[0m\n');
    }

  } catch (error) {
    console.error('[Bad Input Suite Fatal Error]:', error.message);
    failed++;
  } finally {
    await mongoose.disconnect();
  }

  process.exit(failed === 0 ? 0 : 1);
}

runBadInputVerificationSuite();
