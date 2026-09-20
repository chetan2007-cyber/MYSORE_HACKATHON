const Escalation = require('../models/Escalation');
const Issue = require('../models/Issue');
const IssueUpdate = require('../models/IssueUpdate');
const { logAudit } = require('../services/auditService');

// @desc    Get all escalations
// @route   GET /api/escalations
// @access  Private (Officer, Supervisor, Admin)
const getEscalations = async (req, res, next) => {
  try {
    const { status, severity } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }
    if (severity) {
      query.severity = severity;
    }

    const escalations = await Escalation.find(query)
      .populate({
        path: 'issue',
        populate: [
          { path: 'department', select: 'name code' },
          { path: 'assignedTo', select: 'name email phone' },
          { path: 'reportedBy', select: 'name phone' }
        ]
      })
      .populate('escalatedFrom', 'name role')
      .populate('escalatedTo', 'name role')
      .populate('resolvedBy', 'name role')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: escalations.length,
      data: escalations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supervisor resolves or acknowledges an escalation
// @route   POST /api/escalations/:id/resolve
// @access  Private (Supervisor, Admin)
const resolveEscalation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action = 'RESOLVED', notes } = req.body; // 'ACKNOWLEDGED' or 'RESOLVED'

    const escalation = await Escalation.findById(id).populate('issue');
    if (!escalation) {
      return res.status(404).json({ success: false, message: 'Escalation not found.' });
    }

    if (action === 'ACKNOWLEDGED') {
      escalation.status = 'ACKNOWLEDGED';
      await escalation.save();

      await IssueUpdate.create({
        issue: escalation.issue._id,
        message: `Escalation acknowledged by Supervisor ${req.user.name}. Direct intervention scheduled.`,
        updateType: 'ESCALATION',
        createdBy: req.user._id,
        timestamp: new Date()
      });

      return res.status(200).json({
        success: true,
        message: 'Escalation marked as acknowledged by supervisor.',
        data: escalation
      });
    }

    if (!notes || notes.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Resolution notes are required when resolving an escalation.'
      });
    }

    escalation.status = 'RESOLVED';
    escalation.resolutionNotes = notes.trim();
    escalation.resolvedBy = req.user._id;
    escalation.resolvedAt = new Date();
    await escalation.save();

    await IssueUpdate.create({
      issue: escalation.issue._id,
      message: `Escalation RESOLVED by Supervisor ${req.user.name}. Note: "${notes.trim()}".`,
      updateType: 'ESCALATION',
      createdBy: req.user._id,
      timestamp: new Date()
    });

    await logAudit({
      actor: req.user,
      action: 'ESCALATION_RESOLVED',
      entity: 'Escalation',
      entityId: escalation._id,
      caseId: escalation.issue.caseId,
      metadata: { resolutionNotes: notes.trim() },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Escalation resolved successfully.',
      data: escalation
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEscalations,
  resolveEscalation
};
