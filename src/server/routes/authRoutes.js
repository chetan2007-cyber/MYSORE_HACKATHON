const express = require('express');
const router = express.Router();
const {
  register,
  verifyOtp,
  resendOtp,
  login,
  logout,
  getMe,
  getWorkers,
  getAllUsers,
  demoLogin
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { authLimiter, otpVerifyLimiter, otpResendLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/verify-otp', otpVerifyLimiter, verifyOtp);
router.post('/resend-otp', otpResendLimiter, resendOtp);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.post('/demo-login', demoLogin);
router.get('/me', protect, getMe);
router.get('/workers', protect, authorize('OFFICER', 'SUPERVISOR', 'ADMIN'), getWorkers);
router.get('/users', protect, authorize('SUPERVISOR', 'ADMIN'), getAllUsers);

module.exports = router;
