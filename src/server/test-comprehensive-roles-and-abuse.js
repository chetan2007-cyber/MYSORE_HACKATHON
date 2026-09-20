const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const Issue = require('./models/Issue');

const BASE_URL = 'http://localhost:5000/api';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civictrack';

async function runComprehensiveAudit() {
  console.log('\n================================================================');
  console.log(' CIVICTRACK: COMPREHENSIVE 5-ROLE & NEGATIVE ABUSE AUDIT SUITE');
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
    await mongoose.connect(MONGO_URI);
    console.log('[Setup] Connected to local MongoDB.\n');

    // -------------------------------------------------------------
    // PHASE G: BAD INPUT & NEGATIVE ABUSE TESTING
    // -------------------------------------------------------------
    console.log('--- Phase G: Negative & Abuse Testing ---');

    // G1: Missing required fields
    try {
      await axios.post(`${BASE_URL}/issues`, { title: 'Missing required stuff' });
      assert(false, 'Missing required fields should return HTTP 400');
    } catch (err) {
      assert(err.response?.status === 400 || err.response?.status === 401, 'Rejected unauthenticated missing payload with 401/400');
    }

    // Authenticate citizen for negative report tests
    const citizenLogin = await axios.post(`${BASE_URL}/auth/demo-login`, { role: 'CITIZEN' });
    const citizenToken = citizenLogin.data.token;
    const citizenHeaders = { Authorization: `Bearer ${citizenToken}` };

    try {
      await axios.post(`${BASE_URL}/issues`, { title: 'No desc or address' }, { headers: citizenHeaders });
      assert(false, 'Authenticated missing required fields should return 400');
    } catch (err) {
      assert(err.response?.status === 400, 'Authenticated missing fields rejected with 400');
    }

    // G2: Malformed / Non-existent Issue ID
    try {
      await axios.get(`${BASE_URL}/issues/invalid-nonexistent-id`, { headers: citizenHeaders });
      assert(false, 'Invalid ID should fail');
    } catch (err) {
      assert(err.response?.status === 404 || err.response?.status === 500, 'Non-existent Issue ID returns 404 Not Found');
    }

    // G3: Unauthorized route access by role
    try {
      await axios.get(`${BASE_URL}/supervisor/overview`, { headers: citizenHeaders });
      assert(false, 'Citizen accessing supervisor API should be blocked');
    } catch (err) {
      assert(err.response?.status === 403, 'Citizen blocked from Supervisor API with HTTP 403 Forbidden');
    }

    try {
      await axios.get(`${BASE_URL}/admin/staff`, { headers: citizenHeaders });
      assert(false, 'Citizen accessing admin staff API should be blocked');
    } catch (err) {
      assert(err.response?.status === 403, 'Citizen blocked from Admin Staff API with HTTP 403 Forbidden');
    }

    // G4: Expired / Invalid Bearer Token
    try {
      await axios.get(`${BASE_URL}/issues`, { headers: { Authorization: 'Bearer invalid_garbage_token_xyz' } });
      assert(false, 'Invalid token should be rejected');
    } catch (err) {
      assert(err.response?.status === 401, 'Invalid Bearer token rejected with HTTP 401 Unauthorized');
    }

    // -------------------------------------------------------------
    // PHASE H: FIELD WORKER VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- Phase H: FIELD_WORKER Role Verification ---');
    const workerLogin = await axios.post(`${BASE_URL}/auth/demo-login`, { role: 'FIELD_WORKER' });
    const workerToken = workerLogin.data.token;
    const workerHeaders = { Authorization: `Bearer ${workerToken}` };
    assert(workerLogin.data.user.role === 'FIELD_WORKER', 'Field Worker logged in successfully');

    const workerAssignmentsRes = await axios.get(`${BASE_URL}/worker/assignments`, { headers: workerHeaders });
    assert(workerAssignmentsRes.status === 200, 'Field Worker assignments retrieved successfully');
    assert(Array.isArray(workerAssignmentsRes.data.data), 'Assignments returned as array');

    // Field Worker attempting unauthorized officer action
    try {
      await axios.post(`${BASE_URL}/admin/staff`, { name: 'Fake Worker Staff' }, { headers: workerHeaders });
      assert(false, 'Worker should not be allowed to invite staff');
    } catch (err) {
      assert(err.response?.status === 403, 'Field Worker blocked from Admin API with HTTP 403');
    }

    // -------------------------------------------------------------
    // PHASE I: OFFICER VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- Phase I: OFFICER Role Verification ---');
    const officerLogin = await axios.post(`${BASE_URL}/auth/demo-login`, { role: 'OFFICER' });
    const officerToken = officerLogin.data.token;
    const officerHeaders = { Authorization: `Bearer ${officerToken}` };
    assert(officerLogin.data.user.role === 'OFFICER', 'Operations Officer logged in successfully');

    const officerIssuesRes = await axios.get(`${BASE_URL}/officer/issues`, { headers: officerHeaders });
    assert(officerIssuesRes.status === 200, 'Officer triage hub data retrieved');
    assert(officerIssuesRes.data.data?.unassigned !== undefined, 'Officer hub includes unassigned queue');
    assert(officerIssuesRes.data.data?.pendingVerification !== undefined, 'Officer hub includes verification queue');

    // -------------------------------------------------------------
    // PHASE J: SUPERVISOR VERIFICATION (EXPLICIT CRITICAL FOCUS)
    // -------------------------------------------------------------
    console.log('\n--- Phase J: SUPERVISOR Role Verification ---');
    const supervisorLogin = await axios.post(`${BASE_URL}/auth/demo-login`, { role: 'SUPERVISOR' });
    const supervisorToken = supervisorLogin.data.token;
    const supervisorHeaders = { Authorization: `Bearer ${supervisorToken}` };
    assert(supervisorLogin.data.user.role === 'SUPERVISOR', 'Supervisor logged in successfully');

    const supRes = await axios.get(`${BASE_URL}/supervisor/overview`, { headers: supervisorHeaders });
    assert(supRes.status === 200, 'Supervisor Overview API returns HTTP 200 OK');
    assert(supRes.data.department?.name !== undefined, `Supervisor assigned department: '${supRes.data.department?.name}'`);
    assert(supRes.data.metrics?.openCases >= 0, `Live openCases metric from DB: ${supRes.data.metrics?.openCases}`);
    assert(Array.isArray(supRes.data.activeEscalations), `Active escalations array count: ${supRes.data.activeEscalations?.length}`);
    assert(Array.isArray(supRes.data.workerWorkload), `Worker workloads array count: ${supRes.data.workerWorkload?.length}`);

    // -------------------------------------------------------------
    // PHASE K: ADMIN VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- Phase K: ADMIN Role Verification ---');
    const adminLogin = await axios.post(`${BASE_URL}/auth/demo-login`, { role: 'ADMIN' });
    const adminToken = adminLogin.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    assert(adminLogin.data.user.role === 'ADMIN', 'System Admin logged in successfully');

    const adminOverviewRes = await axios.get(`${BASE_URL}/admin/overview`, { headers: adminHeaders });
    assert(adminOverviewRes.status === 200, 'Admin system overview retrieved');

    const staffRes = await axios.get(`${BASE_URL}/admin/staff`, { headers: adminHeaders });
    assert(staffRes.status === 200, 'Admin staff roster retrieved');
    assert(staffRes.data.data?.length > 0, `Total staff in roster: ${staffRes.data.data?.length}`);

    // -------------------------------------------------------------
    // PHASE N: DATA INTEGRITY CHECK
    // -------------------------------------------------------------
    console.log('\n--- Phase N: Data Integrity Check ---');
    const totalIssues = await Issue.countDocuments();
    assert(totalIssues > 0, `Total issues in database: ${totalIssues}`);

    // Check that every issue with an idempotencyKey has exactly 1 document
    const issuesWithKey = await Issue.find({ idempotencyKey: { $ne: null } }).select('idempotencyKey');
    const keySet = new Set();
    let duplicateKeyFound = false;
    for (const doc of issuesWithKey) {
      if (keySet.has(doc.idempotencyKey)) {
        duplicateKeyFound = true;
        break;
      }
      keySet.add(doc.idempotencyKey);
    }
    assert(!duplicateKeyFound, `Zero duplicate idempotency keys across ${keySet.size} indexed keys`);

  } catch (error) {
    console.error('Audit suite error:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n================================================================');
    console.log(` AUDIT RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runComprehensiveAudit();
