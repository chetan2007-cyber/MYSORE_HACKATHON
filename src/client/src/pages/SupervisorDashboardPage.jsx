import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  AlertTriangle,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Building2,
  ExternalLink,
  UserCheck,
  RotateCcw,
  FileText
} from 'lucide-react';
import { supervisorService, escalationService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaBadge from '../components/SlaBadge';
import AssignModal from '../components/AssignModal';
import { formatTimeAgo } from '../utils/formatters';

const SupervisorDashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState({
    department: null,
    metrics: {
      openCases: 0,
      inProgress: 0,
      slaAtRisk: 0,
      slaBreached: 0,
      resolvedToday: 0
    },
    activeEscalations: [],
    workerWorkload: [],
    departmentCases: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [selectedEscalation, setSelectedEscalation] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveAction, setResolveAction] = useState('RESOLVED');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [reassignIssue, setReassignIssue] = useState(null);

  const fetchSupervisorData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await supervisorService.getOverview();
      const payload = res.data?.data || res.data || {};

      setData({
        department: payload.department || null,
        metrics: {
          openCases: payload.metrics?.openCases ?? payload.stats?.totalActiveCases ?? 0,
          inProgress: payload.metrics?.inProgress ?? 0,
          slaAtRisk: payload.metrics?.slaAtRisk ?? payload.stats?.atRiskCount ?? 0,
          slaBreached: payload.metrics?.slaBreached ?? payload.stats?.breachedCount ?? 0,
          resolvedToday: payload.metrics?.resolvedToday ?? 0
        },
        activeEscalations: payload.activeEscalations || [],
        workerWorkload: payload.workerWorkload || payload.workerWorkloads || [],
        departmentCases: payload.departmentCases || payload.activeCases || []
      });
    } catch (err) {
      console.error('Failed to load supervisor overview:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSupervisorData();
  }, [fetchSupervisorData]);

  const handleActionSuccess = () => {
    setSelectedEscalation(null);
    setReassignIssue(null);
    fetchSupervisorData();
  };

  // 1. Error State
  if (error && !data.department && data.departmentCases.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-rose-200 p-6 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">
            Supervisor data couldn't be loaded.
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Unable to connect to the supervisor overview API. Check that the Express server and MongoDB are running.
          </p>

          <div className="mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded text-left font-mono text-[11px] text-slate-600">
            <div><strong>Endpoint:</strong> GET /api/supervisor/overview</div>
            <div><strong>Status:</strong> {error.response?.status || 'Network / Connection Error'}</div>
            {error.response?.data?.message && (
              <div className="text-rose-600 mt-1"><strong>Error:</strong> {error.response.data.message}</div>
            )}
          </div>

          <button
            type="button"
            onClick={fetchSupervisorData}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Loading Skeleton
  if (loading && !data.department && data.departmentCases.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex justify-between items-center">
          <div className="space-y-2">
            <div className="w-32 h-4 bg-slate-200 rounded" />
            <div className="w-48 h-6 bg-slate-300 rounded" />
            <div className="w-72 h-3 bg-slate-100 rounded" />
          </div>
          <div className="w-24 h-8 bg-slate-200 rounded" />
        </div>

        {/* Top 5 Metrics Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-white border border-slate-200 h-24 flex flex-col justify-between">
              <div className="w-20 h-3 bg-slate-200 rounded" />
              <div className="w-12 h-6 bg-slate-300 rounded font-mono" />
              <div className="w-28 h-2 bg-slate-100 rounded" />
            </div>
          ))}
        </div>

        {/* Content Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg border border-slate-200 h-64" />
          <div className="bg-white p-4 rounded-lg border border-slate-200 h-64" />
        </div>
      </div>
    );
  }

  const deptName = data.department?.name || user?.department?.name || 'Sanitation Department';

  return (
    <div className="space-y-6">
      {/* Header matching Section 16 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Supervisor Portal
            </span>
            <span className="text-xs font-semibold text-slate-700">
              • {deptName}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Supervisor Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor workload, SLA performance and unresolved civic issues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSupervisorData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
            title="Refresh overview"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/escalations"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition shadow-2xs"
          >
            <span>Escalations Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Top 5 Metrics matching Section 16 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Open Cases */}
        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600">Open Cases</span>
            <FileText className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
            {data.metrics.openCases}
          </div>
          <span className="text-[10px] text-slate-400">Total active in dept</span>
        </div>

        {/* In Progress */}
        <div className="p-3.5 rounded-lg bg-white border border-sky-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-sky-700">In Progress</span>
            <Clock className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-sky-800 font-mono mt-1">
            {data.metrics.inProgress}
          </div>
          <span className="text-[10px] text-sky-600">Active field work</span>
        </div>

        {/* SLA At Risk */}
        <div className="p-3.5 rounded-lg bg-white border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-800">SLA At Risk</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-800 font-mono mt-1">
            {data.metrics.slaAtRisk}
          </div>
          <span className="text-[10px] text-amber-700 font-medium">&lt;25% window left</span>
        </div>

        {/* SLA Breached */}
        <div className="p-3.5 rounded-lg bg-white border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-700">SLA Breached</span>
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700 font-mono mt-1">
            {data.metrics.slaBreached}
          </div>
          <span className="text-[10px] text-rose-600 font-medium">Overdue resolution</span>
        </div>

        {/* Resolved Today */}
        <div className="p-3.5 rounded-lg bg-white border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700">Resolved Today</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 font-mono mt-1">
            {data.metrics.resolvedToday}
          </div>
          <span className="text-[10px] text-emerald-600">Completed remediation</span>
        </div>
      </div>

      {/* Active Escalations matching Section 17 */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Active Escalations ({data.activeEscalations.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Direct Supervisor Action Required</span>
        </div>

        {data.activeEscalations.length === 0 ? (
          <div className="py-8 px-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
            <div className="text-xs font-bold text-slate-800">No active escalations</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              All current department cases are within the escalation threshold.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Case</th>
                  <th className="px-4 py-2.5">Reason</th>
                  <th className="px-4 py-2.5">Assigned Worker</th>
                  <th className="px-4 py-2.5">Age</th>
                  <th className="px-4 py-2.5">SLA</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.activeEscalations.map((esc) => {
                  const issue = esc.issue;
                  const isBreached = issue?.sla?.isBreached || issue?.sla?.status === 'BREACHED';
                  return (
                    <tr key={esc._id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-900">
                          {issue?.caseId || 'Issue'}
                        </span>
                        <div className="text-[11px] text-slate-600 truncate max-w-[180px]">
                          {issue?.title}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          {esc.reason?.replace('_', ' ') || 'Resolution Overdue'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {issue?.assignedTo?.name || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        {formatTimeAgo(esc.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                            isBreached ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isBreached ? 'BREACHED' : 'AT RISK'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedEscalation(esc)}
                            className="px-2.5 py-1 rounded text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 transition"
                          >
                            Resolve
                          </button>
                          {issue?._id && (
                            <Link
                              to={`/issues/${issue._id}`}
                              className="px-2.5 py-1 rounded text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
                            >
                              Review
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Field Worker Workload matching Section 18 */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Field Worker Workload
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Department Capacity</span>
        </div>

        {data.workerWorkload.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No field workers currently assigned to this department.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[550px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Worker</th>
                  <th className="px-4 py-2.5 text-center">Assigned</th>
                  <th className="px-4 py-2.5 text-center">In Progress</th>
                  <th className="px-4 py-2.5 text-center">Completed</th>
                  <th className="px-4 py-2.5 text-center">SLA At Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.workerWorkload.map((w) => (
                  <tr key={w.id || w._id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{w.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{w.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {w.assigned || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        {w.inProgress || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {w.completed || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded ${
                          w.slaAtRisk > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {w.slaAtRisk || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Department Cases Queue matching Section 19 */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Department Cases ({data.departmentCases.length})
            </h3>
          </div>
          <Link
            to="/issues"
            className="text-[11px] font-medium text-brand-600 hover:text-brand-800 flex items-center gap-1"
          >
            <span>View All</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {data.departmentCases.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No cases currently assigned to this department.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Case ID</th>
                  <th className="px-4 py-2.5">Issue</th>
                  <th className="px-4 py-2.5">Priority</th>
                  <th className="px-4 py-2.5">Assigned To</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">SLA</th>
                  <th className="px-4 py-2.5">Updated</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.departmentCases.map((issue) => (
                  <tr key={issue._id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3">
                      <Link
                        to={`/issues/${issue._id}`}
                        className="font-mono font-bold text-brand-700 hover:underline"
                      >
                        {issue.caseId}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 truncate max-w-[200px]">
                        {issue.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {issue.location?.address}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={issue.priority} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {issue.assignedTo?.name || (
                        <span className="text-amber-700 font-medium">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={issue.status} />
                    </td>
                    <td className="px-4 py-3">
                      {issue.slaEvaluation ? (
                        <SlaBadge slaEvaluation={issue.slaEvaluation} />
                      ) : (
                        <span className="font-mono text-[10px] text-slate-400">
                          {issue.sla?.dueAt ? new Date(issue.sla.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {formatTimeAgo(issue.updatedAt || issue.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setReassignIssue(issue)}
                          className="px-2 py-1 rounded text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200"
                          title="Assign or reassign field worker"
                        >
                          Reassign
                        </button>
                        <Link
                          to={`/issues/${issue._id}`}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                          title="Full detail"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolve Escalation Modal */}
      {selectedEscalation && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-600" />
              <span>Supervisor Escalation Action</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Case: <strong className="font-mono text-slate-800">{selectedEscalation.issue?.caseId}</strong> - {selectedEscalation.issue?.title}
            </p>

            {resolveError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {resolveError}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (resolveAction === 'RESOLVED' && !resolveNotes.trim()) {
                  setResolveError('Please provide supervisor resolution notes.');
                  return;
                }
                try {
                  setResolving(true);
                  setResolveError('');
                  await escalationService.resolveEscalation(selectedEscalation._id, {
                    resolutionNotes: resolveNotes.trim(),
                    status: resolveAction
                  });
                  setSelectedEscalation(null);
                  setResolveNotes('');
                  fetchSupervisorData();
                } catch (err) {
                  setResolveError(err.response?.data?.message || 'Failed to update escalation.');
                } finally {
                  setResolving(false);
                }
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Action *
                </label>
                <select
                  value={resolveAction}
                  onChange={(e) => setResolveAction(e.target.value)}
                  className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800"
                >
                  <option value="RESOLVED">Resolve &amp; Close Escalation</option>
                  <option value="ACKNOWLEDGED">Acknowledge &amp; Monitor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supervisor Instructions &amp; Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="Direct field crew re-allocation, priority adjustment, or operational notes..."
                  className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEscalation(null);
                    setResolveError('');
                  }}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50"
                >
                  {resolving ? 'Submitting...' : 'Record Supervisor Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Worker Modal */}
      {reassignIssue && (
        <AssignModal
          isOpen={Boolean(reassignIssue)}
          onClose={() => setReassignIssue(null)}
          issue={reassignIssue}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
};

export default SupervisorDashboardPage;
