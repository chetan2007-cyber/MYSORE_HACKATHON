const mongoose = require('mongoose');

const issueUpdateSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: true,
      index: true
    },
    message: {
      type: String,
      required: [true, 'Update message is required'],
      trim: true
    },
    updateType: {
      type: String,
      enum: [
        'STATUS_CHANGE',
        'PROGRESS',
        'EVIDENCE',
        'ASSIGNMENT',
        'ESCALATION',
        'COMMENT',
        'VERIFICATION',
        'REOPEN'
      ],
      default: 'PROGRESS'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    previousStatus: {
      type: String,
      default: null
    },
    newStatus: {
      type: String,
      default: null
    },
    attachments: [
      {
        filename: String,
        path: String,
        mimeType: String,
        size: Number
      }
    ],
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('IssueUpdate', issueUpdateSchema);
