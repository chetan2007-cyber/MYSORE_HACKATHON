const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const Department = require('../models/Department');

// @desc    Get system-wide analytics using real MongoDB aggregations
// @route   GET /api/analytics
// @access  Private (Officer, Supervisor, Admin)
const getAnalytics = async (req, res, next) => {
  try {
    // 1. Issues grouped by category
    const byCategory = await Issue.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          resolvedCount: {
            $sum: { $cond: [{ $in: ['$status', ['RESOLVED', 'CLOSED']] }, 1, 0] }
          },
          openCount: {
            $sum: { $cond: [{ $ne: ['$status', 'CLOSED'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 2. Issues grouped by Priority
    const byPriority = await Issue.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Issues grouped by Status
    const byStatus = await Issue.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 4. Issues grouped by Department
    const byDepartment = await Issue.aggregate([
      {
        $group: {
          _id: '$department',
          totalIssues: { $sum: 1 },
          resolvedIssues: {
            $sum: { $cond: [{ $in: ['$status', ['RESOLVED', 'CLOSED']] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      {
        $unwind: {
          path: '$departmentInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ['$departmentInfo.name', 'Unassigned'] },
          code: { $ifNull: ['$departmentInfo.code', 'UNAS'] },
          totalIssues: 1,
          resolvedIssues: 1
        }
      },
      { $sort: { totalIssues: -1 } }
    ]);

    // 5. Overall resolution time & SLA compliance
    const resolvedIssues = await Issue.find({
      status: { $in: ['RESOLVED', 'CLOSED'] },
      resolvedAt: { $ne: null }
    }).select('createdAt resolvedAt sla');

    let totalResolutionHours = 0;
    let compliantCount = 0;

    resolvedIssues.forEach(issue => {
      const diffHours = (new Date(issue.resolvedAt) - new Date(issue.createdAt)) / (1000 * 60 * 60);
      totalResolutionHours += diffHours;

      if (issue.sla?.dueAt && new Date(issue.resolvedAt) <= new Date(issue.sla.dueAt)) {
        compliantCount++;
      }
    });

    const avgResolutionHours = resolvedIssues.length > 0
      ? (totalResolutionHours / resolvedIssues.length).toFixed(1)
      : '0.0';

    const slaComplianceRate = resolvedIssues.length > 0
      ? Math.round((compliantCount / resolvedIssues.length) * 100)
      : 100;

    // 6. 7-Day Trend (Reported vs Resolved)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trendData = await Issue.aggregate([
      {
        $facet: {
          reported: [
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
              }
            }
          ],
          resolved: [
            { $match: { resolvedAt: { $gte: sevenDaysAgo } } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$resolvedAt' } },
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    // Format 7-day timeline array
    const dateLabels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      const displayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateLabels.push({ date: str, label: displayLabel });
    }

    const reportedMap = (trendData[0]?.reported || []).reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const resolvedMap = (trendData[0]?.resolved || []).reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const timelineTrends = dateLabels.map(item => ({
      date: item.date,
      label: item.label,
      reported: reportedMap[item.date] || 0,
      resolved: resolvedMap[item.date] || 0
    }));

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCases: await Issue.countDocuments(),
          totalResolved: resolvedIssues.length,
          avgResolutionHours: Number(avgResolutionHours),
          slaComplianceRate
        },
        byCategory,
        byPriority,
        byStatus,
        byDepartment,
        timelineTrends
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics
};
