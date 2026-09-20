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
        connectSrc: ["'self'", env.clientUrl, 'http://localhost:5000', 'http://localhost:5173'].filter(Boolean),
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'data:', 'blob:']
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Cookie Parser for HttpOnly Auth Token cookies
app.use(cookieParser());

// CORS setup based on environment configuration
const allowedOrigins = env.isProduction
  ? env.clientUrl
    ? env.clientUrl.split(',').map((s) => s.trim())
    : []
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', env.clientUrl].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || (!env.isProduction && origin.includes('localhost'))) {
        callback(null, true);
      } else {
        callback(new Error(`CORS Error: Origin '${origin}' is not permitted by CORS policy.`));
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

// Production-ready health check endpoint
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: 'ok',
    database: isDbConnected ? 'connected' : 'disconnected',
    system: 'CivicTrack API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Apply rate limiting to all /api/ routes
app.use('/api', apiLimiter);

// Mount API routes
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

// 404 JSON handler for unknown API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
