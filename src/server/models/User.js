const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: ['CITIZEN', 'FIELD_WORKER', 'OFFICER', 'SUPERVISOR', 'ADMIN'],
      default: 'CITIZEN',
      required: true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    phone: {
      type: String,
      trim: true
    },
    avatar: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['PENDING_VERIFICATION', 'INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'],
      default: 'PENDING_VERIFICATION'
    },
    accountStatus: {
      type: String,
      enum: ['PENDING_VERIFICATION', 'INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'],
      default: 'PENDING_VERIFICATION'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    invitationToken: {
      type: String,
      default: null,
      index: true
    },
    invitationExpiresAt: {
      type: Date,
      default: null
    },
    otpHash: {
      type: String,
      default: null
    },
    otpExpiresAt: {
      type: Date,
      default: null
    },
    otpAttempts: {
      type: Number,
      default: 0
    },
    otpLastSentAt: {
      type: Date,
      default: null
    },
    otp: {
      hash: { type: String, default: null },
      expiresAt: { type: Date, default: null },
      attempts: { type: Number, default: 0 }
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function (next) {
  // Keep status and accountStatus in sync
  if (this.isModified('status') && !this.isModified('accountStatus')) {
    this.accountStatus = this.status;
  } else if (this.isModified('accountStatus') && !this.isModified('status')) {
    this.status = this.accountStatus;
  }

  // Keep top-level otp fields and nested otp object in sync
  if (this.isModified('otpHash')) {
    if (!this.otp) this.otp = {};
    this.otp.hash = this.otpHash;
  }
  if (this.isModified('otpExpiresAt')) {
    if (!this.otp) this.otp = {};
    this.otp.expiresAt = this.otpExpiresAt;
  }
  if (this.isModified('otpAttempts')) {
    if (!this.otp) this.otp = {};
    this.otp.attempts = this.otpAttempts;
  }

  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual aliases for compatibility
userSchema.virtual('passwordHash').get(function () {
  return this.password;
});
userSchema.virtual('invitationTokenHash').get(function () {
  return this.invitationToken;
});

module.exports = mongoose.model('User', userSchema);
