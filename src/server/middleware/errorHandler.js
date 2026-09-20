const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error(`[CivicTrack API Error] ${req.method} ${req.originalUrl}:`, err.message);
  if (env.isDev && err.stack) {
    console.error(err.stack);
  }

  // Ensure CORS headers are preserved on error responses
  const origin = req.headers && req.headers.origin;
  if (origin && !res.getHeader('Access-Control-Allow-Origin')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with ID of ${err.value}`;
    return res.status(404).json({ success: false, error: 'Resource not found', message });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'record';
    const message = `A record with this ${field} already exists.`;
    return res.status(409).json({ success: false, error: 'Conflict', message });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({ success: false, error: 'Validation Error', message });
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Upload Error', message: 'File size exceeds maximum limit of 25MB.' });
    }
    return res.status(400).json({ success: false, error: 'Upload Error', message: `Upload error: ${err.message}` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid authentication token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication token has expired. Please log in again.' });
  }

  const statusCode = error.statusCode || 500;
  const isInternal = statusCode === 500;
  const safeMessage = (env.isProd && isInternal) ? 'Internal server error' : (error.message || 'Internal server error');

  res.status(statusCode).json({
    success: false,
    error: safeMessage,
    message: safeMessage,
    ...(env.isDev && err.stack ? { stack: err.stack } : {})
  });
};

module.exports = errorHandler;
