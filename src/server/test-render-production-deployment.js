const axios = require('axios');
const fs = require('fs');
const path = require('path');

const RENDER_BACKEND_URL = 'https://civictrack-backend-rsy2.onrender.com';
const LOCAL_BACKEND_URL = 'http://localhost:5000/api';

async function runRenderProductionAudit() {
  console.log('\n================================================================');
  console.log(' CIVICTRACK: RENDER PRODUCTION DEPLOYMENT AUDIT & VERIFICATION  ');
  console.log(` Target Backend: ${RENDER_BACKEND_URL}`);
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

  // -------------------------------------------------------------
  // TEST 1: Live Render Health Check
  // -------------------------------------------------------------
  console.log('--- TEST 1: Deployed Render Health Endpoint ---');
  try {
    const healthRes = await axios.get(`${RENDER_BACKEND_URL}/api/health`, { timeout: 15000 });
    assert(healthRes.status === 200, 'Health endpoint returns HTTP 200 OK');
    assert(healthRes.data?.status === 'ok', "Health status is 'ok'");
    assert(healthRes.data?.database === 'connected', "MongoDB database reports 'connected'");
    assert(!healthRes.data?.mongoUri && !healthRes.data?.jwtSecret, 'Health check does NOT leak database credentials');
  } catch (err) {
    assert(false, 'Live Render Health Endpoint reachable', err.message);
  }

  // -------------------------------------------------------------
  // TEST 2: Production Authentication on Live Backend
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Citizen Authentication on Live Backend ---');
  let citizenToken = null;
  try {
    const loginRes = await axios.post(`${RENDER_BACKEND_URL}/api/auth/demo-login`, { role: 'CITIZEN' }, { timeout: 15000 });
    assert(loginRes.status === 200, 'Citizen demo login returns HTTP 200');
    assert(loginRes.data?.success === true, 'Response status is success: true');
    assert(loginRes.data?.user?.role === 'CITIZEN', `Logged in as CITIZEN: ${loginRes.data?.user?.name}`);
    citizenToken = loginRes.data?.token;
    assert(citizenToken && citizenToken.length > 50, 'Issued valid cryptographic JWT token in response body');
  } catch (err) {
    assert(false, 'Citizen login against Render backend', err.message);
  }

  // -------------------------------------------------------------
  // TEST 3: All 5 Operational Roles & Supervisor Regression
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: 5 Operational Roles & Supervisor Verification ---');
  const roles = ['FIELD_WORKER', 'OFFICER', 'SUPERVISOR', 'ADMIN'];
  for (const role of roles) {
    try {
      const res = await axios.post(`${RENDER_BACKEND_URL}/api/auth/demo-login`, { role }, { timeout: 15000 });
      assert(res.status === 200 && res.data.user?.role === role, `Role '${role}' authenticated successfully on Render`);
      
      const token = res.data.token;
      if (role === 'SUPERVISOR') {
        const supRes = await axios.get(`${RENDER_BACKEND_URL}/api/supervisor/overview`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        });
        assert(supRes.status === 200, 'Supervisor Overview API returns HTTP 200 OK on live Render backend');
        assert(supRes.data?.department !== undefined, 'Supervisor Overview contains assigned department data');
        assert(Array.isArray(supRes.data?.activeEscalations || supRes.data?.data?.activeEscalations || []), 'Active escalations returned as array');
      } else if (role === 'OFFICER') {
        const offRes = await axios.get(`${RENDER_BACKEND_URL}/api/officer/issues`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        });
        assert(offRes.status === 200, 'Officer Issues API returns HTTP 200 OK on live Render backend');
      } else if (role === 'FIELD_WORKER') {
        const workRes = await axios.get(`${RENDER_BACKEND_URL}/api/worker/assignments`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        });
        assert(workRes.status === 200, 'Field Worker Assignments API returns HTTP 200 OK on live Render backend');
      } else if (role === 'ADMIN') {
        const admRes = await axios.get(`${RENDER_BACKEND_URL}/api/admin/overview`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        });
        assert(admRes.status === 200, 'Admin Overview API returns HTTP 200 OK on live Render backend');
      }
    } catch (err) {
      assert(false, `Verification for role '${role}' on Render`, err.message);
    }
  }

  // -------------------------------------------------------------
  // TEST 4: Backend CORS Origin Hardening (Local Verification)
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Backend CORS Origin Hardening ---');
  try {
    // 1. Localhost origin should be permitted
    const corsLocalRes = await axios.get(`${LOCAL_BACKEND_URL}/health`, {
      headers: { Origin: 'http://localhost:5173' }
    });
    assert(corsLocalRes.status === 200, 'Localhost origin allowed via CORS');
    assert(
      corsLocalRes.headers['access-control-allow-origin'] === 'http://localhost:5173',
      'Access-Control-Allow-Origin echoes back matching origin'
    );
    assert(
      corsLocalRes.headers['access-control-allow-credentials'] === 'true',
      'Access-Control-Allow-Credentials is true for session cookies'
    );

    // 2. Disallowed origin should be cleanly rejected without 500 error
    let rejectedRes;
    try {
      rejectedRes = await axios.get(`${LOCAL_BACKEND_URL}/health`, {
        headers: { Origin: 'https://malicious-attacker-site.com' }
      });
    } catch (err) {
      rejectedRes = err.response;
    }
    assert(
      !rejectedRes?.headers['access-control-allow-origin'],
      'Disallowed origin does NOT receive Access-Control-Allow-Origin header'
    );
    assert(
      rejectedRes?.status !== 500,
      `CORS rejection does NOT crash with HTTP 500 (got ${rejectedRes?.status || 'network error'})`
    );
  } catch (err) {
    assert(false, 'Local CORS verification', err.message);
  }

  // -------------------------------------------------------------
  // TEST 5: Production Client Bundle Verification
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Production Client Bundle Audit ---');
  const distDir = path.join(__dirname, '..', 'client', 'dist');
  const assetsDir = path.join(distDir, 'assets');

  assert(fs.existsSync(distDir), "Production build directory 'client/dist' exists");
  assert(fs.existsSync(path.join(distDir, 'index.html')), "'client/dist/index.html' exists");
  assert(fs.existsSync(path.join(distDir, 'sw.js')), "'client/dist/sw.js' Service Worker exists");

  if (fs.existsSync(assetsDir)) {
    const jsFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js') && f.startsWith('index-'));
    if (jsFiles.length > 0) {
      const mainBundleContent = fs.readFileSync(path.join(assetsDir, jsFiles[0]), 'utf8');
      
      const containsRenderApi = mainBundleContent.includes('https://civictrack-backend-rsy2.onrender.com/api');
      assert(containsRenderApi, 'Compiled bundle contains production Render API base URL');

      const containsLocalhostApi = mainBundleContent.includes('http://localhost:5000') || mainBundleContent.includes('http://127.0.0.1:5000');
      assert(!containsLocalhostApi, 'Compiled bundle contains ZERO references to localhost:5000 / 127.0.0.1:5000');
    }
  }

  console.log('\n================================================================');
  console.log(` AUDIT SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  process.exit(failed === 0 ? 0 : 1);
}

runRenderProductionAudit();
