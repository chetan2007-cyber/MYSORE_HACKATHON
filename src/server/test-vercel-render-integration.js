/**
 * CIVICTRACK: VERCEL FRONTEND & RENDER BACKEND INTEGRATION AUDIT
 *
 * Verifies route mounting (/api/* and root aliases), CORS configuration for
 * https://mysore-hackathon.vercel.app, error response CORS preservation,
 * auth flows (login, demo-login, registration, OTP), and role endpoints.
 */

const http = require('http');
const https = require('https');
const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');

const VERCEL_ORIGIN = 'https://mysore-hackathon.vercel.app';
const RENDER_HOST = 'civictrack-backend-rsy2.onrender.com';

let server;
let baseUrl;

function logPass(msg) {
  console.log(`✔ PASS: ${msg}`);
}

function logFail(msg, detail) {
  console.error(`✖ FAIL: ${msg}`);
  if (detail) console.error(`  Detail: ${detail}`);
}

function request(options, bodyData = null) {
  return new Promise((resolve, reject) => {
    const isHttps = options.protocol === 'https:' || options.port === 443;
    const client = isHttps ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          data: json
        });
      });
    });
    req.on('error', reject);
    if (bodyData) {
      if (typeof bodyData === 'object' && !(bodyData instanceof Buffer)) {
        req.write(JSON.stringify(bodyData));
      } else {
        req.write(bodyData);
      }
    }
    req.end();
  });
}

