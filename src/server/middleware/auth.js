const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');

/**
 * Generates a signed JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
};

/**
 * Sends token response via both HttpOnly cookie and JSON body
 */
const sendTokenResponse = (user, statusCode, res, message = 'Authenticated successfully') => {
  const token = generateToken(user._id);

  // Set secure HttpOnly cookie
  res.cookie('civictrack_token', token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone,
      isVerified: user.isVerified,
      status: user.status,
      accountStatus: user.accountStatus
    }
  });
};

/**
 * Protect middleware: validates JWT from Bearer Authorization header or HttpOnly cookie
 */
const protect = async (req, res, next) => {
  let token;

  // 1. Check Bearer Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Fallback to HttpOnly cookie
  else if (req.cookies && req.cookies.civictrack_token) {
    token = req.cookies.civictrack_token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);

    const user = await User.findById(decoded.id).populate('department');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This user account has been deactivated. Please contact an administrator.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.'
    });
  }
};

/**
 * Authorize middleware: restricts access to specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user ? req.user.role : 'GUEST'}' is not authorized to perform this action.`
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
  generateToken,
  sendTokenResponse
};
