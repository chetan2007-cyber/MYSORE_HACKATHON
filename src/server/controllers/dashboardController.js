const Issue = require('../models/Issue');
const IssueUpdate = require('../models/IssueUpdate');
const Escalation = require('../models/Escalation');
const { evaluateSlaStatus } = require('../services/slaService');

// @desc    Get operational dashboard metrics & attention queue
// @route   GET /api/dashboard
// @access  Private (Officer, Supervisor, Admin, Field Worker)
const getDashboardMetrics = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Fetch all active issues to evaluate real-time dynamic SLAs
    const activeIssues = await Issue.find({
      status: { $ne: 'CLOSED' }
    })
      .populate('department', 'name code')
      .populate('assignedTo', 'name email')
      .populate('reportedBy', 'name phone')
      .lean();

    let openIssues = activeIssues.length;
    let unassigned = 0;
    let inProgress = 0;
    let awaitingVerification = 0;
    let slaAtRisk = 0;
    let slaBreached = 0;

    activeIssues.forEach(issue => {
      // Status categories
      if (['REPORTED', 'UNDER_REVIEW'].includes(issue.status)) {
        unassigned++;
      } else if (['ACKNOWLEDGED', 'IN_PROGRESS'].includes(issue.status)) {
        inProgress++;
      } else if (['RESOLUTION_SUBMITTED', 'VERIFICATION_REQUIRED'].includes(issue.status)) {
        awaitingVerification++;
      }

      // Dynamic SLA evaluation
      const slaEval = evaluateSlaStatus(issue);
      if (slaEval.status === 'BREACHED') {
        slaBreached++;
      } else if (slaEval.status === 'AT_RISK') {
        slaAtRisk++;
      }
    });

    // Count resolved today
    const resolvedToday = await Issue.countDocuments({
      status: { $in: ['RESOLVED', 'CLOSED'] },
      resolvedAt: { $gte: startOfToday }
    });

    // Active escalations count
    const activeEscalations = await Escalation.countDocuments({ status: 'ACTIVE' });

    // Cases requiring immediate operational attention
    // Priority: SLA Breached > SLA At Risk > Verification Required > Unassigned
    const attentionIssues = activeIssues
      .map(issue => {
        const slaEval = evaluateSlaStatus(issue);
        return {
          ...issue,
          slaEvaluation: slaEval
        };
      })
      .filter(issue => {
        return (
          issue.slaEvaluation.status === 'BREACHED' ||
          issue.slaEvaluation.status === 'AT_RISK' ||
          ['RESOLUTION_SUBMITTED', 'VERIFICATION_REQUIRED'].includes(issue.status) ||
          ['REPORTED', 'UNDER_REVIEW'].includes(issue.status) ||
          issue.status === 'REOPENED'
        );
      })
      .sort((a, b) => {
        // Sort breached first, then at risk, then priority P1 -> P4
        const scoreA = (a.slaEvaluation.status === 'BREACHED' ? 100 : a.slaEvaluation.status === 'AT_RISK' ? 50 : 10) +
                       (a.priority === 'P1' ? 40 : a.priority === 'P2' ? 30 : a.priority === 'P3' ? 20 : 10);
        const scoreB = (b.slaEvaluation.status === 'BREACHED' ? 100 : b.slaEvaluation.status === 'AT_RISK' ? 50 : 10) +
                       (b.priority === 'P1' ? 40 : b.priority === 'P2' ? 30 : b.priority === 'P3' ? 20 : 10);
        return scoreB - scoreA;
      })
      .slice(0, 10);

    // Recent system activity log
    const recentActivity = await IssueUpdate.find()
      .populate('createdBy', 'name role')
      .populate('issue', 'caseId title priority status')
      .sort({ timestamp: -1 })
      .limit(8)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          openIssues,
          unassigned,
          inProgress,
          awaitingVerification,
          slaAtRisk,
          slaBreached,
          resolvedToday,
          activeEscalations
        },
        attentionRequired: attentionIssues,
        recentActivity
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics
};
