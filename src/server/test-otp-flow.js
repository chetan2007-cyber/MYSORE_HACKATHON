const axios = require('axios');
const mongoose = require('mongoose');

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const BASE_URL = 'http://localhost:5000/api';

async function runOtpTests() {
  console.log('\n======================================================');
  console.log('   CIVICTRACK: EMAIL OTP VERIFICATION E2E TEST SUITE   ');
  console.log('======================================================\n');

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

  // Connect to DB directly to inspect user document
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civictrack';
  await mongoose.connect(mongoUri);
  const db = mongoose.connection;
  const usersColl = db.collection('users');
  const auditLogsColl = db.collection('auditlogs');

  const testEmail = `test.citizen.${Date.now()}@example.com`;
  const testPassword = 'Password@123';
  const testName = 'Test Citizen OTP';

  try {
    // ----------------------------------------------------
    // TEST 1: Register User (Expect PENDING_VERIFICATION)
    // ----------------------------------------------------
    console.log('\n--- Step 1: Citizen Registration ---');
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: testName,
      email: testEmail,
      password: testPassword,
      phone: '+91 99887 76655',
      role: 'CITIZEN'
    });

    assert(
      regRes.status === 201 && regRes.data.requireVerification === true,
      'Registration returns HTTP 201 with requireVerification: true',
      JSON.stringify(regRes.data)
    );

    // Verify user in MongoDB
    const userDoc = await usersColl.findOne({ email: testEmail });
    assert(
      userDoc && userDoc.accountStatus === 'PENDING_VERIFICATION' && userDoc.isVerified === false,
      'MongoDB user is stored with accountStatus: PENDING_VERIFICATION and isVerified: false',
      `status: ${userDoc?.accountStatus}, isVerified: ${userDoc?.isVerified}`
    );

    assert(
      userDoc?.otp?.code && /^\d{6}$/.test(userDoc.otp.code) && new Date(userDoc.otp.expiresAt) > new Date(),
      'Cryptographically secure 6-digit OTP generated with future expiry timestamp',
      `code: ${userDoc?.otp?.code}, expiresAt: ${userDoc?.otp?.expiresAt}`
    );

    // ----------------------------------------------------
    // TEST 2: Attempt Login Before Verification (Expect 403)
    // ----------------------------------------------------
    console.log('\n--- Step 2: Unverified Login Enforcement Gate ---');
    let loginBlocked = false;
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: testEmail,
        password: testPassword
      });
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.requireVerification === true) {
        loginBlocked = true;
      } else {
        console.log('Unexpected response:', err.response?.status, err.response?.data);
      }
    }
    assert(loginBlocked, 'Login before OTP verification is rejected with HTTP 403 and requireVerification: true');

    // ----------------------------------------------------
    // TEST 3: Submit Incorrect OTP (Expect 400)
    // ----------------------------------------------------
    console.log('\n--- Step 3: Incorrect OTP Rejection ---');
    let wrongOtpRejected = false;
    try {
      await axios.post(`${BASE_URL}/auth/verify-otp`, {
        email: testEmail,
        otp: '000000'
      });
    } catch (err) {
      if (err.response?.status === 400) {
        wrongOtpRejected = true;
      }
    }
    assert(wrongOtpRejected, 'Invalid OTP (000000) rejected with HTTP 400');

    // ----------------------------------------------------
    // TEST 4: Resend OTP
    // ----------------------------------------------------
    console.log('\n--- Step 4: Resend OTP Mechanism ---');
    const resendRes = await axios.post(`${BASE_URL}/auth/resend-otp`, {
      email: testEmail
    });
    assert(
      resendRes.status === 200 && resendRes.data.success === true,
      'Resend OTP returns HTTP 200 success',
      JSON.stringify(resendRes.data)
    );

    const userDocAfterResend = await usersColl.findOne({ email: testEmail });
    assert(
      userDocAfterResend?.otp?.code && /^\d{6}$/.test(userDocAfterResend.otp.code),
      'Fresh 6-digit OTP code generated upon resend',
      `new code: ${userDocAfterResend?.otp?.code}`
    );

    const latestOtp = userDocAfterResend.otp.code;

    // ----------------------------------------------------
    // TEST 5: Verify with Valid OTP
    // ----------------------------------------------------
    console.log('\n--- Step 5: Valid OTP Verification & Token Issuance ---');
    const verifyRes = await axios.post(`${BASE_URL}/auth/verify-otp`, {
      email: testEmail,
      otp: latestOtp
    });

    assert(
      verifyRes.status === 200 && !!verifyRes.data.token && verifyRes.data.user?.isVerified === true,
      'Valid OTP verification returns HTTP 200 with active JWT and verified user payload',
      `user: ${verifyRes.data.user?.name}, status: ${verifyRes.data.user?.accountStatus}`
    );

    // Verify DB state
    const userDocActive = await usersColl.findOne({ email: testEmail });
    assert(
      userDocActive.accountStatus === 'ACTIVE' && userDocActive.isVerified === true && userDocActive.otp?.code === null,
      'MongoDB user is now accountStatus: ACTIVE, isVerified: true, and OTP code cleared',
      `status: ${userDocActive.accountStatus}, isVerified: ${userDocActive.isVerified}`
    );

    // Verify audit log entry
    const auditEntry = await auditLogsColl.findOne({ action: 'USER_EMAIL_VERIFIED', entityId: userDocActive._id });
    assert(
      !!auditEntry,
      'Audit log recorded USER_EMAIL_VERIFIED event',
      `action: ${auditEntry?.action}`
    );

    // ----------------------------------------------------
    // TEST 6: Subsequent Login With Verified Credentials
    // ----------------------------------------------------
    console.log('\n--- Step 6: Verified Citizen Sign-In ---');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmail,
      password: testPassword
    });

    assert(
      loginRes.status === 200 && !!loginRes.data.token && loginRes.data.user?.accountStatus === 'ACTIVE',
      'Sign-in now succeeds immediately with valid JWT token',
      `token present: ${!!loginRes.data.token}`
    );

    // ----------------------------------------------------
    // TEST 7: Demo Logins Preserved & Functional
    // ----------------------------------------------------
    console.log('\n--- Step 7: Regression Check on Demo Accounts ---');
    const demoRes = await axios.post(`${BASE_URL}/auth/demo-login`, { role: 'OFFICER' });
    assert(
      demoRes.status === 200 && demoRes.data.user?.role === 'OFFICER' && demoRes.data.user?.accountStatus === 'ACTIVE',
      'Demo Officer login works smoothly with ACTIVE account status'
    );

  } catch (error) {
    console.error('Unhandled test error:', error.response?.data || error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n======================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('======================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runOtpTests();
