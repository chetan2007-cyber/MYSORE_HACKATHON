const Issue = require('../models/Issue');
const Department = require('../models/Department');
const Assignment = require('../models/Assignment');
const IssueUpdate = require('../models/IssueUpdate');
const Escalation = require('../models/Escalation');
const User = require('../models/User');
const { validateTransition } = require('../services/stateMachine');
const { calculateSlaDueDate, evaluateSlaStatus } = require('../services/slaService');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

// @desc    Assign an issue to a field worker
// @route   POST /api/issues/:id/assign
// @access  Private (Officer, Supervisor, Admin)
const assignIssue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { workerId, departmentId, priority, dueDate, instructions } = req.body;

    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Please select a field worker to assign.'
      });
    }

    const issue = await Issue.findById(id).populate('department');
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    // Verify state transition: can assign from REPORTED, UNDER_REVIEW, or REOPENED
    const targetStatus = 'ASSIGNED';
    const transitionCheck = validateTransition(issue.status, targetStatus);
    if (!transitionCheck.valid && !['REPORTED', 'UNDER_REVIEW', 'REOPENED', 'ASSIGNED'].includes(issue.status)) {
      return res.status(400).json({ success: false, message: transitionCheck.error });
    }

    const worker = await User.findById(workerId);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Assigned worker not found.' });
    }

    const targetDeptId = departmentId || issue.department?._id || worker.department;
    const department = await Department.findById(targetDeptId);

    // Update issue fields
    const previousStatus = issue.status;
    issue.status = 'ASSIGNED';
    issue.assignedTo = worker._id;
    if (department) issue.department = department._id;
    if (priority) issue.priority = priority;

    // Recalculate SLA due date if explicitly specified or new priority
    if (dueDate) {
      issue.sla.dueAt = new Date(dueDate);
    } else if (priority) {
      const { dueAt } = calculateSlaDueDate(priority, department, issue.sla.startedAt || new Date());
      issue.sla.dueAt = dueAt;
    }

    await issue.save();

    // Create Assignment record
    const assignment = await Assignment.create({
      issue: issue._id,
      department: department ? department._id : worker.department,
      assignedTo: worker._id,
      assignedBy: req.user._id,
      priority: issue.priority,
      dueDate: issue.sla.dueAt,
      instructions: instructions || '',
      status: 'PENDING'
    });

    // Create Timeline update
    await IssueUpdate.create({
      issue: issue._id,
      message: `Assigned to ${worker.name} (${department ? department.name : 'Department'}) by ${req.user.name}.${instructions ? ` Note: "${instructions}"` : ''}`,
      updateType: 'ASSIGNMENT',
      createdBy: req.user._id,
      previousStatus,
      newStatus: 'ASSIGNED',
      timestamp: new Date()
    });

    // Create Audit Log
    await logAudit({
      actor: req.user,
      action: 'ISSUE_ASSIGNED',
      entity: 'Issue',
      entityId: issue._id,
      caseId: issue.caseId,
      metadata: {
        assignedTo: worker.name,
        assignedToId: worker._id,
        department: department ? department.name : null,
        priority: issue.priority,
        instructions
      },
      ipAddress: req.ip
    });

    // Notify Field Worker
    await createNotification({
      recipient: worker._id,
      title: `New Assignment: ${issue.caseId}`,
      message: `You have been assigned to case ${issue.caseId} (${issue.title}). Priority: ${issue.priority}.`,
      type: 'ASSIGNMENT',
      link: `/issues/${issue._id}`,
      issue: issue._id
    });

    const updatedIssue = await Issue.findById(issue._id)
      .populate('department', 'name code')
      .populate('assignedTo', 'name email phone')
      .populate('reportedBy', 'name email phone');

    res.status(200).json({
      success: true,
      message: `Case ${issue.caseId} successfully assigned to ${worker.name}.`,
      data: updatedIssue,
      assignment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Field worker acknowledges assignment or requests rejection
// @route   POST /api/issues/:id/acknowledge
// @access  Private (Field Worker, Supervisor, Admin)
const acknowledgeAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action = 'ACKNOWLEDGE', reason = '' } = req.body; // 'ACKNOWLEDGE' or 'REJECT'

    const issue = await Issue.findById(id).populate('department');
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    if (action === 'REJECT') {
      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a reason for rejecting the assignment.'
        });
      }

      issue.status = 'UNDER_REVIEW';
      issue.assignedTo = null;
      await issue.save();

      await Assignment.findOneAndUpdate(
        { issue: issue._id, status: 'PENDING' },
        { status: 'REJECTED', rejectedAt: new Date(), rejectionReason: reason },
        { sort: { createdAt: -1 } }
      );

      await IssueUpdate.create({
        issue: issue._id,
        message: `Assignment rejected by ${req.user.name}. Reason: ${reason}. Status returned to UNDER_REVIEW.`,
        updateType: 'ASSIGNMENT',
        createdBy: req.user._id,
        previousStatus: 'ASSIGNED',
        newStatus: 'UNDER_REVIEW',
        timestamp: new Date()
      });

      await logAudit({
        actor: req.user,
        action: 'ASSIGNMENT_REJECTED',
        entity: 'Issue',
        entityId: issue._id,
        caseId: issue.caseId,
        metadata: { reason },
        ipAddress: req.ip
      });

      return res.status(200).json({
        success: true,
        message: 'Assignment rejected and returned to department queue.',
        data: issue
      });
    }

    // Acknowledge
    const transitionCheck = validateTransition(issue.status, 'ACKNOWLEDGED');
    if (!transitionCheck.valid) {
      return res.status(400).json({ success: false, message: transitionCheck.error });
    }

    issue.status = 'ACKNOWLEDGED';
    issue.acknowledgedAt = new Date();
    await issue.save();

    await Assignment.findOneAndUpdate(
      { issue: issue._id, status: 'PENDING' },
      { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
      { sort: { createdAt: -1 } }
    );

    await IssueUpdate.create({
      issue: issue._id,
      message: `Assignment acknowledged by field worker ${req.user.name}. Ready to commence work.`,
      updateType: 'STATUS_CHANGE',
      createdBy: req.user._id,
      previousStatus: 'ASSIGNED',
      newStatus: 'ACKNOWLEDGED',
      timestamp: new Date()
    });

    await logAudit({
      actor: req.user,
      action: 'ASSIGNMENT_ACKNOWLEDGED',
      entity: 'Issue',
      entityId: issue._id,
      caseId: issue.caseId,
      metadata: { acknowledgedAt: new Date() },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Assignment for ${issue.caseId} acknowledged.`,
      data: issue
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Field worker starts work on site
// @route   POST /api/issues/:id/start
// @access  Private (Field Worker, Supervisor, Admin)
const startWork = async (req, res, next) => {
  try {
    const { id } = req.params;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    const transitionCheck = validateTransition(issue.status, 'IN_PROGRESS');
    if (!transitionCheck.valid) {
      return res.status(400).json({ success: false, message: transitionCheck.error });
    }

    const previousStatus = issue.status;
    issue.status = 'IN_PROGRESS';
    issue.workStartedAt = new Date();
    await issue.save();

    await IssueUpdate.create({
      issue: issue._id,
      message: `Field worker ${req.user.name} arrived at site and commenced work.`,
      updateType: 'STATUS_CHANGE',
      createdBy: req.user._id,
      previousStatus,
      newStatus: 'IN_PROGRESS',
      timestamp: new Date()
    });

    await logAudit({
      actor: req.user,
      action: 'WORK_STARTED',
      entity: 'Issue',
      entityId: issue._id,
      caseId: issue.caseId,
      metadata: { workStartedAt: new Date() },
      ipAddress: req.ip
    });

    // Notify citizen that work has begun
    await createNotification({
      recipient: issue.reportedBy,
      title: `Work Started: ${issue.caseId}`,
      message: `Remediation work for your report "${issue.title}" has begun on site.`,
      type: 'STATUS_CHANGE',
      link: `/issues/${issue._id}`,
      issue: issue._id
    });

    res.status(200).json({
      success: true,
      message: 'Work status updated to IN PROGRESS.',
      data: issue
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add progress update / field note
// @route   POST /api/issues/:id/updates
// @access  Private
const addProgressUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Update message cannot be empty.' });
    }

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.filename,
          path: `/uploads/${file.filename}`,
          mimeType: file.mimetype,
          size: file.size
        });
      });
    }

    const update = await IssueUpdate.create({
      issue: issue._id,
      message: message.trim(),
      updateType: 'PROGRESS',
      createdBy: req.user._id,
      attachments,
      timestamp: new Date()
    });

    await logAudit({
      actor: req.user,
      action: 'PROGRESS_UPDATE_ADDED',
      entity: 'Issue',
      entityId: issue._id,
      caseId: issue.caseId,
      metadata: { message, attachmentsCount: attachments.length },
      ipAddress: req.ip
    });

    const populatedUpdate = await IssueUpdate.findById(update._id).populate('createdBy', 'name role');

    res.status(201).json({
      success: true,
      message: 'Progress update logged successfully.',
      data: populatedUpdate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Field worker submits resolution evidence
// @route   POST /api/issues/:id/resolution
// @access  Private (Field Worker, Supervisor, Admin)
const submitResolution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes, completionRemarks } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    if (!['IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'VERIFICATION_REQUIRED'].includes(issue.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot submit resolution while status is ${issue.status}. Issue must be IN_PROGRESS.`
      });
    }

    // Process uploaded evidence files
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        uploadedImages.push(`/uploads/${file.filename}`);
      });
    }

    // Use initial issue attachments as Before images if not already populated
    let beforeImages = (issue.resolution?.beforeImages && issue.resolution.beforeImages.length > 0)
      ? issue.resolution.beforeImages
      : (issue.attachments || []).map(att => att.path);

    if (beforeImages.length === 0) {
      beforeImages = ['/uploads/before-drain.svg'];
    }

    let afterImages = uploadedImages.length > 0 
      ? uploadedImages 
      : (issue.resolution?.afterImages || []);

    if (req.body.afterImage) afterImages.push(req.body.afterImage);
    if (req.body.afterImages && Array.isArray(req.body.afterImages)) afterImages.push(...req.body.afterImages);

    // Fallback default proof image if testing via plain API request without multipart file
    if (afterImages.length === 0) {
      afterImages = ['/uploads/after-drain.svg'];
    }

    const previousStatus = issue.status;
    issue.status = 'VERIFICATION_REQUIRED'; // Ready for officer inspection
    issue.resolution = {
      notes: notes || 'Work completed on site as per civic standards.',
      completionRemarks: completionRemarks || '',
      beforeImages,
      afterImages,
      submittedBy: req.user._id,
      submittedAt: new Date(),
      verificationStatus: 'PENDING',
      rejectionReason: ''
    };

    await issue.save();

    await IssueUpdate.create({
      issue: issue._id,
      message: `Resolution evidence submitted by ${req.user.name}. Case moved to VERIFICATION_REQUIRED. Note: "${issue.resolution.notes}"`,
      updateType: 'EVIDENCE',
      createdBy: req.user._id,
      previousStatus,
      newStatus: 'VERIFICATION_REQUIRED',
      timestamp: new Date()
    });

    await logAudit({
      actor: req.user,
      action: 'RESOLUTION_SUBMITTED',
      entity: 'Issue',
      entityId: issue._id,
      caseId: issue.caseId,
      metadata: {
        notes: issue.resolution.notes,
        afterImagesCount: afterImages.length
      },
      ipAddress: req.ip
    });

    // Notify Department Head / Officer for Verification
    const dept = await Department.findById(issue.department);
    if (dept && dept.headOfficer) {
      await createNotification({
        recipient: dept.headOfficer,
        title: `Verification Required: ${issue.caseId}`,
        message: `Field worker submitted resolution evidence for ${issue.caseId}. Physical review required.`,
        type: 'RESOLUTION',
        link: `/issues/${issue._id}`,
        issue: issue._id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Resolution evidence submitted. Case is pending officer verification.',
      data: issue
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Officer / Supervisor verifies resolution (Approve or Reject)
// @route   POST /api/issues/:id/verify
// @access  Private (Officer, Supervisor, Admin)
const verifyResolution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body; // action: 'APPROVE' or 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either APPROVE or REJECT.'
      });
    }

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    if (!['VERIFICATION_REQUIRED', 'RESOLUTION_SUBMITTED'].includes(issue.status)) {
      return res.status(400).json({
        success: false,
        message: `Issue is not pending verification (current status: ${issue.status}).`
      });
    }

    const previousStatus = issue.status;

    if (action === 'APPROVE') {
      issue.status = 'RESOLVED';
      issue.resolvedAt = new Date();
      issue.resolution.verificationStatus = 'APPROVED';
      issue.resolution.verifiedBy = req.user._id;
      issue.resolution.verifiedAt = new Date();
      issue.sla.status = 'COMPLETED';

      await issue.save();

      await IssueUpdate.create({
        issue: issue._id,
        message: `Resolution inspected and APPROVED by Officer ${req.user.name}.${remarks ? ` Remarks: "${remarks}"` : ''}`,
        updateType: 'VERIFICATION',
        createdBy: req.user._id,
        previousStatus,
        newStatus: 'RESOLVED',
        timestamp: new Date()
      });

      await logAudit({
        actor: req.user,
        action: 'RESOLUTION_APPROVED',
        entity: 'Issue',
        entityId: issue._id,
        caseId: issue.caseId,
        metadata: { remarks, verifiedBy: req.user.name },
        ipAddress: req.ip
      });

      // Notify citizen for final confirmation
      await createNotification({
        recipient: issue.reportedBy,
        title: `Issue Resolved: ${issue.caseId}`,
        message: `Your issue has been marked RESOLVED after verification. Please confirm if satisfied.`,
        type: 'RESOLUTION',
        link: `/issues/${issue._id}`,
        issue: issue._id
      });

      return res.status(200).json({
        success: true,
        message: `Case ${issue.caseId} marked as RESOLVED. Awaiting citizen confirmation.`,
        data: issue
      });
    }

    if (action === 'REJECT') {
      if (!remarks || remarks.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Please provide detailed rejection remarks explaining why resolution was unsatisfactory.'
        });
      }

      issue.status = 'IN_PROGRESS';
      issue.resolution.verificationStatus = 'REJECTED';
      issue.resolution.rejectionReason = remarks;
      await issue.save();

      await IssueUpdate.create({
        issue: issue._id,
        message: `Resolution REJECTED by Officer ${req.user.name}. Reason: "${remarks}". Case returned to IN_PROGRESS.`,
        updateType: 'VERIFICATION',
        createdBy: req.user._id,
        previousStatus,
        newStatus: 'IN_PROGRESS',
        timestamp: new Date()
      });

      await logAudit({
        actor: req.user,
        action: 'RESOLUTION_REJECTED',
        entity: 'Issue',
        entityId: issue._id,
        caseId: issue.caseId,
        metadata: { remarks, rejectedBy: req.user.name },
        ipAddress: req.ip
      });

      // Notify field worker
      if (issue.assignedTo) {
        await createNotification({
          recipient: issue.assignedTo,
          title: `Resolution Rejected: ${issue.caseId}`,
          message: `Evidence rejected by supervisor: "${remarks}". Additional work required.`,
          type: 'STATUS_CHANGE',
          link: `/issues/${issue._id}`,
          issue: issue._id
        });
      }

      return res.status(200).json({
        success: true,
        message: `Resolution rejected. Case returned to IN_PROGRESS for rectification.`,
        data: issue
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Citizen confirms resolution or reopens issue
// @route   POST /api/issues/:id/confirm
// @access  Private (Citizen reporter or Admin)
const confirmResolution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'CONFIRM' or 'REOPEN'

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    // Only the reporting citizen (or supervisor/admin) can confirm/reopen
    if (
      req.user.role === 'CITIZEN' &&
      String(issue.reportedBy) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only the citizen who originally reported this case can confirm or reopen it.'
      });
    }

    const previousStatus = issue.status;

    if (action === 'CONFIRM') {
      if (!['RESOLVED'].includes(issue.status)) {
        return res.status(400).json({
          success: false,
          message: `Only RESOLVED issues can be closed by citizen (current status: ${issue.status}).`
        });
      }

      issue.status = 'CLOSED';
      issue.closedAt = new Date();
      issue.citizenFeedback = {
        confirmed: true,
        confirmedAt: new Date(),
        reopenReason: ''
      };

      await issue.save();

      await IssueUpdate.create({
        issue: issue._id,
        message: `Citizen confirmed satisfactory resolution. Case officially CLOSED.`,
        updateType: 'STATUS_CHANGE',
        createdBy: req.user._id,
        previousStatus,
        newStatus: 'CLOSED',
        timestamp: new Date()
      });

      await logAudit({
        actor: req.user,
        action: 'ISSUE_CLOSED',
        entity: 'Issue',
        entityId: issue._id,
        caseId: issue.caseId,
        metadata: { closedAt: new Date() },
        ipAddress: req.ip
      });

      return res.status(200).json({
        success: true,
        message: `Case ${issue.caseId} confirmed and closed. Thank you for your feedback!`,
        data: issue
      });
    }

    if (action === 'REOPEN') {
      if (!['RESOLVED', 'CLOSED'].includes(issue.status)) {
        return res.status(400).json({
          success: false,
          message: `Only RESOLVED or CLOSED issues can be reopened.`
        });
      }

      if (!reason || reason.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Please provide a reason explaining why the issue is still not resolved.'
        });
      }

      issue.status = 'REOPENED';
      issue.escalationCount = (issue.escalationCount || 0) + 1;
      issue.citizenFeedback = {
        confirmed: false,
        confirmedAt: new Date(),
        reopenReason: reason.trim()
      };

      // When reopened, SLA is reset to High priority (P2)
      issue.priority = 'P2';
      const { dueAt } = calculateSlaDueDate('P2', null, new Date());
      issue.sla.startedAt = new Date();
      issue.sla.dueAt = dueAt;
      issue.sla.status = 'ON_TRACK';
      issue.sla.breachedAt = null;

      await issue.save();

      // Automatically create an Escalation for supervisor review
      await Escalation.create({
        issue: issue._id,
        reason: `Citizen reopened case after resolution: "${reason.trim()}"`,
        severity: 'HIGH',
        escalatedFrom: req.user._id,
        status: 'ACTIVE'
      });

      await IssueUpdate.create({
        issue: issue._id,
        message: `Citizen flagged problem persists and REOPENED case. Reason: "${reason.trim()}". High priority escalation logged.`,
        updateType: 'REOPEN',
        createdBy: req.user._id,
        previousStatus,
        newStatus: 'REOPENED',
        timestamp: new Date()
      });

      await logAudit({
        actor: req.user,
        action: 'ISSUE_REOPENED',
        entity: 'Issue',
        entityId: issue._id,
        caseId: issue.caseId,
        metadata: { reopenReason: reason.trim() },
        ipAddress: req.ip
      });

      // Notify supervisor
      const dept = await Department.findById(issue.department);
      if (dept && dept.headOfficer) {
        await createNotification({
          recipient: dept.headOfficer,
          title: `CASE REOPENED: ${issue.caseId}`,
          message: `Citizen reported unresolved issue for ${issue.caseId}: "${reason}". Escalation active.`,
          type: 'REOPEN',
          link: `/issues/${issue._id}`,
          issue: issue._id
        });
      }

      return res.status(200).json({
        success: true,
        message: `Case ${issue.caseId} has been reopened and escalated to senior supervisors.`,
        data: issue
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid action provided.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually escalate an issue
// @route   POST /api/issues/:id/escalate
// @access  Private (Officer, Supervisor, Admin)
const escalateIssue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, severity = 'HIGH', escalatedTo } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide an escalation reason.' });
    }

    const issue = await Issue.findById(id).populate('department');
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    const escalation = await Escalation.create({
      issue: issue._id,
      reason: reason.trim(),
      severity,
      escalatedFrom: req.user._id,
      escalatedTo: escalatedTo || issue.department?.headOfficer || null,
      status: 'ACTIVE'
    });

    issue.escalationCount = (issue.escalationCount || 0) + 1;
    await issue.save();

    await IssueUpdate.create({
      issue: issue._id,
      message: `ESCALATION triggered by ${req.user.name}. Reason: "${reason.trim()}". Severity: ${severity}.`,
      updateType: 'ESCALATION',
      createdBy: req.user._id,
      timestamp: new Date()
    });

    await logAudit({
      actor: req.user,
      action: 'ESCALATION_CREATED',
      entity: 'Escalation',
      entityId: escalation._id,
      caseId: issue.caseId,
      metadata: { reason, severity },
      ipAddress: req.ip
    });

    // Notify target supervisor
    if (escalation.escalatedTo) {
      await createNotification({
        recipient: escalation.escalatedTo,
        title: `ESCALATION: ${issue.caseId} (${severity})`,
        message: `Case ${issue.caseId} has been escalated: "${reason}".`,
        type: 'ESCALATION',
        link: `/issues/${issue._id}`,
        issue: issue._id
      });
    }

    res.status(201).json({
      success: true,
      message: `Escalation logged for case ${issue.caseId}.`,
      data: escalation
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  assignIssue,
  acknowledgeAssignment,
  startWork,
  addProgressUpdate,
  submitResolution,
  verifyResolution,
  confirmResolution,
  escalateIssue
};
