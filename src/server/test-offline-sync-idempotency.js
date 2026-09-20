const axios = require('axios');
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const Issue = require('./models/Issue');

const BASE_URL = 'http://localhost:5000/api';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civictrack';

async function runIdempotencyTests() {
  console.log('\n=============================================================');
  console.log(' CIVICTRACK: OFFLINE SYNC IDEMPOTENCY & DUPLICATE PREVENTION ');
  console.log('=============================================================\n');

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
    await mongoose.connect(MONGO_URI);
    console.log('[Test Setup] Connected to MongoDB for direct verification.\n');

    // 1. Authenticate as Citizen
    console.log('--- Step 1: Citizen Session Acquisition ---');
    const loginRes = await axios.post(`${BASE_URL}/auth/demo-login`, { role: 'CITIZEN' });
    const token = loginRes.data.token;
    assert(token && loginRes.data.user.role === 'CITIZEN', 'Citizen authenticated successfully');

    const authHeaders = {
      Authorization: `Bearer ${token}`
    };

    // 2. Test Initial Offline-Synced Report Creation
    console.log('\n--- Step 2: Idempotent Report Registration ---');
    const runId = Date.now();
    const testKey1 = `offline_${runId}_${randomUUID().slice(0, 8)}`;
    const reportPayload = {
      title: `Offline Pothole on Saraswathipuram 5th Main ${runId}`,
      category: 'Roads & Infrastructure',
      description: 'Severe road surface depression recorded offline by citizen.',
      ward: 'Ward 12 - Saraswathipuram',
      address: 'Near Kukkarahalli Lake Road intersection',
      landmark: 'Opposite State Bank ATM',
      priority: 'P2',
      lat: 12.3025,
      lng: 76.6358
    };

    const firstRes = await axios.post(`${BASE_URL}/issues`, reportPayload, {
      headers: {
        ...authHeaders,
        'X-Idempotency-Key': testKey1
      }
    });

    assert(firstRes.status === 201, 'First submission created new issue (HTTP 201)');
    assert(firstRes.data.success === true, 'Response status is success');
    const createdCaseId = firstRes.data.data?.caseId;
    const createdIssueId = firstRes.data.data?._id;
    assert(createdCaseId && createdCaseId.startsWith('CT-2026-'), `Assigned official Case ID: ${createdCaseId}`);

    // 3. Test Retrying with Identical Idempotency Key (Simulated Reconnection Retry)
    console.log('\n--- Step 3: Duplicate Submission with Identical Key (Retry Protection) ---');
    const retryRes = await axios.post(`${BASE_URL}/issues`, reportPayload, {
      headers: {
        ...authHeaders,
        'X-Idempotency-Key': testKey1
      }
    });

    assert(retryRes.status === 200, 'Duplicate submission handled gracefully (HTTP 200)');
    assert(retryRes.data.isDuplicate === true, 'Server identified request as idempotent duplicate');
    assert(retryRes.data.data?.caseId === createdCaseId, `Returned identical Case ID: ${retryRes.data.data?.caseId}`);
    assert(retryRes.data.data?._id === createdIssueId, `Returned identical Mongo _id: ${retryRes.data.data?._id}`);

    // 4. Verify MongoDB Document Count in Database
    console.log('\n--- Step 4: Direct Database Document Count Verification ---');
    const dbCount = await Issue.countDocuments({ idempotencyKey: testKey1 });
    assert(dbCount === 1, `MongoDB contains EXACTLY 1 document for key '${testKey1}' (got ${dbCount})`);

    // 5. Test Concurrent Requests with Identical Key (Race Condition Guard)
    console.log('\n--- Step 5: Concurrent Requests Race Condition Protection ---');
    const raceKey = `race_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const racePayload = {
      title: `Simultaneous Concurrent Synced Streetlight Failure ${Date.now()}`,
      category: 'Streetlights & Electrical',
      description: 'Multiple network workers attempting simultaneous dispatch.',
      ward: 'Ward 08 - Jayalakshmipuram',
      address: 'Temple Road, 2nd Cross',
      priority: 'P3',
      lat: 12.3168,
      lng: 76.6315
    };

    const [raceRes1, raceRes2] = await Promise.all([
      axios.post(`${BASE_URL}/issues`, racePayload, {
        headers: { ...authHeaders, 'X-Idempotency-Key': raceKey }
      }),
      axios.post(`${BASE_URL}/issues`, racePayload, {
        headers: { ...authHeaders, 'X-Idempotency-Key': raceKey }
      })
    ]);

    assert(
      (raceRes1.status === 200 || raceRes1.status === 201) &&
      (raceRes2.status === 200 || raceRes2.status === 201),
      'Both concurrent submissions succeeded without unhandled server crash'
    );
    assert(
      raceRes1.data.data.caseId === raceRes2.data.data.caseId,
      `Both concurrent requests resolved to identical Case ID: ${raceRes1.data.data.caseId}`
    );

    const raceDbCount = await Issue.countDocuments({ idempotencyKey: raceKey });
    assert(raceDbCount === 1, `MongoDB stores EXACTLY 1 ticket despite concurrent race (count: ${raceDbCount})`);

    // 6. Test Separate Key Creates Distinct Issue
    console.log('\n--- Step 6: Distinct Key Ticket Separation ---');
    const testKey2 = `offline_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const separateRes = await axios.post(
      `${BASE_URL}/issues`,
      { ...reportPayload, title: `Separate Distinct Offline Ticket ${Date.now()}` },
      { headers: { ...authHeaders, 'X-Idempotency-Key': testKey2 } }
    );
    assert(separateRes.status === 201, 'Distinct key creates new ticket');
    assert(separateRes.data.data.caseId !== createdCaseId, 'Distinct ticket receives unique Case ID');

    // 7. Negative Test: Missing Mandatory Fields
    console.log('\n--- Step 7: Negative Validation Guard ---');
    try {
      await axios.post(
        `${BASE_URL}/issues`,
        { title: 'Incomplete Report' },
        { headers: authHeaders }
      );
      assert(false, 'Incomplete payload should be rejected with HTTP 400');
    } catch (err) {
      assert(err.response?.status === 400, 'Server rejected missing required fields with HTTP 400');
    }

  } catch (error) {
    console.error('Test execution error:', error.message);
    if (error.response?.data) {
      console.error('Server response data:', error.response.data);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n=============================================================');
    console.log(` RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('=============================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runIdempotencyTests();
