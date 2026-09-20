const Issue = require('../models/Issue');
const Department = require('../models/Department');
const IssueUpdate = require('../models/IssueUpdate');
const Assignment = require('../models/Assignment');
const Escalation = require('../models/Escalation');
const AuditLog = require('../models/AuditLog');
const { generateCaseId } = require('../utils/caseIdGenerator');
const { calculateSlaDueDate, evaluateSlaStatus } = require('../services/slaService');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { validateFileSignatures, cleanUploadedFiles } = require('../utils/fileSignatureValidator');
const { checkAbusiveContent } = require('../utils/contentModerator');

// @desc    Create a new civic issue
// @route   POST /api/issues
// @access  Private (Citizen, Officer, Admin)
const createIssue = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      address,
      ward,
      landmark,
      lat,
      lng,
      priority = 'P3',
      departmentId
    } = req.body;

    // 1. Required fields check
    if (!title || !description || !category || !address || !ward) {
      cleanUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title, description, category, address, ward.'
      });
    }

    // 2. Abusive text check (title and description)
    const titleCheck = checkAbusiveContent(title);
    const descCheck = checkAbusiveContent(description);
    if (!titleCheck.isClean || !descCheck.isClean) {
      cleanUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        code: 'ABUSIVE_CONTENT',
        message: 'Please remove abusive language from the report description.',
        field: !descCheck.isClean ? 'description' : 'title'
      });
    }

    // 3. Location coordinate bounds check
    let latitude;
    let longitude;
    if (lat !== undefined && lat !== null && lat !== '') {
      latitude = Number(lat);
      if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        cleanUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          code: 'INVALID_LOCATION',
          message: 'Invalid location. Coordinates must be valid latitude (-90 to 90) and longitude (-180 to 180).',
          field: 'coordinates'
        });
      }
    } else {
      latitude = 12.3051; // Mysuru default fallback if completely omitted
    }

    if (lng !== undefined && lng !== null && lng !== '') {
      longitude = Number(lng);
      if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        cleanUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          code: 'INVALID_LOCATION',
          message: 'Invalid location. Coordinates must be valid latitude (-90 to 90) and longitude (-180 to 180).',
          field: 'coordinates'
        });
      }
    } else {
      longitude = 76.6551;
    }

    // 4. File binary magic-byte validation
    if (req.files && req.files.length > 0) {
      const sigValidation = validateFileSignatures(req.files);
      if (!sigValidation.isValid) {
        cleanUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          code: 'INVALID_IMAGE_FILE',
          message: 'Invalid image file. The uploaded file does not match a valid image signature (JPEG, PNG, WebP).',
          field: 'attachments',
          details: sigValidation.reason
        });
      }
    }

    // 5. Idempotent retry check: if the exact same idempotency key is retransmitted
    const rawIdempotencyKey = req.headers['x-idempotency-key'] || req.headers['idempotency-key'] || req.body.idempotencyKey;
    const idempotencyKey = typeof rawIdempotencyKey === 'string' && rawIdempotencyKey.trim() !== '' ? rawIdempotencyKey.trim() : null;

    if (idempotencyKey) {
      const existing = await Issue.findOne({ idempotencyKey })
        .populate('department', 'name code')
        .populate('reportedBy', 'name email phone');

      if (existing) {
        cleanUploadedFiles(req.files);
        return res.status(200).json({
          success: true,
          message: 'Your issue has been registered successfully.',
          data: existing,
          isDuplicate: true
        });
      }
    }

    // 6. Duplicate report check: same user submitting same title, category, and ward within 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const escapedTitle = title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const duplicateIssue = await Issue.findOne({
      reportedBy: req.user._id,
      'location.ward': ward,
      category,
      status: { $ne: 'REJECTED' },
      createdAt: { $gte: twentyFourHoursAgo },
      title: { $regex: new RegExp(`^\\s*${escapedTitle}\\s*$`, 'i') }
    });

    if (duplicateIssue) {
      cleanUploadedFiles(req.files);
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_REPORT',
        message: 'Duplicate report detected. This report was already submitted.',
        existingCaseId: duplicateIssue.caseId
      });
    }

    // Attempt to auto-map department by category if not explicitly provided
    let department = null;
    if (departmentId) {
      department = await Department.findById(departmentId);
    } else {
      const categoryDeptMap = {
        'Sanitation & Waste': 'SAN',
        'Roads & Infrastructure': 'ROA',
        'Drainage & Sewage': 'DRA',
        'Streetlights & Electrical': 'ELE',
        'Water Supply': 'DRA',
        'Public Health & Safety': 'SAN'
      };
      const deptCode = categoryDeptMap[category] || 'SAN';
      department = await Department.findOne({ code: deptCode });
    }

    const caseId = await generateCaseId();
    const { dueAt } = calculateSlaDueDate(priority, department, new Date());

    // Process uploaded attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.filename,
          path: `/uploads/${file.filename}`,
          mimeType: file.mimetype,
          size: file.size,
          uploadedBy: req.user._id,
          uploadedAt: new Date()
        });
      });
    }

    let issue;
    try {
      issue = await Issue.create({
        caseId,
        idempotencyKey: idempotencyKey || undefined,
        title,
        description,
        category,
        location: {
          address,
          ward,
          landmark: landmark || '',
          coordinates: {
            lat: latitude,
            lng: longitude
          }
        },
        reportedBy: req.user._id,
        department: department ? department._id : null,
        priority,
        status: 'REPORTED',
        sla: {
          startedAt: new Date(),
          dueAt,
          status: 'ON_TRACK'
        },
        attachments
      });
    } catch (createErr) {
      // Race-condition fallback: If a concurrent request inserted this idempotency key milliseconds earlier
      if (idempotencyKey && (createErr.code === 11000 || createErr.message?.includes('idempotencyKey'))) {
        const existing = await Issue.findOne({ idempotencyKey })
          .populate('department', 'name code')
          .populate('reportedBy', 'name email phone');
        if (existing) {
          cleanUploadedFiles(req.files);
          return res.status(200).json({
            success: true,
            message: 'Your issue has been registered successfully.',
            data: existing,
            isDuplicate: true
          });
        }
      }
      throw createErr;
    }

    // Record initial timeline event
    await IssueUpdate.create({
      issue: issue._id,
      message: `Issue reported by ${req.user.name} (${req.user.role}) via citizen portal.`,
      updateType: 'STATUS_CHANGE',
      createdBy: req.user._id,
      previousStatus: null,
      newStatus: 'REPORTED',
      timestamp: new Date()
    });

    // Record audit log
    await logAudit({
      actor: req.user,
      action: 'ISSUE_CREATED',
      entity: 'Issue',
      entityId: issue._id,
      caseId: issue.caseId,
      metadata: {
        category: issue.category,
        priority: issue.priority,
        department: department ? department.name : 'Unassigned',
        address: issue.location.address
      },
      ipAddress: req.ip
    });

    // Send notification to department head if assigned
    if (department && department.headOfficer) {
      await createNotification({
        recipient: department.headOfficer,
        title: `New Case Registered: ${issue.caseId}`,
        message: `A new ${issue.priority} case has been reported: "${issue.title}".`,
        type: 'STATUS_CHANGE',
        link: `/issues/${issue._id}`,
        issue: issue._id
      });
    }

    const populated = await Issue.findById(issue._id)
      .populate('department', 'name code')
      .populate('reportedBy', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Your issue has been registered successfully.',
      data: populated
    });
  } catch (error) {
    cleanUploadedFiles(req.files);
    next(error);
  }
};

