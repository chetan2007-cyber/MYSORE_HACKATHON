const rateLimit = require('express-rate-limit');

/**
 * Standard rate limiter for general API requests
 * 300 requests per 15 minutes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.'
  }
});

/**
 * Rate limiter for authentication endpoints (login / register)
 * 100 requests per 15 minutes to prevent brute-force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

/**
 * Strict rate limiter for OTP verification submissions
 * 10 attempts per 15 minutes
 */
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP verification attempts. Please wait 15 minutes before retrying.'
  }
});

/**
 * Strict rate limiter for OTP resend requests
 * 5 requests per 15 minutes to prevent SMTP abuse
 */
const otpResendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP resend requests. Please check your spam folder or wait 15 minutes.'
  }
});

/**
 * Rate limiter for staff invitation setups
 * 30 attempts per hour
 */
const staffSetupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many setup requests. Please try again in one hour.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  otpVerifyLimiter,
  otpResendLimiter,
  staffSetupLimiter
};
