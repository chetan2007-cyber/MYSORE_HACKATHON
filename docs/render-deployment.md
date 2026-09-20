# CivicTrack — Render Production Deployment & Configuration Guide

This guide explains how to properly configure and deploy both the **Backend Web Service** and the **Frontend Static Site** on Render to avoid CORS, SPA routing 404s, and API connection failures.

---

## 1. Backend Web Service Configuration (`civictrack-backend-rsy2`)

**Deployed URL**: `https://civictrack-backend-rsy2.onrender.com`  
**Health Check**: `https://civictrack-backend-rsy2.onrender.com/api/health`

### Settings in Render Dashboard
- **Service Type**: Web Service
- **Root Directory**: `src/server` (or repository root if using custom commands)
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Health Check Path**: `/api/health`

### Required Environment Variables

| Variable | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production security and disables development-only logging |
| `PORT` | `10000` or auto-assigned | Handled dynamically via `process.env.PORT \|\| 5000` |
| `MONGO_URI` | `mongodb+srv://...` | Connection URI to MongoDB Atlas or persistent database |
| `JWT_SECRET` | *32+ character random string* | Used for cryptographic signing of session JWTs |
| `JWT_EXPIRES_IN` | `1d` | Token lifetime |
| `CLIENT_URL` | `https://<your-frontend>.onrender.com` | **CRITICAL for CORS**: Allowed frontend origin(s). Comma-separated if multiple (e.g. `https://<your-frontend>.onrender.com,http://localhost:5173` or `https://*.onrender.com`) |
| `COOKIE_SECURE` | `true` | Requires HTTPS for session cookies |
| `COOKIE_SAME_SITE` | `none` | Allows cross-domain cookie transmission across Render subdomains |
| `OTP_DEV_MODE` | `false` | Mandates actual email OTP delivery |
| `SMTP_HOST` | *(optional)* | SMTP provider host for email verification |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | *(optional)* | SMTP username |
| `SMTP_PASS` | *(optional)* | SMTP password |

> [!IMPORTANT]
> If `CLIENT_URL` is omitted or does not match your frontend URL, the browser will block all API requests with CORS errors. You can specify `https://*.onrender.com` to allow any Render deployment of your frontend.

---

## 2. Frontend Static Site Configuration

**Service Type**: Static Site

### Settings in Render Dashboard
- **Root Directory**: `src/client`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`

*(Alternative if Root Directory is left as the repository root)*:
- Build Command: `cd src/client && npm install && npm run build`
- Publish Directory: `src/client/dist`

### Required Environment Variables

| Variable | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://civictrack-backend-rsy2.onrender.com/api` | **CRITICAL**: Baked into Vite build at compile time so all API requests target the live Render backend |

### Required Redirects / Rewrites (SPA Routing Fallback)

In your Render Static Site Dashboard:
1. Navigate to **Redirects / Rewrites** tab.
2. Click **Add Rule**.
3. Configure:
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
4. Click **Save Changes**.

> [!IMPORTANT]
> Without this rewrite rule, directly opening or refreshing client routes like `/login`, `/supervisor`, `/worker`, or `/my-reports` will result in a Render `404 Not Found`.

---

## 3. Deployment Checklist

- [x] Backend `PORT` uses `process.env.PORT || 5000` and listens on `0.0.0.0`.
- [x] Backend CORS supports `CLIENT_URL`, comma-separated origins, trailing slash normalization, and `*.onrender.com` wildcards.
- [x] Backend CORS returns `callback(null, false)` on disallow rather than throwing an unhandled 500 exception.
- [x] Client `VITE_API_URL` normalizes trailing slashes.
- [x] Client image elements (`EvidenceViewer`, `CaseTimeline`) wrap paths with `getMediaUrl` to load from the remote backend.
- [x] Service Worker Workbox caching pattern matches all `/api/*` endpoints and marks them `NetworkOnly`.
- [x] SPA Rewrite configured in Render Dashboard (`/* -> /index.html`) or via `render.yaml`.
