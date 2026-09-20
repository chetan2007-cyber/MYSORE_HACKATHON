const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    headOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    slaHours: {
      P1: { type: Number, default: 4 },   // Critical (e.g. 4 hours)
      P2: { type: Number, default: 24 },  // High (e.g. 24 hours)
      P3: { type: Number, default: 72 },  // Medium (e.g. 72 hours)
      P4: { type: Number, default: 168 }  // Low (e.g. 7 days = 168 hours)
    },
    contactEmail: {
      type: String,
      trim: true
    },
    contactPhone: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Department', departmentSchema);
