const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
  {
    caseId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Issue title is required'],
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      required: [true, 'Issue description is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Sanitation & Waste',
        'Roads & Infrastructure',
        'Drainage & Sewage',
        'Streetlights & Electrical',
        'Water Supply',
        'Public Health & Safety'
      ]
    },
    location: {
      address: { type: String, required: true, trim: true },
      ward: { type: String, required: true, trim: true },
      landmark: { type: String, trim: true, default: '' },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
      }
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    priority: {
      type: String,
      enum: ['P1', 'P2', 'P3', 'P4'],
      default: 'P3'
    },
    status: {
      type: String,
      enum: [
        'REPORTED',
        'UNDER_REVIEW',
        'ASSIGNED',
        'ACKNOWLEDGED',
        'IN_PROGRESS',
        'ON_HOLD',
        'RESOLUTION_SUBMITTED',
        'VERIFICATION_REQUIRED',
        'RESOLVED',
        'CLOSED',
        'REOPENED'
      ],
      default: 'REPORTED',
      index: true
    },
    sla: {
      startedAt: { type: Date, default: Date.now },
      dueAt: { type: Date, required: true },
      status: {
        type: String,
        enum: ['ON_TRACK', 'AT_RISK', 'BREACHED', 'COMPLETED'],
        default: 'ON_TRACK',
        index: true
      },
      breachedAt: { type: Date, default: null },
      breachReason: { type: String, default: null }
    },
    attachments: [
      {
        filename: { type: String, required: true },
        path: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    resolution: {
      notes: { type: String, default: '' },
      beforeImages: [{ type: String }],
      afterImages: [{ type: String }],
      completionRemarks: { type: String, default: '' },
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      submittedAt: { type: Date, default: null },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      verifiedAt: { type: Date, default: null },
      verificationStatus: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
      },
      rejectionReason: { type: String, default: '' }
    },
    citizenFeedback: {
      confirmed: { type: Boolean, default: null },
      confirmedAt: { type: Date, default: null },
      reopenReason: { type: String, default: '' }
    },
    escalationCount: {
      type: Number,
      default: 0
    },
    acknowledgedAt: {
      type: Date,
      default: null
    },
    workStartedAt: {
      type: Date,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    closedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for high-performance dashboard, filters, and searches
issueSchema.index({ status: 1, priority: 1, department: 1 });
issueSchema.index({ 'sla.dueAt': 1, 'sla.status': 1 });
issueSchema.index({ title: 'text', description: 'text', caseId: 'text', 'location.address': 'text' });

module.exports = mongoose.model('Issue', issueSchema);
