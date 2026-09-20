const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isDevelopment = !isProduction;

// Fail startup in production if JWT_SECRET is missing or weak
const rawJwtSecret = process.env.JWT_SECRET;
let jwtSecret = rawJwtSecret;

if (isProduction) {
  if (!rawJwtSecret || rawJwtSecret.length < 32 || rawJwtSecret.includes('replace_with') || rawJwtSecret === 'secret') {
    console.error(
      '\x1b[31m[CRITICAL SECURITY ERROR] In production, JWT_SECRET must be set to a cryptographically strong secret of at least 32 characters.\x1b[0m'
    );
    process.exit(1);
  }
} else {
  jwtSecret = rawJwtSecret || 'civictrack-dev-insecure-secret-key-do-not-use-in-production-2026';
}

// Fail startup in production if MONGO_URI is missing
const rawMongoUri = process.env.MONGO_URI;
let mongoUri = rawMongoUri;

if (isProduction) {
  if (!rawMongoUri) {
    console.error(
      '\x1b[31m[CRITICAL CONFIG ERROR] In production, MONGO_URI must be provided via environment variables.\x1b[0m'
    );
    process.exit(1);
  }
} else {
  mongoUri = rawMongoUri || 'mongodb://127.0.0.1:27017/civictrack';
}

// Clean and normalize client URLs (removes trailing slashes)
const rawClientUrl = process.env.CLIENT_URL || (isProduction ? '' : 'http://localhost:5173');
const clientUrl = rawClientUrl
  .split(',')
  .map(url => url.trim().replace(/\/+$/, ''))
  .filter(Boolean)
  .join(',');

const port = parseInt(process.env.PORT || '5000', 10);
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1d';

// In production, OTP_DEV_MODE is strictly false
const otpDevMode = !isProduction && process.env.OTP_DEV_MODE === 'true';

// Cookie security flags
const cookieSecure = process.env.COOKIE_SECURE === 'true' || isProduction;
const cookieSameSite = process.env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax');

const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = (process.env.SMTP_USER || '').trim();
const rawSmtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '';
const smtpPassword = rawSmtpPass.trim();
const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
const smtpFrom = process.env.SMTP_FROM || (smtpUser ? `"CivicTrack Verification" <${smtpUser}>` : 'CivicTrack Operations <no-reply@civictrack.gov>');

module.exports = {
  nodeEnv,
  isProduction,
  isDevelopment,
  isProd: isProduction,
  isDev: isDevelopment,
  port,
  mongoUri,
  jwtSecret,
  jwtExpiresIn,
  clientUrl,
  otpDevMode,
  cookieSecure,
  cookieSameSite,
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: smtpSecure,
    user: smtpUser,
    password: smtpPassword,
    from: smtpFrom
  }
};
