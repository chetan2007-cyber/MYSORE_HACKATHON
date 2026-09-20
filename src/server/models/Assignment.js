const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: true,
      index: true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    priority: {
      type: String,
      enum: ['P1', 'P2', 'P3', 'P4'],
      required: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    instructions: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACKNOWLEDGED', 'REJECTED', 'COMPLETED'],
      default: 'PENDING',
      index: true
    },
    acknowledgedAt: {
      type: Date,
      default: null
    },
    rejectedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Assignment', assignmentSchema);
