# CivicTrack Environment Setup Guide

This guide details the exact procedures for setting up CivicTrack in both Local Development and Cloud Production environments.

---

## Architecture Overview

CivicTrack consists of two decoupled components:
1. **Frontend**: Static React Single Page Application (Vite + Tailwind CSS).
2. **Backend**: Node.js & Express REST API with MongoDB Atlas and JWT/cookie authentication.

---

## LOCAL DEVELOPMENT

### Prerequisites
- Node.js (v18.x or later recommended)
- npm (v9.x or later)
- Local MongoDB instance (`mongodb://127.0.0.1:27017`) or free-tier MongoDB Atlas cluster

### 1. Install Node.js
Ensure Node.js and npm are installed and accessible in your shell:
```bash
node -v
npm -v
```

### 2. Start MongoDB / Connect to Development Atlas
If running MongoDB locally:
```bash
# macOS/Linux
brew services start mongodb/brew/mongodb-community
# Windows
net start MongoDB
```
Or set up a dedicated development database on MongoDB Atlas (e.g. `civictrack-dev`).

### 3. Configure .env
Copy environment templates in both `server/` and `client/`:

**Backend Configuration (`server/.env`):**
```bash
cp server/.env.example server/.env
```
Fill in values for development:
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/civictrack
JWT_SECRET=development_only_secret_key_civictrack_32chars_min!
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=no-reply@civictrack.local
OTP_DEV_MODE=true
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
```

**Frontend Configuration (`client/.env`):**
```bash
cp client/.env.example client/.env
```
Contents:
```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Install Dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 5. Seed Development Database
> **Note:** Development demo accounts are not created in production. Seeding is strictly forbidden in production mode (`NODE_ENV=production`).
```bash
cd server
npm run seed
```

### 6. Start Development Servers
Start both servers in separate terminal sessions:

```bash
# Backend (from server/)
npm run dev

# Frontend (from client/)
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## PRODUCTION

### 1. Create MongoDB Atlas Production Database
1. Provision a production MongoDB Atlas cluster (M10+ recommended for dedicated tier).
2. Configure IP Access List in Atlas Network Access to allow inbound traffic from your backend hosting platform (or use VPC peering).
3. Create a dedicated production database user with `readWrite` permissions on the production database (e.g., `civictrack-prod`).
4. Note your SRV connection URI: `mongodb+srv://<dbuser>:<password>@<cluster>.mongodb.net/civictrack-prod?retryWrites=true&w=majority`

### 2. Configure Backend Environment Variables
Set the following environment variables in your backend hosting provider (e.g., AWS ECS, Render, Railway, Heroku):

| Variable | Value Description | Example / Recommended Setting |
| :--- | :--- | :--- |
| `NODE_ENV` | Must be set to `production` | `production` |
| `PORT` | Assigned dynamically by hosting platform | Set by host or default `5000` |
| `MONGO_URI` | MongoDB Atlas Production URI | `mongodb+srv://<user>:<pwd>@<cluster>/civictrack-prod` |
| `JWT_SECRET` | Cryptographically random secret (>= 32 chars) | Generated via `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | Session token validity duration | `1d` |
| `CLIENT_URL` | Production Frontend domain (no trailing slash) | `https://<frontend-domain>` |
| `SMTP_HOST` | Production SMTP host (SendGrid, AWS SES, Resend) | `smtp.sendgrid.net` |
| `SMTP_PORT` | Production SMTP port | `587` |
| `SMTP_USER` | Production SMTP user / API key | `apikey` |
| `SMTP_PASSWORD` | Production SMTP password / secret | `<smtp-secret-key>` |
| `SMTP_FROM` | Production From email address | `noreply@<your-domain.gov>` |
| `OTP_DEV_MODE` | Must be false in production | `false` |
| `COOKIE_SECURE` | Set to true for HTTPS deployments | `true` |
| `COOKIE_SAME_SITE` | Set to `none` if frontend/backend are on separate domains, or `lax` if same domain | `none` (cross-domain) / `lax` (same-domain) |

### 3. Configure Frontend Environment Variables
In your frontend hosting platform (e.g., Vercel, Netlify, Cloudflare Pages):
```env
VITE_API_URL=https://<production-api-domain>/api
```

### 4. Configure CORS CLIENT_URL
Ensure the backend `CLIENT_URL` matches the frontend production URL exactly:
```env
CLIENT_URL=https://<frontend-domain>
```

### 5. Configure SMTP
Verify that your transactional email provider domain is verified with proper SPF, DKIM, and DMARC DNS records to ensure OTP and staff invitation delivery.

### 6. Build Frontend
Run the production build:
```bash
cd client
npm run build
```
This produces optimized static assets in `client/dist/`.

### 7. Start Backend
Run the production start command:
```bash
cd server
npm start
```

### 8. Configure SPA Fallback
Ensure the static frontend host is configured to route all unknown routes (`/*`) to `/index.html`:
- **Vercel**: Handled automatically via `client/vercel.json`.
- **Netlify / Cloudflare Pages**: Handled automatically via `client/public/_redirects`.
- **Nginx**:
  ```nginx
  location / {
      try_files $uri $uri/ /index.html;
  }
  ```

### 9. Configure HTTPS
Enforce TLS/HTTPS across both frontend and backend. Set HSTS headers and ensure all traffic is encrypted.

### 10. Verify Health Endpoint
Verify backend and database connectivity via:
```bash
curl -i https://<production-api-domain>/api/health
```
Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "system": "CivicTrack API",
  "version": "1.0.0",
  "timestamp": "2026-09-20T12:00:00.000Z"
}
```
