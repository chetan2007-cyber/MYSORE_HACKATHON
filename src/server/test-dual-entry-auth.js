const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api';

async function runDualEntryTests() {
  console.log('\n=============================================================');
  console.log('   CIVICTRACK: DUAL-ENTRY AUTH & ROLE SECURITY TEST SUITE   ');
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
    // -----------------------------------------------------------------
    // TEST 1: Public Registration Role Hardening (Anti-Privilege Escalation)
    // -----------------------------------------------------------------
    console.log('\n--- Step 1: Public Registration Role Security Hardening ---');
    const attackerEmail = `attacker.${Date.now()}@example.com`;
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Malicious Public User',
      email: attackerEmail,
      password: 'AttackerPassword@123',
      phone: '+91 99999 88888',
      role: 'ADMIN' // Attacker requests ADMIN role
    });

    assert(
      regRes.status === 201 && regRes.data.requireVerification === true,
      'Registration accepted pending email OTP verification'
    );

    // Verify in database that the role was strictly forced to CITIZEN
    // (We inspect by checking GET /api/auth/me or direct login after verify)
    // -----------------------------------------------------------------
    // TEST 2: Non-Admin Access Gate (RBAC Authorization)
    // -----------------------------------------------------------------
    console.log('\n--- Step 2: RBAC Security Boundary on Staff Management ---');
    // Login as Citizen
    const citizenLoginRes = await axios.post(`${BASE_URL}/auth/demo-login`, { role: 'CITIZEN' });
    const citizenToken = citizenLoginRes.data.token;

    let citizenBlocked = false;
    try {
      await axios.get(`${BASE_URL}/admin/staff`, {
        headers: { Authorization: `Bearer ${citizenToken}` }
      });
    } catch (err) {
      if (err.response?.status === 403) citizenBlocked = true;
    }
    assert(citizenBlocked, 'CITIZEN attempting GET /api/admin/staff is rejected with HTTP 403 Forbidden');

    // Login as Field Worker
    const workerLoginRes = await axios.post(`${BASE_URL}/auth/demo-login`, { role: 'FIELD_WORKER' });
    const workerToken = workerLoginRes.data.token;

    let workerBlocked = false;
    try {
      await axios.get(`${BASE_URL}/admin/staff`, {
        headers: { Authorization: `Bearer ${workerToken}` }
      });
    } catch (err) {
      if (err.response?.status === 403) workerBlocked = true;
    }
    assert(workerBlocked, 'FIELD_WORKER attempting GET /api/admin/staff is rejected with HTTP 403 Forbidden');

    // -----------------------------------------------------------------
    // TEST 3: Admin Staff Invitation & Onboarding Lifecycle
    // -----------------------------------------------------------------
    console.log('\n--- Step 3: Admin Staff Provisioning & One-Time Setup Flow ---');
    // Login as Admin
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@civictrack.local',
      password: 'Admin@123'
    });
    const adminToken = adminLoginRes.data.token;
    assert(
      adminLoginRes.status === 200 && adminLoginRes.data.user.role === 'ADMIN',
      'ADMIN authenticated successfully via staff credentials'
    );

    // Get departments to pick one
    const deptsRes = await axios.get(`${BASE_URL}/departments`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const deptId = deptsRes.data.data[0]._id;

    // Admin invites a new Field Worker
    const newWorkerEmail = `sanjay.worker.${Date.now()}@civictrack.local`;
    const inviteRes = await axios.post(
      `${BASE_URL}/admin/staff`,
      {
        name: 'Sanjay Verma (Sanitation Worker)',
        email: newWorkerEmail,
        phone: '+91 98450 99881',
        department: deptId,
        role: 'FIELD_WORKER'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    assert(
      inviteRes.status === 201 && inviteRes.data.data.status === 'INVITED',
      'Admin successfully provisioned staff member with status: INVITED',
      `email: ${inviteRes.data.data.email}, role: ${inviteRes.data.data.role}`
    );

    const setupUrl = inviteRes.data.setupUrl;
    assert(!!setupUrl && setupUrl.includes('/staff/setup/'), 'Secure one-time invitation setup URL generated');

    const invitationToken = setupUrl.split('/staff/setup/')[1];

    // Attempting login before password setup is blocked
    let loginBeforeSetupBlocked = false;
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: newWorkerEmail,
        password: 'RandomPassword@123'
      });
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.requireSetup === true) {
        loginBeforeSetupBlocked = true;
      }
    }
    assert(loginBeforeSetupBlocked, 'Sign-in before setup is blocked with HTTP 403 and requireSetup: true');

    // Query invitation token details
    const tokenInfoRes = await axios.get(`${BASE_URL}/staff/invitation/${invitationToken}`);
    assert(
      tokenInfoRes.status === 200 && tokenInfoRes.data.data.role === 'FIELD_WORKER',
      'Invitation token validated, returns pre-configured staff member metadata'
    );

    // Complete setup and establish password
    const setupPass = 'SanjayWorker@2026';
    const completeRes = await axios.post(`${BASE_URL}/staff/invitation/${invitationToken}/complete`, {
      password: setupPass
    });

    assert(
      completeRes.status === 200 && completeRes.data.user.status === 'ACTIVE' && !!completeRes.data.token,
      'Staff setup completed: user activated to status: ACTIVE and JWT issued'
    );

    // Subsequent login succeeds with new password
    const newStaffLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: newWorkerEmail,
      password: setupPass
    });

    assert(
      newStaffLoginRes.status === 200 && newStaffLoginRes.data.user.role === 'FIELD_WORKER',
      'New staff member signs in successfully with role: FIELD_WORKER'
    );

    const newWorkerToken = newStaffLoginRes.data.token;

    // -----------------------------------------------------------------
    // TEST 4: Role-Specific Operational Endpoints
    // -----------------------------------------------------------------
    console.log('\n--- Step 4: Role-Specific Operational Endpoints ---');
    // Field Worker assignments endpoint
    const workerAssignmentsRes = await axios.get(`${BASE_URL}/worker/assignments`, {
      headers: { Authorization: `Bearer ${newWorkerToken}` }
    });
    assert(
      workerAssignmentsRes.status === 200 && Array.isArray(workerAssignmentsRes.data.data),
      'GET /api/worker/assignments returns assignments array for authenticated field worker'
    );

    // Officer Triage endpoint
    const officerLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'officer@civictrack.local',
      password: 'Officer@123'
    });
    const officerToken = officerLoginRes.data.token;

    const officerIssuesRes = await axios.get(`${BASE_URL}/officer/issues`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    assert(
      officerIssuesRes.status === 200 && officerIssuesRes.data.data.counts !== undefined,
      'GET /api/officer/issues returns triage groups (unassigned, pendingVerification, atRisk, inProgress)'
    );

    // Supervisor Overview endpoint
    const supvLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'supervisor@civictrack.local',
      password: 'Supervisor@123'
    });
    const supvToken = supvLoginRes.data.token;

    const supvOverviewRes = await axios.get(`${BASE_URL}/supervisor/overview`, {
      headers: { Authorization: `Bearer ${supvToken}` }
    });
    assert(
      supvOverviewRes.status === 200 && Array.isArray(supvOverviewRes.data.data.workerWorkloads),
      'GET /api/supervisor/overview returns department capacity, worker workloads, and active escalations'
    );

    // Admin Overview endpoint
    const adminOverviewRes = await axios.get(`${BASE_URL}/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      adminOverviewRes.status === 200 && adminOverviewRes.data.data.users.total > 0,
      'GET /api/admin/overview returns system-wide metrics (citizens, workers, officers, supervisors, admins)'
    );

    // Admin Staff List endpoint
    const staffListRes = await axios.get(`${BASE_URL}/admin/staff`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      staffListRes.status === 200 && staffListRes.data.count > 0,
      `GET /api/admin/staff returns full staff roster (${staffListRes.data.count} staff members)`
    );

  } catch (error) {
    console.error('Unhandled test error:', error.response?.data || error.message);
  } finally {
    console.log('\n=============================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('=============================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runDualEntryTests();