// @desc    Get all issues with filters, search and pagination
// @route   GET /api/issues
// @access  Private
const getIssues = async (req, res, next) => {
  try {
    const {
      search,
      status,
      priority,
      department,
      assignedTo,
      slaStatus,
      category,
      myReports,
      myAssignments,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 15
    } = req.query;

    const query = {};

    // Citizen view: filter to own reports if myReports=true or user is CITIZEN
    if (req.user.role === 'CITIZEN' || myReports === 'true') {
      query.reportedBy = req.user._id;
    }

    // Field Worker view: show their assignments
    if (myAssignments === 'true' || (req.user.role === 'FIELD_WORKER' && !req.query.all)) {
      query.assignedTo = req.user._id;
    }

    // Specific filters
    if (status) {
      query.status = status;
    }
    if (priority) {
      query.priority = priority;
    }
    if (department) {
      query.department = department;
    }
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    if (category) {
      query.category = category;
    }

    // Text search
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { caseId: regex },
        { title: regex },
        { description: regex },
        { 'location.address': regex },
        { 'location.ward': regex }
      ];
    }

    const currentPage = parseInt(page, 10) || 1;
    const pageLimit = parseInt(limit, 10) || 15;
    const skip = (currentPage - 1) * pageLimit;

    const sortOptions = {};
    const order = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'sla') {
      sortOptions['sla.dueAt'] = order;
    } else {
      sortOptions[sortBy] = order;
    }

    const totalIssues = await Issue.countDocuments(query);

    let issues = await Issue.find(query)
      .populate('department', 'name code')
      .populate('reportedBy', 'name email phone')
      .populate('assignedTo', 'name email phone')
      .sort(sortOptions)
      .skip(skip)
      .limit(pageLimit)
      .lean();

    // Dynamically calculate and attach live SLA evaluation to each issue
    issues = issues.map(issue => {
      const slaEval = evaluateSlaStatus(issue);
      return {
        ...issue,
        slaEvaluation: slaEval
      };
    });

    // Post-filter by SLA status if requested (since status is computed dynamically)
    if (slaStatus) {
      issues = issues.filter(issue => issue.slaEvaluation.status === slaStatus);
    }

    res.status(200).json({
      success: true,
      count: issues.length,
      total: totalIssues,
      totalPages: Math.ceil(totalIssues / pageLimit),
      currentPage,
      data: issues
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single issue details with complete history
// @route   GET /api/issues/:id
// @access  Private
const getIssueById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Search by ObjectId or caseId
    let query = {};
    if (id.startsWith('CT-')) {
      query = { caseId: id };
    } else {
      query = { _id: id };
    }

    const issue = await Issue.findOne(query)
      .populate('department', 'name code slaHours headOfficer')
      .populate('reportedBy', 'name email phone role')
      .populate('assignedTo', 'name email phone role')
      .populate('resolution.submittedBy', 'name email role')
      .populate('resolution.verifiedBy', 'name email role')
      .lean();

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Civic issue not found.'
      });
    }

    // Attach dynamic SLA status evaluation
    const slaEvaluation = evaluateSlaStatus(issue);

    // Fetch chronological timeline updates
    const updates = await IssueUpdate.find({ issue: issue._id })
      .populate('createdBy', 'name role')
      .sort({ timestamp: 1 })
      .lean();

    // Fetch assignments history
    const assignments = await Assignment.find({ issue: issue._id })
      .populate('assignedTo', 'name email phone')
      .populate('assignedBy', 'name role')
      .populate('department', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch escalations
    const escalations = await Escalation.find({ issue: issue._id })
      .populate('escalatedFrom', 'name role')
      .populate('escalatedTo', 'name role')
      .populate('resolvedBy', 'name role')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch audit history for this case (visible to supervisor, officer, admin)
    let auditTrail = [];
    if (['SUPERVISOR', 'ADMIN', 'OFFICER'].includes(req.user.role)) {
      auditTrail = await AuditLog.find({
        $or: [{ entityId: issue._id }, { caseId: issue.caseId }]
      })
        .populate('actor', 'name role')
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();
    }

    res.status(200).json({
      success: true,
      data: {
        ...issue,
        slaEvaluation,
        timeline: updates,
        assignments,
        escalations,
        auditTrail
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update priority or department of an issue
// @route   PATCH /api/issues/:id
// @access  Private (Officer, Supervisor, Admin)
const updateIssue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { priority, departmentId, title, description } = req.body;

    const issue = await Issue.findById(id).populate('department');
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found.'
      });
    }

    const changes = {};

    if (priority && priority !== issue.priority) {
      const oldPriority = issue.priority;
      issue.priority = priority;
      changes.priority = { from: oldPriority, to: priority };

      // Recalculate SLA based on new priority
      const { dueAt } = calculateSlaDueDate(priority, issue.department, issue.sla.startedAt);
      issue.sla.dueAt = dueAt;

      await IssueUpdate.create({
        issue: issue._id,
        message: `Priority changed from ${oldPriority} to ${priority} by ${req.user.name}.`,
        updateType: 'STATUS_CHANGE',
        createdBy: req.user._id,
        timestamp: new Date()
      });
    }

    if (departmentId && String(departmentId) !== String(issue.department?._id)) {
      const oldDeptName = issue.department?.name || 'Unassigned';
      const newDept = await Department.findById(departmentId);
      if (newDept) {
        issue.department = newDept._id;
        changes.department = { from: oldDeptName, to: newDept.name };

        await IssueUpdate.create({
          issue: issue._id,
          message: `Department reassigned from ${oldDeptName} to ${newDept.name} by ${req.user.name}.`,
          updateType: 'ASSIGNMENT',
          createdBy: req.user._id,
          timestamp: new Date()
        });
      }
    }

    if (title) issue.title = title;
    if (description) issue.description = description;

    await issue.save();

    await logAudit({
      actor: req.user,
      action: 'ISSUE_UPDATED',
      entity: 'Issue',
      entityId: issue._id,
      caseId: issue.caseId,
      metadata: changes,
      ipAddress: req.ip
    });

    const updated = await Issue.findById(issue._id)
      .populate('department', 'name code')
      .populate('assignedTo', 'name email phone');

    res.status(200).json({
      success: true,
      message: 'Issue updated successfully.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue
};
