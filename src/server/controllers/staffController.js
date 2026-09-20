const User = require('../models/User');
const Issue = require('../models/Issue');
const Escalation = require('../models/Escalation');
const Department = require('../models/Department');
const { generateToken, sendTokenResponse } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

// @desc    Validate staff setup token
// @route   GET /api/staff/invitation/:token
// @access  Public
const getInvitationDetails = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invitation token is missing.'
      });
    }

    const staff = await User.findOne({ invitationToken: token }).populate('department', 'name code');

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'This staff invitation link is invalid or has already been completed.'
      });
    }

    if (staff.invitationExpiresAt && new Date() > new Date(staff.invitationExpiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'This invitation link has expired. Please ask your CivicTrack administrator to re-issue the invitation.'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        department: staff.department ? { id: staff.department._id, name: staff.department.name, code: staff.department.code } : null,
        status: staff.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete staff onboarding and establish password
// @route   POST /api/staff/invitation/:token/complete
// @access  Public
const completeStaffSetup = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invitation token is required.'
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    const staff = await User.findOne({ invitationToken: token }).populate('department');

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invitation token or account already activated.'
      });
    }

    if (staff.invitationExpiresAt && new Date() > new Date(staff.invitationExpiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'This invitation setup link has expired. Please contact an administrator.'
      });
    }

    // Set password and activate
    staff.password = password;
    staff.status = 'ACTIVE';
    staff.accountStatus = 'ACTIVE';
    staff.isVerified = true;
    staff.isActive = true;
    staff.invitationToken = null;
    staff.invitationExpiresAt = null;
    staff.lastLoginAt = new Date();
    await staff.save();

    await logAudit({
      actor: staff._id,
      actorName: staff.name,
      actorRole: staff.role,
      action: 'STAFF_SETUP_COMPLETED',
      entity: 'User',
      entityId: staff._id,
      metadata: { email: staff.email, role: staff.role },
      ipAddress: req.ip
    });

    return sendTokenResponse(staff, 200, res, 'Account successfully activated. Welcome to the CivicTrack operations team.');
  } catch (error) {
    next(error);
  }
};

// @desc    Get Field Worker's assigned cases
// @route   GET /api/worker/assignments
// @access  Private (Field Worker, Officer, Supervisor, Admin)
const getWorkerAssignments = async (req, res, next) => {
  try {
    const workerId = req.user._id;

    // Find issues assigned to this specific worker
    const assignedIssues = await Issue.find({
      assignedTo: workerId,
      status: { $nin: ['CLOSED'] }
    })
      .populate('department', 'name code')
      .populate('reportedBy', 'name phone')
      .populate('assignedTo', 'name phone email')
      .sort({ 'priority': 1, 'sla.dueAt': 1 });

    res.status(200).json({
      success: true,
      count: assignedIssues.length,
      data: assignedIssues
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Officer operational triage overview
// @route   GET /api/officer/issues
// @access  Private (Officer, Supervisor, Admin)
const getOfficerIssues = async (req, res, next) => {
  try {
    const userDept = req.user.department;
    const query = { status: { $nin: ['CLOSED'] } };
    if (userDept && req.user.role === 'OFFICER') {
      query.department = userDept;
    }

    const [unassigned, pendingVerification, atRisk, inProgress] = await Promise.all([
      // Unassigned cases
      Issue.find({ ...query, status: { $in: ['REPORTED', 'UNDER_REVIEW'] }, assignedTo: null })
        .populate('department', 'name code')
        .populate('reportedBy', 'name')
        .sort({ priority: 1, createdAt: -1 })
        .limit(25),
      // Verification required
      Issue.find({ ...query, status: 'VERIFICATION_REQUIRED' })
        .populate('department', 'name code')
        .populate('assignedTo', 'name phone')
        .sort({ 'sla.resolutionDue': 1 })
        .limit(25),
      // At risk or breached
      Issue.find({ ...query, $or: [{ 'sla.status': 'BREACHED' }, { 'sla.status': 'AT_RISK' }] })
        .populate('department', 'name code')
        .populate('assignedTo', 'name phone')
        .sort({ 'sla.resolutionDue': 1 })
        .limit(25),
      // Active in progress
      Issue.find({ ...query, status: { $in: ['ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS'] } })
        .populate('department', 'name code')
        .populate('assignedTo', 'name phone')
        .sort({ 'sla.resolutionDue': 1 })
        .limit(25)
    ]);

    res.status(200).json({
      success: true,
      data: {
        unassigned,
        pendingVerification,
        atRisk,
        inProgress,
        counts: {
          unassigned: unassigned.length,
          pendingVerification: pendingVerification.length,
          atRisk: atRisk.length,
          inProgress: inProgress.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Supervisor department capacity and escalation overview
// @route   GET /api/supervisor/overview
// @access  Private (Supervisor, Admin)
const getSupervisorOverview = async (req, res, next) => {
  try {
    const userDept = req.user.department;
    const deptQuery = userDept ? { department: userDept } : {};

    const [workers, activeEscalations, deptCases, deptInfo] = await Promise.all([
      // Field workers in this department with their active assignment counts
      User.find({ role: 'FIELD_WORKER', isActive: true, ...deptQuery })
        .select('name email phone department')
        .populate('department', 'name code'),
      // Active escalations
      Escalation.find({ status: { $ne: 'RESOLVED' } })
        .populate({
          path: 'issue',
          populate: [
            { path: 'department', select: 'name code' },
            { path: 'assignedTo', select: 'name' }
          ]
        })
        .populate('escalatedFrom', 'name role')
        .sort({ createdAt: -1 }),
      // Issues in department
      Issue.find({ ...deptQuery, status: { $nin: ['CLOSED'] } })
        .populate('department', 'name code')
        .populate('assignedTo', 'name')
        .sort({ 'sla.resolutionDue': 1 }),
      // Department details
      userDept ? Department.findById(userDept) : null
    ]);

    // Calculate active assignments per worker
    const workerWorkloads = await Promise.all(
      workers.map(async (worker) => {
        const count = await Issue.countDocuments({
          assignedTo: worker._id,
          status: { $in: ['ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS'] }
        });
        return {
          id: worker._id,
          name: worker.name,
          email: worker.email,
          phone: worker.phone,
          department: worker.department,
          activeAssignments: count
        };
      })
    );

    const breachedCount = deptCases.filter((c) => c.sla?.isBreached).length;
    const atRiskCount = deptCases.filter((c) => c.sla?.status === 'AT_RISK').length;

    res.status(200).json({
      success: true,
      data: {
        department: deptInfo,
        stats: {
          totalActiveCases: deptCases.length,
          breachedCount,
          atRiskCount,
          activeEscalationsCount: activeEscalations.length,
          totalFieldWorkers: workers.length
        },
        workerWorkloads,
        activeEscalations,
        activeCases: deptCases.slice(0, 20)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvitationDetails,
  completeStaffSetup,
  getWorkerAssignments,
  getOfficerIssues,
  getSupervisorOverview
};
