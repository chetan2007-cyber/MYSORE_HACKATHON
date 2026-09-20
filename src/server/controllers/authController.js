const crypto = require('crypto');
const User = require('../models/User');
const { logAudit } = require('../services/auditService');
const { sendOtpEmail } = require('../services/emailService');
const { generateToken, sendTokenResponse } = require('../middleware/auth');
const env = require('../config/env');

// Helper to generate a 6-digit secure numeric OTP
const generateSecureOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Helper to calculate SHA-256 hash of an OTP code
const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
};

// @desc    Register a user (initiates email OTP verification)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });

    const otpCode = generateSecureOtp();
    const otpHash = hashOtp(otpCode);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user;

    if (existingUser) {
      // If user is already active, reject duplicate email
      if (existingUser.status === 'ACTIVE' || existingUser.accountStatus === 'ACTIVE' || existingUser.isVerified) {
        return res.status(409).json({
          success: false,
          message: 'An active user account with this email address already exists.'
        });
      }

      // If user is an invited staff member, do not allow public citizen registration overwrite
      if (existingUser.status === 'INVITED' || existingUser.accountStatus === 'INVITED') {
        return res.status(409).json({
          success: false,
          message: 'This email is provisioned for municipal staff access. Please use your invitation setup link.'
        });
      }

      // If pending verification, update info and refresh OTP
      existingUser.name = name;
      existingUser.password = password; // Will trigger pre-save bcrypt hash
      existingUser.role = 'CITIZEN'; // Strictly enforce CITIZEN
      if (phone) existingUser.phone = phone;
      existingUser.otpHash = otpHash;
      existingUser.otpExpiresAt = otpExpiresAt;
      existingUser.otpAttempts = 0;
      existingUser.otpLastSentAt = new Date();
      existingUser.otp = { hash: otpHash, expiresAt: otpExpiresAt, attempts: 0 };
      existingUser.status = 'PENDING_VERIFICATION';
      existingUser.accountStatus = 'PENDING_VERIFICATION';
      user = await existingUser.save();
    } else {
      // SECURITY RULE: Public self-registration ALWAYS creates CITIZEN role
      user = await User.create({
        name,
        email: cleanEmail,
        password,
        phone: phone || '',
        role: 'CITIZEN',
        department: null,
        status: 'PENDING_VERIFICATION',
        accountStatus: 'PENDING_VERIFICATION',
        isVerified: false,
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        otpLastSentAt: new Date(),
        otp: {
          hash: otpHash,
          expiresAt: otpExpiresAt,
          attempts: 0
        }
      });
    }

    // Dispatch OTP email via SMTP provider
    const mailResult = await sendOtpEmail({
      to: user.email,
      name: user.name,
      otp: otpCode
    });

    await logAudit({
      actor: user._id,
      actorName: user.name,
      actorRole: user.role,
      action: 'USER_REGISTERED_PENDING_VERIFICATION',
      entity: 'User',
      entityId: user._id,
      metadata: { email: user.email, role: user.role, emailAccepted: mailResult.success },
      ipAddress: req.ip
    });

    // In production, OTP is NEVER returned in response
    const returnOtp = env.isDevelopment && env.otpDevMode;

    if (!mailResult.success) {
      return res.status(201).json({
        success: false,
        requireVerification: true,
        email: user.email,
        emailDelivered: false,
        otp: returnOtp ? otpCode : undefined,
        message: 'Account created, but we could not send the verification email. Please try sending the code again.'
      });
    }

    // Return verification prompt (no JWT issued until verified)
    res.status(201).json({
      success: true,
      requireVerification: true,
      email: user.email,
      emailDelivered: true,
      otp: returnOtp ? otpCode : undefined,
      message: 'Registration initiated. A 6-digit verification code has been sent to your email.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify 6-digit OTP code and activate account
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email address and the 6-digit verification code.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    const user = await User.findOne({ email: cleanEmail })
      .select('+password')
      .populate('department');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found matching this email address.'
      });
    }

    // If already verified, allow login
    if (user.accountStatus === 'ACTIVE' && user.isVerified) {
      return sendTokenResponse(user, 200, res, 'Account is already verified.');
    }

    const activeOtpHash = user.otpHash || user.otp?.hash;
    const activeExpiresAt = user.otpExpiresAt || user.otp?.expiresAt;
    const attempts = user.otpAttempts || user.otp?.attempts || 0;

    // Check OTP existence
    if (!activeOtpHash || !activeExpiresAt) {
      return res.status(400).json({
        success: false,
        message: 'No active verification code found. Please request a new code.'
      });
    }

    // Check maximum verification attempts (5 attempts limit)
    if (attempts >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new code.'
      });
    }

    // Check expiration (10 minute limit)
    if (new Date() > new Date(activeExpiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'This verification code has expired. Please request a new code.'
      });
    }

    // Hash submitted code and compare
    const candidateHash = hashOtp(cleanOtp);
    if (candidateHash !== activeOtpHash) {
      user.otpAttempts = attempts + 1;
      if (user.otp) user.otp.attempts = user.otpAttempts;
      await user.save();

      const remaining = Math.max(0, 5 - user.otpAttempts);
      return res.status(400).json({
        success: false,
        message: remaining > 0
          ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
          : 'Incorrect verification code. This code has been invalidated. Please request a new code.'
      });
    }

    // Code is valid: activate citizen account
    user.status = 'ACTIVE';
    user.accountStatus = 'ACTIVE';
    user.isVerified = true;
    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    user.otpLastSentAt = null;
    user.otp = { hash: null, expiresAt: null, attempts: 0 };
    user.lastLoginAt = new Date();
    await user.save();

    await logAudit({
      actor: user._id,
      actorName: user.name,
      actorRole: user.role,
      action: 'USER_EMAIL_VERIFIED',
      entity: 'User',
      entityId: user._id,
      metadata: { email: user.email },
      ipAddress: req.ip
    });

    // Issue JWT token and set HttpOnly cookie now that account is verified
    return sendTokenResponse(user, 200, res, 'Email successfully verified. Your account is now active.');
  } catch (error) {
    next(error);
  }
};

