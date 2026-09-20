const AuditLog = require('../models/AuditLog');

// @desc    Get audit trail with filters and pagination
// @route   GET /api/audit-logs
// @access  Private (Supervisor, Admin)
const getAuditLogs = async (req, res, next) => {
  try {
    const { action, actorRole, caseId, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (action) {
      query.action = action;
    }
    if (actorRole) {
      query.actorRole = actorRole;
    }
    if (caseId) {
      query.caseId = new RegExp(caseId.trim(), 'i');
    }

    if (search && search.trim() !== '') {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [
        { caseId: reg },
        { action: reg },
        { actorName: reg },
        { actorRole: reg }
      ];
    }

    const currentPage = parseInt(page, 10) || 1;
    const pageLimit = parseInt(limit, 10) || 20;
    const skip = (currentPage - 1) * pageLimit;

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('actor', 'name email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean();

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      totalPages: Math.ceil(total / pageLimit),
      currentPage,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs
};
