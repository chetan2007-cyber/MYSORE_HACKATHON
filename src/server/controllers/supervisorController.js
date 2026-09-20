const Issue = require('../models/Issue');
const User = require('../models/User');
const Department = require('../models/Department');
const Escalation = require('../models/Escalation');

// @desc    Get Supervisor Department Overview & Metrics
// @route   GET /api/supervisor/overview
// @access  Private (Supervisor, Admin)
const getSupervisorOverview = async (req, res, next) => {
  try {
    let departmentId = req.user.department?._id || req.user.department;

    // If Admin without explicit department, pick the first department or allow query
    if (!departmentId && req.user.role === 'ADMIN') {
      if (req.query.departmentId) {
        departmentId = req.query.departmentId;
      } else {
        const firstDept = await Department.findOne();
        departmentId = firstDept?._id;
      }
    }

    const deptQuery = departmentId ? { department: departmentId } : {};

    // 1. Fetch Department Details
    const deptInfo = departmentId ? await Department.findById(departmentId) : null;

    // 2. Fetch Issues belonging to this department
    const allDeptIssues = await Issue.find(deptQuery)
      .populate('department', 'name code')
      .populate('assignedTo', 'name phone email')
      .populate('reportedBy', 'name phone email')
      .sort({ 'sla.resolutionDue': 1, createdAt: -1 });

    const openStatuses = [
      'REPORTED',
      'UNDER_REVIEW',
      'ASSIGNED',
      'ACKNOWLEDGED',
      'IN_PROGRESS',
      'RESOLUTION_SUBMITTED',
      'VERIFICATION_REQUIRED',
      'REOPENED'
    ];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Calculate live metrics from MongoDB documents
    const openCases = allDeptIssues.filter((i) => openStatuses.includes(i.status)).length;
    const inProgressCases = allDeptIssues.filter((i) => ['ACKNOWLEDGED', 'IN_PROGRESS'].includes(i.status)).length;
    const slaAtRiskCases = allDeptIssues.filter((i) => i.sla?.status === 'AT_RISK').length;
    const slaBreachedCases = allDeptIssues.filter((i) => i.sla?.isBreached || i.sla?.status === 'BREACHED').length;
    const resolvedToday = allDeptIssues.filter((i) => {
      const isResolved = ['RESOLVED', 'CLOSED'].includes(i.status);
      const resolvedAt = i.resolutionEvidence?.submittedAt || i.updatedAt;
      return isResolved && resolvedAt && new Date(resolvedAt) >= todayStart;
    }).length;

    // 3. Fetch Active Escalations for this department
    const escalationQuery = { status: { $ne: 'RESOLVED' } };
    const rawEscalations = await Escalation.find(escalationQuery)
      .populate({
        path: 'issue',
        populate: [
          { path: 'department', select: 'name code' },
          { path: 'assignedTo', select: 'name phone' }
        ]
      })
      .populate('escalatedFrom', 'name role')
      .sort({ createdAt: -1 });

    // Filter escalations for this department if applicable
    const activeEscalations = rawEscalations.filter((esc) => {
      if (!departmentId) return true;
      const escDeptId = esc.issue?.department?._id || esc.issue?.department;
      return escDeptId && escDeptId.toString() === departmentId.toString();
    });

    // 4. Fetch Field Workers and calculate live workload
    const workers = await User.find({
      role: 'FIELD_WORKER',
      isActive: true,
      ...deptQuery
    }).select('name email phone department');

    const workerWorkload = await Promise.all(
      workers.map(async (worker) => {
        const workerIssues = allDeptIssues.filter(
          (i) => i.assignedTo?._id?.toString() === worker._id.toString() || i.assignedTo?.toString() === worker._id.toString()
        );

        const assignedCount = workerIssues.filter((i) => i.status === 'ASSIGNED').length;
        const inProgressCount = workerIssues.filter((i) => ['ACKNOWLEDGED', 'IN_PROGRESS'].includes(i.status)).length;
        const completedCount = workerIssues.filter((i) => ['RESOLVED', 'CLOSED'].includes(i.status)).length;
        const atRiskCount = workerIssues.filter((i) => i.sla?.status === 'AT_RISK' || i.sla?.isBreached).length;

        return {
          id: worker._id,
          _id: worker._id,
          name: worker.name,
          email: worker.email,
          phone: worker.phone,
          department: worker.department,
          assigned: assignedCount,
          inProgress: inProgressCount,
          completed: completedCount,
          slaAtRisk: atRiskCount,
          activeAssignments: assignedCount + inProgressCount
        };
      })
    );

    const activeDeptCases = allDeptIssues.filter((i) => i.status !== 'CLOSED');

    res.status(200).json({
      success: true,
      department: deptInfo
        ? {
            id: deptInfo._id,
            _id: deptInfo._id,
            name: deptInfo.name,
            code: deptInfo.code
          }
        : { id: null, name: 'Municipal Operations' },
      metrics: {
        openCases,
        inProgress: inProgressCases,
        slaAtRisk: slaAtRiskCases,
        slaBreached: slaBreachedCases,
        resolvedToday
      },
      stats: {
        totalActiveCases: activeDeptCases.length,
        breachedCount: slaBreachedCases,
        atRiskCount: slaAtRiskCases,
        activeEscalationsCount: activeEscalations.length,
        totalFieldWorkers: workers.length
      },
      activeEscalations,
      workerWorkload,
      workerWorkloads: workerWorkload,
      departmentCases: activeDeptCases.slice(0, 30),
      activeCases: activeDeptCases.slice(0, 30),
      recentCases: activeDeptCases.slice(0, 10),
      data: {
        department: deptInfo,
        metrics: {
          openCases,
          inProgress: inProgressCases,
          slaAtRisk: slaAtRiskCases,
          slaBreached: slaBreachedCases,
          resolvedToday
        },
        stats: {
          totalActiveCases: activeDeptCases.length,
          breachedCount: slaBreachedCases,
          atRiskCount: slaAtRiskCases,
          activeEscalationsCount: activeEscalations.length,
          totalFieldWorkers: workers.length
        },
        activeEscalations,
        workerWorkload,
        workerWorkloads: workerWorkload,
        departmentCases: activeDeptCases.slice(0, 30),
        activeCases: activeDeptCases.slice(0, 30),
        recentCases: activeDeptCases.slice(0, 10)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSupervisorOverview
};