async function runAudit() {
  console.log('================================================================');
  console.log(' CIVICTRACK: VERCEL + RENDER INTEGRATION AUDIT SUITE');
  console.log(` Target Origin: ${VERCEL_ORIGIN}`);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, passMsg, failMsg, detail) => {
    if (condition) {
      logPass(passMsg);
      passed++;
    } else {
      logFail(failMsg, detail);
      failed++;
    }
  };

  try {
    // 1. Connect DB and start local test server
    console.log('[Setup] Connecting to MongoDB...');
    await connectDB();
    assert(mongoose.connection.readyState === 1, 'MongoDB connection established and readyState === 1', 'MongoDB connection failed');

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        console.log(`[Setup] Local test server listening on ${baseUrl}\n`);
        resolve();
      });
    });

    const parsedBase = new URL(baseUrl);
    const localReq = (path, method = 'GET', headers = {}, body = null) => {
      return request({
        hostname: parsedBase.hostname,
        port: parsedBase.port,
        path,
        method,
        headers: {
          ...headers,
          ...(body && typeof body === 'object' ? { 'Content-Type': 'application/json' } : {})
        }
      }, body);
    };

    // --- STEP 1 & 2: Health Endpoints & Route Mounting ---
    console.log('--- Step 1 & 2: Health Endpoints & Route Mounting ---');

    const h1 = await localReq('/health', 'GET', { Origin: VERCEL_ORIGIN });
    assert(h1.status === 200, 'GET /health returns HTTP 200', `GET /health returned ${h1.status}`);
    assert(h1.data?.status === 'ok', 'GET /health status is "ok"', `GET /health status: ${h1.data?.status}`);
    assert(h1.data?.database === 'connected', 'GET /health reports database: "connected"', `DB state: ${h1.data?.database}`);
    assert(h1.headers['access-control-allow-origin'] === VERCEL_ORIGIN, 'GET /health includes Access-Control-Allow-Origin matching Vercel origin', `Header was: ${h1.headers['access-control-allow-origin']}`);

    const h2 = await localReq('/api/health', 'GET', { Origin: VERCEL_ORIGIN });
    assert(h2.status === 200, 'GET /api/health returns HTTP 200', `GET /api/health returned ${h2.status}`);
    assert(h2.data?.status === 'ok', 'GET /api/health status is "ok"', `GET /api/health status: ${h2.data?.status}`);

    // --- STEP 4: CORS Preflight & Credentials ---
    console.log('\n--- Step 4: CORS Preflight & Headers Verification ---');

    const optAuth = await localReq('/auth/login', 'OPTIONS', {
      Origin: VERCEL_ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,authorization'
    });
    assert(optAuth.status === 204 || optAuth.status === 200, `OPTIONS /auth/login returns HTTP 204/200 (${optAuth.status})`, `Preflight failed with ${optAuth.status}`);
    assert(optAuth.headers['access-control-allow-origin'] === VERCEL_ORIGIN, 'Preflight returns Access-Control-Allow-Origin matching Vercel origin', `Origin: ${optAuth.headers['access-control-allow-origin']}`);
    assert(optAuth.headers['access-control-allow-credentials'] === 'true', 'Preflight returns Access-Control-Allow-Credentials: true', `Credentials: ${optAuth.headers['access-control-allow-credentials']}`);

    const optApiAuth = await localReq('/api/auth/login', 'OPTIONS', {
      Origin: VERCEL_ORIGIN,
      'Access-Control-Request-Method': 'POST'
    });
    assert(optApiAuth.headers['access-control-allow-origin'] === VERCEL_ORIGIN, 'OPTIONS /api/auth/login allows Vercel origin', `Origin: ${optApiAuth.headers['access-control-allow-origin']}`);

    // Test error response CORS preservation
    const errRes = await localReq('/auth/login', 'POST', { Origin: VERCEL_ORIGIN }, { email: 'nonexistent@test.com', password: 'wrong' });
    assert(errRes.status === 401, 'Invalid login returns HTTP 401 Unauthorized', `Status was ${errRes.status}`);
    assert(errRes.headers['access-control-allow-origin'] === VERCEL_ORIGIN, 'Error response PRESERVES Access-Control-Allow-Origin header (not swallowed by browser)', `Origin header: ${errRes.headers['access-control-allow-origin']}`);

    // --- STEP 5: Auth API (POST /auth/login and /api/auth/login) ---
    console.log('\n--- Step 5: Auth API Execution ---');

    // Test demo-login on root alias
    const demoRoot = await localReq('/auth/demo-login', 'POST', { Origin: VERCEL_ORIGIN }, { role: 'CITIZEN' });
    assert(demoRoot.status === 200, 'POST /auth/demo-login returns HTTP 200', `Status: ${demoRoot.status}`);
    assert(Boolean(demoRoot.data?.token), 'POST /auth/demo-login returns signed JWT token', 'No token returned');
    assert(demoRoot.data?.user?.role === 'CITIZEN', 'Demo user has CITIZEN role', `Role: ${demoRoot.data?.user?.role}`);

    const citizenToken = demoRoot.data?.token;

    // Test demo-login on /api prefix
    const demoApi = await localReq('/api/auth/demo-login', 'POST', { Origin: VERCEL_ORIGIN }, { role: 'SUPERVISOR' });
    assert(demoApi.status === 200, 'POST /api/auth/demo-login returns HTTP 200', `Status: ${demoApi.status}`);
    assert(demoApi.data?.user?.role === 'SUPERVISOR', 'Demo user has SUPERVISOR role', `Role: ${demoApi.data?.user?.role}`);
    const supervisorToken = demoApi.data?.token;

    // --- STEP 7: Demo Mode Configuration ---
    console.log('\n--- Step 7: Demo Mode Configuration ---');
    const fs = require('fs');
    const clientEnvSource = fs.readFileSync(require('path').join(__dirname, '../client/src/config/env.js'), 'utf8');
    assert(clientEnvSource.includes('VITE_ENABLE_DEMO_LOGIN'), 'Client config checks VITE_ENABLE_DEMO_LOGIN environment flag', 'Flag check missing in client env');
    assert(clientEnvSource.includes('enableDemoLogin'), 'Client config exports enableDemoLogin', 'enableDemoLogin missing in exports');

    // --- STEP 8: Cookies & JWT Architecture ---
    console.log('\n--- Step 8: Auth Cookies & JWT Headers ---');
    const setCookie = demoRoot.headers['set-cookie'];
    assert(Array.isArray(setCookie) && setCookie.some(c => c.includes('civictrack_token')), 'Server sets civictrack_token in Set-Cookie header', 'No cookie set');

    // --- STEP 9: Registration Flow & Role Enforcement ---
    console.log('\n--- Step 9: Registration Flow & Role Enforcement ---');
    const testRegEmail = `test_citizen_${Date.now()}@mysuru.example.com`;
    const regRes = await localReq('/auth/register', 'POST', { Origin: VERCEL_ORIGIN }, {
      name: 'Test Citizen User',
      email: testRegEmail,
      password: 'SecurePassword123!',
      role: 'ADMIN' // Malicious role escalation attempt
    });

    assert(regRes.status === 201, 'POST /auth/register returns HTTP 201 Created', `Status: ${regRes.status}`);
    assert(regRes.data?.requireVerification === true, 'Registration requires verification', `requireVerification: ${regRes.data?.requireVerification}`);

    const User = require('./models/User');
    const createdUser = await User.findOne({ email: testRegEmail });
    assert(createdUser !== null, 'Registered user written to MongoDB', 'User not found in DB');
    assert(createdUser?.role === 'CITIZEN', 'Public registration strictly forced to CITIZEN role (ADMIN escalation blocked)', `Stored role: ${createdUser?.role}`);
    assert(Boolean(createdUser?.otpHash || createdUser?.otp?.code), 'Verification OTP generated in MongoDB', 'OTP missing');

    // Clean up test user
    if (createdUser) await User.deleteOne({ _id: createdUser._id });

    // --- STEP 10: Role-Specific Endpoints ---
    console.log('\n--- Step 10: Role-Specific Endpoints & Supervisor Overview ---');

    // Supervisor Overview via root alias
    const supRoot = await localReq('/supervisor/overview', 'GET', {
      Origin: VERCEL_ORIGIN,
      Authorization: `Bearer ${supervisorToken}`
    });
    assert(supRoot.status === 200, 'GET /supervisor/overview returns HTTP 200 OK (no blank page)', `Status: ${supRoot.status}`);
    assert(supRoot.data?.data?.department !== undefined, 'Supervisor overview returns department data', 'Department missing');

    // Supervisor Overview via /api prefix
    const supApi = await localReq('/api/supervisor/overview', 'GET', {
      Origin: VERCEL_ORIGIN,
      Authorization: `Bearer ${supervisorToken}`
    });
    assert(supApi.status === 200, 'GET /api/supervisor/overview returns HTTP 200 OK', `Status: ${supApi.status}`);

    // Citizen blocked from supervisor overview
    const citizenBlock = await localReq('/supervisor/overview', 'GET', {
      Origin: VERCEL_ORIGIN,
      Authorization: `Bearer ${citizenToken}`
    });
    assert(citizenBlock.status === 403, 'Citizen blocked from supervisor endpoint with HTTP 403 Forbidden', `Status: ${citizenBlock.status}`);
    assert(citizenBlock.headers['access-control-allow-origin'] === VERCEL_ORIGIN, '403 Forbidden response retains CORS headers', 'CORS missing on 403');

    // --- Live Render Backend Check ---
    console.log('\n--- Live Render Deployment Status Check ---');
    try {
      const renderHealth = await request({
        protocol: 'https:',
        hostname: RENDER_HOST,
        port: 443,
        path: '/api/health',
        method: 'GET'
      });
      assert(renderHealth.status === 200, `Live Render ${RENDER_HOST}/api/health returns HTTP 200`, `Status: ${renderHealth.status}`);
      console.log(`  Live Render Health Response: ${renderHealth.body.trim()}`);
    } catch (e) {
      console.log(`  Live Render connection note: ${e.message}`);
    }

  } catch (err) {
    console.error('Audit execution error:', err);
    failed++;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
  }

  console.log('\n================================================================');
  console.log(` AUDIT RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit();
