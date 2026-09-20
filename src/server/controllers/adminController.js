const crypto = require('crypto');
const User = require('../models/User');
const Department = require('../models/Department');
const Issue = require('../models/Issue');
const Escalation = require('../models/Escalation');
const { logAudit } = require('../services/auditService');
const { sendStaffInvitationEmail } = require('../services/emailService');
const env = require('../config/env');

// @desc    Get all municipal staff members
// @route   GET /api/admin/staff
// @access  Private (Admin only)
const getStaffMembers = async (req, res, next) => {
  try {
    const staff = await User.find({
      role: { $in: ['FIELD_WORKER', 'OFFICER', 'SUPERVISOR', 'ADMIN'] }
    })
      .select('-password')
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: staff.length,
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Invite a new municipal staff member
// @route   POST /api/admin/staff
// @access  Private (Admin only)
const inviteStaffMember = async (req, res, next) => {
  try {
    const { name, email, phone, department, role } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and staff role are required.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanRole = role.toUpperCase();

    // Only allow provisioning staff roles
    const allowedStaffRoles = ['FIELD_WORKER', 'OFFICER', 'SUPERVISOR'];
    if (!allowedStaffRoles.includes(cleanRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid staff role. Permitted roles: ${allowedStaffRoles.join(', ')}`
      });
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `A user account with email '${cleanEmail}' already exists (Status: ${existingUser.status || existingUser.accountStatus}).`
      });
    }

    // Lookup department if provided
    let departmentDoc = null;
    if (department) {
      departmentDoc = await Department.findById(department);
    }

    // Generate secure 64-char hex invitation setup token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const newStaff = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      role: cleanRole,
      department: departmentDoc ? departmentDoc._id : null,
      status: 'INVITED',
      accountStatus: 'INVITED',
      isVerified: true, // Staff identity is pre-verified by administering authority
      invitationToken,
      invitationExpiresAt
    });

    const clientBaseUrl = env.clientUrl;
    const setupUrl = `${clientBaseUrl}/staff/setup/${invitationToken}`;

    // Dispatch invitation email
    await sendStaffInvitationEmail({
      to: newStaff.email,
      name: newStaff.name,
      role: newStaff.role,
      departmentName: departmentDoc?.name || null,
      setupUrl
    });

    await logAudit({
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'STAFF_MEMBER_INVITED',
      entity: 'User',
      entityId: newStaff._id,
      metadata: {
        email: newStaff.email,
        role: newStaff.role,
        department: departmentDoc?.name
      },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: `Staff invitation issued to ${newStaff.email}`,
      data: {
        id: newStaff._id,
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        department: departmentDoc ? { id: departmentDoc._id, name: departmentDoc.name, code: departmentDoc.code } : null,
        status: newStaff.status,
        invitationExpiresAt: newStaff.invitationExpiresAt
      },
      setupUrl // Provided in response for seamless development & demonstration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update staff status or details
// @route   PATCH /api/admin/staff/:id
// @access  Private (Admin only)
const updateStaffMember = async (req, res, next) => {
  try {
    const { status, department, phone } = req.body;
    const staff = await User.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found.'
      });
    }

    if (status && ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
      staff.status = status;
      staff.accountStatus = status;
      staff.isActive = status === 'ACTIVE';
    }

    if (department !== undefined) {
      staff.department = department || null;
    }

    if (phone !== undefined) {
      staff.phone = phone.trim();
    }

    await staff.save();

    await logAudit({
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'STAFF_MEMBER_UPDATED',
      entity: 'User',
      entityId: staff._id,
      metadata: { status: staff.status },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Staff member updated successfully.',
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend invitation setup link
// @route   POST /api/admin/staff/:id/resend-invitation
// @access  Private (Admin only)
const resendStaffInvitation = async (req, res, next) => {
  try {
    const staff = await User.findById(req.params.id).populate('department');

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found.'
      });
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    staff.invitationToken = invitationToken;
    staff.invitationExpiresAt = invitationExpiresAt;
    staff.status = 'INVITED';
    staff.accountStatus = 'INVITED';
    await staff.save();

    const clientBaseUrl = env.clientUrl;
    const setupUrl = `${clientBaseUrl}/staff/setup/${invitationToken}`;

    await sendStaffInvitationEmail({
      to: staff.email,
      name: staff.name,
      role: staff.role,
      departmentName: staff.department?.name,
      setupUrl
    });

    res.status(200).json({
      success: true,
      message: `Invitation resent to ${staff.email}`,
      setupUrl
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get admin system overview stats
// @route   GET /api/admin/overview
// @access  Private (Admin only)
const getAdminOverview = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalCitizens,
      totalWorkers,
      totalOfficers,
      totalSupervisors,
      totalAdmins,
      openIssues,
      slaBreachedIssues,
      activeEscalations,
      departments
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'CITIZEN' }),
      User.countDocuments({ role: 'FIELD_WORKER' }),
      User.countDocuments({ role: 'OFFICER' }),
      User.countDocuments({ role: 'SUPERVISOR' }),
      User.countDocuments({ role: 'ADMIN' }),
      Issue.countDocuments({ status: { $nin: ['CLOSED'] } }),
      Issue.countDocuments({ 'sla.isBreached': true, status: { $nin: ['CLOSED'] } }),
      Escalation.countDocuments({ status: { $ne: 'RESOLVED' } }),
      Department.find().select('name code')
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          citizens: totalCitizens,
          workers: totalWorkers,
          officers: totalOfficers,
          supervisors: totalSupervisors,
          admins: totalAdmins
        },
        caseload: {
          open: openIssues,
          slaBreached: slaBreachedIssues,
          activeEscalations
        },
        departments
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStaffMembers,
  inviteStaffMember,
  updateStaffMember,
  resendStaffInvitation,
  getAdminOverview
};
