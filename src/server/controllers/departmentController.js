const Department = require('../models/Department');
const Issue = require('../models/Issue');
const { evaluateSlaStatus } = require('../services/slaService');

// @desc    Get all departments with live performance metrics aggregated from MongoDB
// @route   GET /api/departments
// @access  Private
const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('headOfficer', 'name email phone')
      .lean();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const enrichedDepartments = await Promise.all(
      departments.map(async (dept) => {
        // Find all issues for this department
        const allIssues = await Issue.find({ department: dept._id }).lean();

        let openCount = 0;
        let inProgressCount = 0;
        let atRiskCount = 0;
        let breachedCount = 0;
        let resolvedTodayCount = 0;
        let totalResolvedCount = 0;
        let totalResolutionHours = 0;
        let compliantResolvedCount = 0;

        allIssues.forEach((issue) => {
          if (issue.status !== 'CLOSED') {
            openCount++;
          }

          if (['ACKNOWLEDGED', 'IN_PROGRESS'].includes(issue.status)) {
            inProgressCount++;
          }

          const slaEval = evaluateSlaStatus(issue);
          if (['REPORTED', 'UNDER_REVIEW', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'VERIFICATION_REQUIRED', 'REOPENED'].includes(issue.status)) {
            if (slaEval.status === 'BREACHED') breachedCount++;
            if (slaEval.status === 'AT_RISK') atRiskCount++;
          }

          if (['RESOLVED', 'CLOSED'].includes(issue.status)) {
            totalResolvedCount++;
            if (issue.resolvedAt && issue.resolvedAt >= startOfToday) {
              resolvedTodayCount++;
            }

            if (issue.resolvedAt && issue.createdAt) {
              const diffHours = (new Date(issue.resolvedAt) - new Date(issue.createdAt)) / (1000 * 60 * 60);
              totalResolutionHours += diffHours;
            }

            // Compliance check: was it resolved before sla.dueAt?
            if (issue.resolvedAt && issue.sla?.dueAt && new Date(issue.resolvedAt) <= new Date(issue.sla.dueAt)) {
              compliantResolvedCount++;
            }
          }
        });

        const avgResolutionHours = totalResolvedCount > 0 
          ? (totalResolutionHours / totalResolvedCount).toFixed(1) 
          : '0.0';

        const complianceRate = totalResolvedCount > 0
          ? Math.round((compliantResolvedCount / totalResolvedCount) * 100)
          : 100;

        return {
          ...dept,
          metrics: {
            totalIssues: allIssues.length,
            openIssues: openCount,
            inProgress: inProgressCount,
            slaAtRisk: atRiskCount,
            slaBreached: breachedCount,
            resolvedToday: resolvedTodayCount,
            totalResolved: totalResolvedCount,
            avgResolutionHours: Number(avgResolutionHours),
            complianceRate
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedDepartments.length,
      data: enrichedDepartments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single department with its active cases
// @route   GET /api/departments/:id
// @access  Private
const getDepartmentById = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('headOfficer', 'name email phone')
      .lean();

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const issues = await Issue.find({ department: department._id })
      .populate('assignedTo', 'name email phone')
      .populate('reportedBy', 'name phone')
      .sort({ createdAt: -1 })
      .lean();

    const issuesWithSla = issues.map(issue => ({
      ...issue,
      slaEvaluation: evaluateSlaStatus(issue)
    }));

    res.status(200).json({
      success: true,
      data: {
        department,
        issues: issuesWithSla
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDepartments,
  getDepartmentById
};
