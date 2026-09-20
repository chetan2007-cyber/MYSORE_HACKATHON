const http = require('http');
const https = require('https');
const { spawnSync } = require('child_process');
const path = require('path');

const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch (e) {
          parsed = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      if (typeof postData === 'object' && !(postData instanceof Buffer)) {
        req.write(JSON.stringify(postData));
      } else {
        req.write(postData);
      }
    }
    req.end();
  });
};

async function runProductionReadinessTests() {
  console.log('================================================================');
  console.log(' CIVICTRACK — COMPREHENSIVE PRODUCTION READINESS AUDIT & VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Health check endpoint
  console.log('TEST 1: Health Check Endpoint Verification (/api/health)');
  try {
    const health = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    assert(health.statusCode === 200, `Health check status is 200 (got ${health.statusCode})`);
    assert(health.data.status === 'ok', `Health status is 'ok' (got '${health.data.status}')`);
    assert(health.data.database === 'connected', `Database reports 'connected' (got '${health.data.database}')`);
    assert(!health.data.jwtSecret && !health.data.mongoUri, 'Health endpoint does NOT leak internal credentials');
  } catch (err) {
    assert(false, `Health check request failed: ${err.message}`);
  }

  // 2. 404 API JSON Error Handler
  console.log('\nTEST 2: Unknown API Endpoint 404 Handler');
  try {
    const notFound = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/unsupported-endpoint-xyz',
      method: 'GET'
    });
    assert(notFound.statusCode === 404, `Unknown API route returns 404 (got ${notFound.statusCode})`);
    assert(notFound.data && (notFound.data.error === 'Route not found' || notFound.data.message), 'Returns clean JSON error (not HTML)');
  } catch (err) {
    assert(false, `404 test failed: ${err.message}`);
  }

  // 3. Security Headers via Helmet
  console.log('\nTEST 3: Security Headers (Helmet, CSP, X-Content-Type-Options)');
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    assert(res.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options is nosniff');
    assert(res.headers['content-security-policy'] !== undefined, 'Content-Security-Policy header is present');
    assert(res.headers['referrer-policy'] !== undefined, 'Referrer-Policy header is present');
  } catch (err) {
    assert(false, `Security header check failed: ${err.message}`);
  }

  // 4. Input Validation & Mass Assignment Protection
  console.log('\nTEST 4: Registration Validation & Role Injection Prevention');
  try {
    // 4a: Short password rejected (< 8 chars)
    const shortPw = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        name: 'Short Password Tester',
        email: `shortpw_${Date.now()}@example.com`,
        password: '123'
      }
    );
    assert(shortPw.statusCode === 400, `Rejects password < 8 chars with 400 (got ${shortPw.statusCode})`);

    // 4b: Role injection attempt (requesting ADMIN role)
    const testEmail = `public_citizen_${Date.now()}@example.com`;
    const roleInject = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        name: 'Role Injection Attacker',
        email: testEmail,
        password: 'SecurePassword123!',
        role: 'ADMIN' // Malicious attempt to elevate privileges
      }
    );
    assert(roleInject.statusCode === 201, `Public registration succeeds (got ${roleInject.statusCode})`);
    assert(roleInject.data.requireVerification === true, 'Public registration mandates email verification');
    assert(!roleInject.data.token, 'No token granted upon registration before OTP verification');
    assert(!roleInject.data.otp, 'OTP code is NOT leaked in registration response');
  } catch (err) {
    assert(false, `Registration validation check failed: ${err.message}`);
  }

  // 5. HttpOnly Cookie & Session Authentication on Login
  console.log('\nTEST 5: HttpOnly Cookie & Authentication Storage');
  let officerToken = '';
  let officerCookies = [];
  try {
    const loginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        email: 'officer@civictrack.local',
        password: 'Officer@123'
      }
    );
    assert(loginRes.statusCode === 200, `Officer login succeeds (got ${loginRes.statusCode})`);
    assert(loginRes.data.token !== undefined, 'Dual-entry: Returns JWT token in body for mobile/Node clients');
    officerToken = loginRes.data.token;

    // Check Set-Cookie header
    const setCookie = loginRes.headers['set-cookie'];
    assert(setCookie && setCookie.some(c => c.includes('civictrack_token')), 'Backend sets civictrack_token cookie');
    assert(setCookie && setCookie.some(c => c.includes('HttpOnly')), 'civictrack_token cookie includes HttpOnly flag');
    officerCookies = setCookie;
  } catch (err) {
    assert(false, `Login & cookie check failed: ${err.message}`);
  }

  // 6. Role-Based Authorization Enforcement
  console.log('\nTEST 6: Role Security & Server-Side Authorization Guards');
  let citizenToken = '';
  try {
    // Login as citizen
    const citizenLogin = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        email: 'citizen@civictrack.local',
        password: 'Citizen@123'
      }
    );
    citizenToken = citizenLogin.data.token;

    // Citizen attempts to access Supervisor Overview (/api/supervisor/overview)
    const supRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/supervisor/overview',
      method: 'GET',
      headers: { Authorization: `Bearer ${citizenToken}` }
    });
    assert(supRes.statusCode === 403, `Citizen blocked from Supervisor Overview with 403 (got ${supRes.statusCode})`);

    // Citizen attempts to access Admin Staff Management (/api/admin/staff)
    const adminRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/staff',
      method: 'GET',
      headers: { Authorization: `Bearer ${citizenToken}` }
    });
    assert(adminRes.statusCode === 403, `Citizen blocked from Admin Staff API with 403 (got ${adminRes.statusCode})`);

    // Authorized supervisor accessing Supervisor Overview
    const supLogin = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        email: 'supervisor@civictrack.local',
        password: 'Supervisor@123'
      }
    );
    const supervisorToken = supLogin.data.token;

    const supOverviewRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/supervisor/overview',
      method: 'GET',
      headers: { Authorization: `Bearer ${supervisorToken}` }
    });
    assert(supOverviewRes.statusCode === 200, `Authorized SUPERVISOR can access Supervisor Overview (got ${supOverviewRes.statusCode})`);
  } catch (err) {
    assert(false, `Role security check failed: ${err.message}`);
  }

  // 7. Seed Script Safety Guard in Production
  console.log('\nTEST 7: Seed Script Production Execution Blocker');
  try {
    const seedProc = spawnSync('node', ['seed/seed.js'], {
      cwd: path.join(__dirname),
      env: { ...process.env, NODE_ENV: 'production' },
      encoding: 'utf-8'
    });
    assert(seedProc.status === 1, `Seed script exits with code 1 in production (got ${seedProc.status})`);
    assert(
      seedProc.stderr.includes('STRICTLY PROHIBITED in production mode') || seedProc.stdout.includes('STRICTLY PROHIBITED'),
      'Seed script outputs explicit security abort message'
    );
  } catch (err) {
    assert(false, `Seed safety check failed: ${err.message}`);
  }

  // 8. Production JWT_SECRET Validation Guard
  console.log('\nTEST 8: Startup Production Insecure JWT Guard');
  try {
    const insecureProc = spawnSync(
      'node',
      ['-e', 'process.env.NODE_ENV="production"; process.env.JWT_SECRET="short"; require("./config/env");'],
      {
        cwd: path.join(__dirname),
        encoding: 'utf-8'
      }
    );
    assert(insecureProc.status === 1, `Startup halts with code 1 if JWT_SECRET is weak in production (got ${insecureProc.status})`);
  } catch (err) {
    assert(false, `Insecure JWT check failed: ${err.message}`);
  }

  // 9. Logout & Session Clearing
  console.log('\nTEST 9: Logout & Session Invalidation');
  try {
    const logoutRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/logout',
      method: 'POST'
    });
    assert(logoutRes.statusCode === 200, `Logout returns 200 OK (got ${logoutRes.statusCode})`);
    const clearCookie = logoutRes.headers['set-cookie'];
    assert(
      clearCookie && clearCookie.some(c => c.includes('civictrack_token=;') || c.includes('Max-Age=0') || c.includes('Expires=')),
      'Logout clears civictrack_token cookie'
    );
  } catch (err) {
    assert(false, `Logout check failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(` AUDIT SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runProductionReadinessTests();