// @desc    Resend OTP verification code
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email.'
      });
    }

    if (user.accountStatus === 'ACTIVE' && user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'This account has already been verified. Please log in.'
      });
    }

    // 60-second cooldown check
    if (user.otpLastSentAt) {
      const elapsedMs = Date.now() - new Date(user.otpLastSentAt).getTime();
      if (elapsedMs < 60000) {
        const remainingSeconds = Math.ceil((60000 - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remainingSeconds}s before requesting another verification code.`
        });
      }
    }

    const otpCode = generateSecureOtp();
    const otpHash = hashOtp(otpCode);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.otpHash = otpHash;
    user.otpExpiresAt = otpExpiresAt;
    user.otpAttempts = 0;
    user.otpLastSentAt = new Date();
    user.otp = {
      hash: otpHash,
      expiresAt: otpExpiresAt,
      attempts: 0
    };
    await user.save();

    const mailResult = await sendOtpEmail({
      to: user.email,
      name: user.name,
      otp: otpCode
    });

    if (!mailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Could not send the verification email. Please check your email and try again.'
      });
    }

    const returnOtp = env.isDevelopment && env.otpDevMode;

    res.status(200).json({
      success: true,
      otp: returnOtp ? otpCode : undefined,
      message: 'A fresh 6-digit verification code has been dispatched to your email.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password')
      .populate('department');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    // Check if staff account is awaiting initial password setup
    if (user.status === 'INVITED' || user.accountStatus === 'INVITED') {
      return res.status(403).json({
        success: false,
        requireSetup: true,
        message: 'This municipal staff account requires initial password setup. Please use the invitation link sent to your email or contact your administrator.'
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'Account password has not been established yet. Please check your invitation email.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password incorrect.'
      });
    }

    // Account verification gate
    if (user.status === 'PENDING_VERIFICATION' || user.accountStatus === 'PENDING_VERIFICATION' || !user.isVerified) {
      // Auto-dispatch a fresh code so user can verify immediately
      const otpCode = generateSecureOtp();
      const otpHash = hashOtp(otpCode);
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      user.otpHash = otpHash;
      user.otpExpiresAt = otpExpiresAt;
      user.otpAttempts = 0;
      user.otpLastSentAt = new Date();
      user.otp = {
        hash: otpHash,
        expiresAt: otpExpiresAt,
        attempts: 0
      };
      await user.save();
      await sendOtpEmail({ to: user.email, name: user.name, otp: otpCode });

      return res.status(403).json({
        success: false,
        requireVerification: true,
        email: user.email,
        message: 'Account pending verification. A new verification code has been sent to your email.'
      });
    }

    if (!user.isActive || user.status === 'SUSPENDED' || user.accountStatus === 'SUSPENDED' || user.status === 'DEACTIVATED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    return sendTokenResponse(user, 200, res, 'Logged in successfully.');
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('department');
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        isVerified: user.isVerified,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get field workers for assignment
// @route   GET /api/auth/workers
// @access  Private (Officer, Supervisor, Admin)
const getWorkers = async (req, res, next) => {
  try {
    const { departmentId } = req.query;
    const query = { role: 'FIELD_WORKER', isActive: true, accountStatus: 'ACTIVE' };

    if (departmentId) {
      query.department = departmentId;
    }

    const workers = await User.find(query)
      .select('name email phone department')
      .populate('department', 'name code');

    res.status(200).json({
      success: true,
      count: workers.length,
      data: workers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (Admin view)
// @route   GET /api/auth/users
// @access  Private (Admin, Supervisor)
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fast demo switch login
// @route   POST /api/auth/demo-login
// @access  Public (Development / Testing)
const demoLogin = async (req, res, next) => {
  try {
    const { role } = req.body;
    const targetRole = role ? role.toUpperCase() : 'OFFICER';

    const user = await User.findOne({ role: targetRole, isActive: true }).populate('department');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No active user found with role ${targetRole}. Please ensure database is seeded.`
      });
    }

    // Ensure demo account is marked active
    if (!user.isVerified || user.accountStatus !== 'ACTIVE') {
      user.isVerified = true;
      user.accountStatus = 'ACTIVE';
      await user.save();
    }

    return sendTokenResponse(user, 200, res, 'Demo session initiated successfully.');
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear session
// @route   POST /api/auth/logout
// @access  Public
const logout = async (req, res) => {
  res.clearCookie('civictrack_token', {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite
  });
  res.status(200).json({
    success: true,
    message: 'User logged out successfully.'
  });
};

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  logout,
  getMe,
  getWorkers,
  getAllUsers,
  demoLogin
};
