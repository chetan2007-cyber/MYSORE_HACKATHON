import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  FolderOpen,
  UserX,
  Wrench,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Eye,
  Activity
} from 'lucide-react';
import { dashboardService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaBadge from '../components/SlaBadge';
import { SkeletonCard, SkeletonTable } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { formatTimeAgo } from '../utils/formatters';

const DashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL', 'BREACHED', 'AT_RISK', 'VERIFICATION', 'UNASSIGNED'
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getMetrics();
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const metrics = data?.metrics || {};
  const attentionCases = (data?.attentionRequired || []).filter((issue) => {
    if (filterMode === 'BREACHED') return issue.slaEvaluation?.status === 'BREACHED';
    if (filterMode === 'AT_RISK') return issue.slaEvaluation?.status === 'AT_RISK';
    if (filterMode === 'VERIFICATION') {
      return ['RESOLUTION_SUBMITTED', 'VERIFICATION_REQUIRED'].includes(issue.status);
    }
    if (filterMode === 'UNASSIGNED') {
      return ['REPORTED', 'UNDER_REVIEW'].includes(issue.status);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Operations Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Good morning, {user?.name?.split(' ')[0] || 'Officer'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operations overview • 20 September 2026
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/issues"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition shadow-xs"
          >
            <span>All Issues</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Operational Metrics Grid */}
      {loading && !data ? (
        <SkeletonCard count={7} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <MetricCard
            label="Open Issues"
            value={metrics.openIssues}
            icon={FolderOpen}
            variant="default"
            onClick={() => navigate('/issues')}
          />
          <MetricCard
            label="Unassigned"
            value={metrics.unassigned}
            icon={UserX}
            variant={metrics.unassigned > 0 ? 'warning' : 'default'}
            onClick={() => setFilterMode('UNASSIGNED')}
          />
          <MetricCard
            label="In Progress"
            value={metrics.inProgress}
            icon={Wrench}
            variant="primary"
            onClick={() => navigate('/issues?status=IN_PROGRESS')}
          />
          <MetricCard
            label="Awaiting Verif."
            value={metrics.awaitingVerification}
            icon={CheckCircle2}
            variant="primary"
            onClick={() => setFilterMode('VERIFICATION')}
          />
          <MetricCard
            label="SLA At Risk"
            value={metrics.slaAtRisk}
            icon={Clock}
            variant={metrics.slaAtRisk > 0 ? 'warning' : 'default'}
            onClick={() => setFilterMode('AT_RISK')}
          />
          <MetricCard
            label="SLA Breached"
            value={metrics.slaBreached}
            icon={AlertTriangle}
            variant={metrics.slaBreached > 0 ? 'danger' : 'default'}
            onClick={() => setFilterMode('BREACHED')}
          />
          <MetricCard
            label="Resolved Today"
            value={metrics.resolvedToday}
            icon={CheckCircle2}
            variant="success"
            onClick={() => navigate('/issues?status=RESOLVED')}
          />
        </div>
      )}

      {/* Cases Requiring Attention Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Cases Requiring Immediate Operational Attention
            </h2>
            <p className="text-[11px] text-slate-500">
              Prioritized by SLA breach status, deadline proximity, and pending triage.
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Attention' },
              { id: 'BREACHED', label: `Breached (${metrics.slaBreached || 0})` },
              { id: 'AT_RISK', label: `At Risk (${metrics.slaAtRisk || 0})` },
              { id: 'VERIFICATION', label: `Needs Verification (${metrics.awaitingVerification || 0})` },
              { id: 'UNASSIGNED', label: `Unassigned (${metrics.unassigned || 0})` }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition ${
                  filterMode === f.id
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dense Table */}
        <div className="overflow-x-auto">
          {loading && !data ? (
            <SkeletonTable rows={6} cols={7} />
          ) : attentionCases.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No critical attention cases"
              description="No civic issues currently meet this critical triage condition. All assignments and deadlines are on schedule."
            />
          ) : (
            <table className="w-full min-w-[750px] text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3.5">Case ID</th>
                  <th className="py-2.5 px-3.5">Issue Title</th>
                  <th className="py-2.5 px-3.5">Priority</th>
                  <th className="py-2.5 px-3.5">Department</th>
                  <th className="py-2.5 px-3.5">Assigned To</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">SLA Countdown</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attentionCases.map((issue) => (
                  <tr
                    key={issue._id}
                    onClick={() => navigate(`/issues/${issue._id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {issue.caseId}
                    </td>
                    <td className="py-2.5 px-3.5 max-w-xs truncate">
                      <div className="font-semibold text-slate-800 truncate" title={issue.title}>
                        {issue.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {issue.location?.ward || issue.location?.address}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <PriorityBadge priority={issue.priority} />
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-600">
                      {issue.department?.name || (
                        <span className="text-amber-700 font-medium">Unassigned</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      {issue.assignedTo?.name ? (
                        <span className="text-slate-700">{issue.assignedTo.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">None assigned</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <StatusBadge status={issue.status} />
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <SlaBadge slaEvaluation={issue.slaEvaluation} />
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800">
                        View <ArrowRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Operational Feed */}
      {data?.recentActivity && data.recentActivity.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recent System & Field Activity
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {data.recentActivity.map((act) => (
              <div
                key={act._id}
                onClick={() => act.issue?._id && navigate(`/issues/${act.issue._id}`)}
                className="py-2.5 flex items-start justify-between gap-3 text-xs hover:bg-slate-50 rounded px-2 -mx-2 cursor-pointer transition"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {act.issue?.caseId && (
                      <span className="font-mono font-bold text-slate-900">
                        {act.issue.caseId}
                      </span>
                    )}
                    <span className="text-slate-500">•</span>
                    <span className="font-medium text-slate-700">
                      {act.createdBy?.name || 'System'}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{act.message}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {formatTimeAgo(act.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
