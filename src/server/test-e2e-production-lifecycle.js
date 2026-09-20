const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000/api';

async function runE2EProductionLifecycle() {
  console.log('================================================================');
  console.log(' CIVICTRACK — 16-STEP END-TO-END PRODUCTION SIMULATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`  [PASS] Step: ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] Step: ${message} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    // Connect to DB directly only to fetch the OTP for test user verification
    const connectDB = require('./config/db');
    await connectDB();
    const User = require('./models/User');
    const Department = require('./models/Department');

    // 1. Citizen registration
    console.log('Step 1: Citizen Registration');
    const citizenEmail = `prod_sim_${Date.now()}@civictrack.local`;
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Production Test Citizen',
      email: citizenEmail,
      password: 'StrongProdPassword123!',
      phone: '+91 98765 43210'
    });
    assert(
      regRes.status === 201 && regRes.data.requireVerification === true,
      '1. Citizen registration initiated with email OTP prompt'
    );

    // 2. OTP verification
    console.log('\nStep 2: OTP Verification');
    const userInDb = await User.findOne({ email: citizenEmail });
    const otpCode = userInDb.otp.code;
    const verifyRes = await axios.post(`${BASE_URL}/auth/verify-otp`, {
      email: citizenEmail,
      otp: otpCode
    });
    assert(
      verifyRes.status === 200 && verifyRes.data.token && verifyRes.data.user.isVerified === true,
      '2. Account verified via OTP, active token granted'
    );

    // 3. Citizen login
    console.log('\nStep 3: Citizen Login');
    const citizenLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: citizenEmail,
      password: 'StrongProdPassword123!'
    });
    const citizenToken = citizenLogin.data.token;
    assert(
      citizenLogin.status === 200 && citizenToken && citizenLogin.data.user.role === 'CITIZEN',
      '3. Citizen authenticated successfully'
    );

    // Fetch department for issue creation
    const deptsRes = await axios.get(`${BASE_URL}/departments`, {
      headers: { Authorization: `Bearer ${citizenToken}` }
    });
    const sanitationDept = deptsRes.data.data[0];

    // 4. Create issue
    console.log('\nStep 4: Create Issue (Citizen Report)');
    const issueRes = await axios.post(
      `${BASE_URL}/issues`,
      {
        title: 'Overflowing Waste Container on Main Boulevard',
        description: 'Commercial waste container has overflowed onto pedestrian walkway near bus terminus.',
        category: 'Sanitation & Waste',
        departmentId: sanitationDept._id,
        priority: 'P2',
        address: 'Main Boulevard, Sector 4, Bus Terminus',
        ward: 'Ward 12 - Kuvempunagar',
        landmark: 'City Bus Stop',
        lat: 12.2958,
        lng: 76.6394
      },
      { headers: { Authorization: `Bearer ${citizenToken}` } }
    );
    const createdIssue = issueRes.data.data;
    assert(
      issueRes.status === 201 && createdIssue.status === 'REPORTED',
      '4. Civic issue created in REPORTED state'
    );

    // 5. Officer login
    console.log('\nStep 5: Officer Login');
    const officerLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'officer@civictrack.local',
      password: 'Officer@123'
    });
    const officerToken = officerLogin.data.token;
    assert(
      officerLogin.status === 200 && officerLogin.data.user.role === 'OFFICER',
      '5. Operations Officer authenticated'
    );

    // Fetch field worker
    const workersRes = await axios.get(`${BASE_URL}/auth/workers`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    const assignedWorker = workersRes.data.data[0];

    // 6. Assign issue
    console.log('\nStep 6: Assign Issue');
    const assignRes = await axios.post(
      `${BASE_URL}/issues/${createdIssue._id}/assign`,
      {
        workerId: assignedWorker._id,
        instructions: 'Dispatch crew immediately for clearance and sanitization.'
      },
      { headers: { Authorization: `Bearer ${officerToken}` } }
    );
    assert(
      assignRes.status === 200 && assignRes.data.data.status === 'ASSIGNED',
      '6. Issue assigned to field worker, transition to ASSIGNED'
    );

    // 7. Worker login
    console.log('\nStep 7: Worker Login');
    const workerLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'worker@civictrack.local',
      password: 'Worker@123'
    });
    const workerToken = workerLogin.data.token;
    assert(
      workerLogin.status === 200 && workerLogin.data.user.role === 'FIELD_WORKER',
      '7. Field Worker authenticated'
    );

    // 8. Worker update (acknowledge + start work)
    console.log('\nStep 8: Worker Update (Acknowledge & Start Work)');
    const ackRes = await axios.post(
      `${BASE_URL}/issues/${createdIssue._id}/acknowledge`,
      { notes: 'Assignment received. Truck en route.' },
      { headers: { Authorization: `Bearer ${workerToken}` } }
    );
    assert(
      ackRes.status === 200 && ackRes.data.data.status === 'ACKNOWLEDGED',
      '8a. Worker acknowledged assignment'
    );

    const startRes = await axios.post(
      `${BASE_URL}/issues/${createdIssue._id}/start`,
      {},
      { headers: { Authorization: `Bearer ${workerToken}` } }
    );
    assert(
      startRes.status === 200 && startRes.data.data.status === 'IN_PROGRESS',
      '8b. Work started on site, status IN_PROGRESS'
    );

    // 9. Resolution submission
    console.log('\nStep 9: Resolution Submission');
    const resolveRes = await axios.post(
      `${BASE_URL}/issues/${createdIssue._id}/resolution`,
      {
        notes: 'Container emptied, area disinfected and sprayed with lime powder.',
        completionRemarks: 'Completed within SLA standards.'
      },
      { headers: { Authorization: `Bearer ${workerToken}` } }
    );
    assert(
      resolveRes.status === 200 && resolveRes.data.data.status === 'VERIFICATION_REQUIRED',
      '9. Resolution evidence submitted, status VERIFICATION_REQUIRED'
    );

    // 10. Supervisor login
    console.log('\nStep 10: Supervisor Login');
    const supLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'supervisor@civictrack.local',
      password: 'Supervisor@123'
    });
    const supervisorToken = supLogin.data.token;
    assert(
      supLogin.status === 200 && supLogin.data.user.role === 'SUPERVISOR',
      '10. Municipal Supervisor authenticated'
    );

    // 11. Supervisor dashboard
    console.log('\nStep 11: Supervisor Dashboard');
    const supOverview = await axios.get(`${BASE_URL}/supervisor/overview`, {
      headers: { Authorization: `Bearer ${supervisorToken}` }
    });
    assert(
      supOverview.status === 200 && (supOverview.data.metrics !== undefined || supOverview.data.data?.metrics !== undefined),
      '11. Supervisor Overview loaded with operational metrics'
    );

    // 12. Admin login
    console.log('\nStep 12: Admin Login');
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@civictrack.local',
      password: 'Admin@123'
    });
    const adminToken = adminLogin.data.token;
    assert(
      adminLogin.status === 200 && adminLogin.data.user.role === 'ADMIN',
      '12. System Administrator authenticated'
    );

    // 13. Admin staff management
    console.log('\nStep 13: Admin Staff Management');
    const staffRes = await axios.get(`${BASE_URL}/admin/staff`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      staffRes.status === 200 && Array.isArray(staffRes.data.data),
      '13. Admin staff roster retrieved successfully'
    );

    // 14. Logout
    console.log('\nStep 14: Logout');
    const logoutRes = await axios.post(`${BASE_URL}/auth/logout`);
    assert(
      logoutRes.status === 200 && logoutRes.data.success === true,
      '14. Session logged out and cookie cleared'
    );

    // 15. Expired session handling
    console.log('\nStep 15: Expired / Invalid Session Handling');
    let expiredCaught = false;
    try {
      await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: 'Bearer expired.tampered.token' }
      });
    } catch (err) {
      if (err.response?.status === 401) {
        expiredCaught = true;
      }
    }
    assert(expiredCaught, '15. Invalid / expired session returns HTTP 401');

    // 16. Unauthorized role access
    console.log('\nStep 16: Unauthorized Role Access Gate');
    let unauthCaught = false;
    try {
      await axios.get(`${BASE_URL}/admin/staff`, {
        headers: { Authorization: `Bearer ${citizenToken}` }
      });
    } catch (err) {
      if (err.response?.status === 403) {
        unauthCaught = true;
      }
    }
    assert(unauthCaught, '16. Citizen attempting Admin API returns HTTP 403 Forbidden');

  } catch (error) {
    console.error('Lifecycle test execution error:', error.response?.data || error.message);
    failed++;
  } finally {
    try {
      await mongoose.connection.close();
    } catch (e) {}
  }

  console.log('\n================================================================');
  console.log(` LIFECYCLE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2EProductionLifecycle();
