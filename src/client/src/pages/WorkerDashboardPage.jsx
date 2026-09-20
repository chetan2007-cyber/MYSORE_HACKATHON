import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Briefcase,
  Wrench,
  CheckCircle2,
  Clock,
  MapPin,
  Camera,
  MessageSquare,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { issueService, workflowService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaBadge from '../components/SlaBadge';
import ResolutionModal from '../components/ResolutionModal';
import { SkeletonCard } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { formatTimeAgo } from '../utils/formatters';

const WorkerDashboardPage = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');
  const navigate = useNavigate();

  const fetchWorkerTasks = useCallback(async () => {
    try {
      setLoading(true);
      setErrorNotice('');
      const res = await issueService.getIssues({ myAssignments: 'true', limit: 50 });
      setIssues(res.data.data || []);
    } catch (err) {
      console.error('Failed to load worker tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkerTasks();
  }, [fetchWorkerTasks]);

  const handleAcknowledge = async (issueId) => {
    try {
      setActionLoading(true);
      await workflowService.acknowledgeAssignment(issueId, { action: 'ACKNOWLEDGE' });
      setSuccessNotice('Assignment acknowledged! Ready to mobilize tools.');
      fetchWorkerTasks();
    } catch (err) {
      setErrorNotice(err.response?.data?.message || 'Failed to acknowledge.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartWork = async (issueId) => {
    try {
      setActionLoading(true);
      await workflowService.startWork(issueId);
      setSuccessNotice('Work started on site. Status updated to IN PROGRESS.');
      fetchWorkerTasks();
    } catch (err) {
      setErrorNotice(err.response?.data?.message || 'Failed to start work.');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingAck = issues.filter(i => i.status === 'ASSIGNED');
  const inProgress = issues.filter(i => ['ACKNOWLEDGED', 'IN_PROGRESS'].includes(i.status));
  const awaitingVerification = issues.filter(i => ['RESOLUTION_SUBMITTED', 'VERIFICATION_REQUIRED'].includes(i.status));

  return (
    <div className="space-y-6">
      {/* Worker Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Field Worker • {user?.department?.name || 'Sanitation Department'}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Good morning, {user?.name?.split(' ')[0] || 'Arun'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Field Worker • {user?.department?.name || 'Sanitation Department'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchWorkerTasks}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Tasks</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
          {successNotice}
        </div>
      )}
      {errorNotice && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
          {errorNotice}
        </div>
      )}

      {/* Quick Status Count Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-cyan-50/50 rounded-lg border border-cyan-200 text-cyan-900">
          <span className="text-[11px] uppercase font-semibold text-cyan-700">New Assignments</span>
          <div className="text-2xl font-bold mt-1">{pendingAck.length}</div>
        </div>
        <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 text-blue-900">
          <span className="text-[11px] uppercase font-semibold text-blue-700">Active On-Site</span>
          <div className="text-2xl font-bold mt-1">{inProgress.length}</div>
        </div>
        <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-200 text-purple-900">
          <span className="text-[11px] uppercase font-semibold text-purple-700">Submitted for Inspection</span>
          <div className="text-2xl font-bold mt-1">{awaitingVerification.length}</div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span>TODAY'S ASSIGNMENTS</span>
          <span className="text-xs font-mono font-normal text-slate-500">({issues.length})</span>
        </h2>

        {loading ? (
          <SkeletonCard count={4} />
        ) : issues.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No assignments today"
            description="All scheduled municipal remediation tasks have been acknowledged or resolved. Great job!"
          />
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div
                key={issue._id}
                className="bg-white rounded-lg border border-slate-200 p-4.5 shadow-2xs hover:border-slate-300 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {issue.caseId}
                      </span>
                      <PriorityBadge priority={issue.priority} showFull />
                      <StatusBadge status={issue.status} />
                      {issue.slaEvaluation && (
                        <SlaBadge slaEvaluation={issue.slaEvaluation} />
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {issue.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {issue.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                      <div>
                        <span className="font-medium text-slate-600">Assigned:</span>{' '}
                        <span className="font-mono text-slate-700">
                          {new Date(issue.updatedAt || issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {issue.slaEvaluation && (
                        <div>
                          <span className="font-medium text-slate-600">SLA:</span>{' '}
                          <span className="font-mono font-semibold text-slate-800">
                            {issue.slaEvaluation.label || 'On Track'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Explicit Action Buttons matching Section 10 */}
                  <div className="flex flex-wrap sm:flex-col items-stretch sm:items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/issues/${issue._id}`}
                        className="px-2.5 py-1.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition"
                      >
                        View Case
                      </Link>

                      <Link
                        to={`/map?lat=${issue.location?.coordinates?.[1] || 12.3}&lng=${issue.location?.coordinates?.[0] || 76.65}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                      >
                        <MapPin className="w-3 h-3 text-brand-600" />
                        <span>Navigate</span>
                      </Link>
                    </div>

                    {issue.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleAcknowledge(issue._id)}
                        disabled={actionLoading}
                        className="w-full sm:w-auto px-3.5 py-1.5 rounded text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 transition shadow-xs"
                      >
                        Acknowledge
                      </button>
                    )}

                    {issue.status === 'ACKNOWLEDGED' && (
                      <button
                        onClick={() => handleStartWork(issue._id)}
                        disabled={actionLoading}
                        className="w-full sm:w-auto px-3.5 py-1.5 rounded text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow-xs"
                      >
                        Start Work
                      </button>
                    )}

                    {issue.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => {
                          setSelectedIssue(issue);
                          setShowResolutionModal(true);
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 transition shadow-xs"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Submit Resolution</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{issue.location?.address} ({issue.location?.ward})</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    SLA Target: {new Date(issue.sla?.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedIssue && (
        <ResolutionModal
          isOpen={showResolutionModal}
          onClose={() => {
            setShowResolutionModal(false);
            setSelectedIssue(null);
          }}
          issue={selectedIssue}
          onSuccess={() => {
            setSuccessNotice('Resolution evidence successfully submitted for verification!');
            fetchWorkerTasks();
          }}
        />
      )}
    </div>
  );
};

export default WorkerDashboardPage;
