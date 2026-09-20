const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Route files
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const staffRoutes = require('./routes/staffRoutes');
const supervisorRoutes = require('./routes/supervisorRoutes');
const issueRoutes = require('./routes/issueRoutes');
const escalationRoutes = require('./routes/escalationRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const auditRoutes = require('./routes/auditRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Parse and normalize configured origins from CLIENT_URL
const parseConfiguredOrigins = (raw) => {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
};

const defaultOrigins = [
  'https://mysore-hackathon.vercel.app',
  'https://civictrack-backend-rsy2.onrender.com'
];

const configuredOrigins = parseConfiguredOrigins(env.clientUrl || process.env.CLIENT_URL);
const localOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
];

const allowedOrigins = Array.from(new Set([
  ...defaultOrigins,
  ...configuredOrigins,
  ...(!env.isProduction ? localOrigins : [])
]));

function isOriginAllowed(origin) {
  if (!origin) return true;
  const cleanOrigin = origin.replace(/\/+$/, '');

  if (allowedOrigins.includes(cleanOrigin)) return true;

  // Vercel deployment subdomains (e.g. preview and production)
  if (/^https:\/\/[a-z0-9-_.]+\.vercel\.app$/i.test(cleanOrigin)) return true;

  // Render deployment subdomains
  if (/^https:\/\/[a-z0-9-_.]+\.onrender\.com$/i.test(cleanOrigin)) return true;

  if (!env.isProduction) {
    if (cleanOrigin.includes('localhost') || cleanOrigin.includes('127.0.0.1')) {
      return true;
    }
  }

  for (const pattern of configuredOrigins) {
    if (pattern.includes('*')) {
      const regexPattern = new RegExp(
        '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
      );
      if (regexPattern.test(cleanOrigin)) {
        return true;
      }
    }
  }

  return false;
}

// Early CORS and Preflight Response Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Idempotency-Key, Idempotency-Key');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
        connectSrc: ["'self'", ...allowedOrigins, 'https://*.tile.openstreetmap.org', 'https://*.vercel.app', 'https://*.onrender.com'].filter(Boolean),
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'data:', 'blob:']
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Cookie Parser for HttpOnly Auth Token cookies
app.use(cookieParser());

app.use(
  cors({
    origin: function (origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        // Return false to reject CORS cleanly without throwing an unhandled 500 error
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'Idempotency-Key']
  })
);

// Body parser limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (env.isDevelopment) {
  app.use(morgan('dev'));
} else {
  // Safe production logging format without sensitive query params
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
}

// Serve uploaded media files locally
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Production-ready health check endpoint (handles both /health and /api/health)
const healthCheckHandler = (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const status = isDbConnected ? 'ok' : 'degraded';
  res.status(isDbConnected ? 200 : 503).json({
    status,
    database: isDbConnected ? 'connected' : 'disconnected',
    system: 'CivicTrack API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
};

app.get('/health', healthCheckHandler);
app.get('/api/health', healthCheckHandler);

// Apply rate limiting to all /api/ routes
app.use('/api', apiLimiter);

// Mount primary API routes under /api
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api', staffRoutes); // For backwards compatibility
app.use('/api/issues', issueRoutes);
app.use('/api/escalations', escalationRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/notifications', notificationRoutes);

// Interoperability aliases: mount top-level routes to gracefully serve frontends configured without /api
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/staff', staffRoutes);
app.use('/supervisor', supervisorRoutes);
app.use('/issues', issueRoutes);
app.use('/escalations', escalationRoutes);
app.use('/departments', departmentRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/audit-logs', auditRoutes);
app.use('/notifications', notificationRoutes);

// 404 JSON handler for unknown API routes
app.all(['/api/*', '/auth/*', '/issues/*'], (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
