import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  Clock,
  FileText,
  ArrowRight,
  Loader2,
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { officerService, workflowService, authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaBadge from '../components/SlaBadge';
import AssignModal from '../components/AssignModal';
import VerificationModal from '../components/VerificationModal';

const OfficerDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [triageData, setTriageData] = useState({
    unassigned: [],
    pendingVerification: [],
    atRisk: [],
    inProgress: [],
    counts: { unassigned: 0, pendingVerification: 0, atRisk: 0, inProgress: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('unassigned'); // unassigned | pending | at_risk

  // Modal actions
  const [assignIssue, setAssignIssue] = useState(null);
  const [verifyIssue, setVerifyIssue] = useState(null);

  const fetchOfficerData = async () => {
    try {
      setLoading(true);
      const res = await officerService.getIssues();
      setTriageData(res.data.data);
    } catch (err) {
      console.error('Failed to load officer triage cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficerData();
  }, []);

  const handleActionSuccess = () => {
    setAssignIssue(null);
    setVerifyIssue(null);
    fetchOfficerData();
  };

  return (
    <div className="space-y-6">
      {/* Officer Operational Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
              Operations Officer Portal
            </span>
            {user?.department?.name && (
              <span className="text-xs text-slate-500 font-medium">
                • {user.department.name}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Operational Triage &amp; Casework Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review incoming citizen reports, assign field crews, enforce SLA compliance, and verify physical resolutions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOfficerData}
            disabled={loading}
            className="p-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh triage data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/issues"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
          >
            <span>Global Case Registry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab('unassigned')}
          className={`p-3.5 rounded-lg border cursor-pointer transition ${
            activeTab === 'unassigned'
              ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Unassigned Cases</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {triageData.counts.unassigned}
          </div>
          <span className="text-[11px] text-amber-700 font-medium">Requires worker dispatch</span>
        </div>

        <div
          onClick={() => setActiveTab('pending')}
          className={`p-3.5 rounded-lg border cursor-pointer transition ${
            activeTab === 'pending'
              ? 'bg-purple-50/60 border-purple-300 ring-1 ring-purple-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Pending Verification</span>
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {triageData.counts.pendingVerification}
          </div>
          <span className="text-[11px] text-purple-700 font-medium">Proof submitted by worker</span>
        </div>

        <div
          onClick={() => setActiveTab('at_risk')}
          className={`p-3.5 rounded-lg border cursor-pointer transition ${
            activeTab === 'at_risk'
              ? 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">SLA At Risk / Breached</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {triageData.counts.atRisk}
          </div>
          <span className="text-[11px] text-rose-700 font-medium">Urgent attention needed</span>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">In Progress On Site</span>
            <UserCheck className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {triageData.counts.inProgress}
          </div>
          <span className="text-[11px] text-slate-500">Crews currently deployed</span>
        </div>
      </div>

      {/* Triage Workspace Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="flex border-b border-slate-200 px-4 bg-slate-50/60">
          <button
            onClick={() => setActiveTab('unassigned')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'unassigned'
                ? 'border-brand-600 text-brand-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Unassigned Cases</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-100 text-amber-800">
              {triageData.counts.unassigned}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'border-brand-600 text-brand-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Pending Evidence Verification</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-100 text-purple-800">
              {triageData.counts.pendingVerification}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('at_risk')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'at_risk'
                ? 'border-brand-600 text-brand-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>SLA Warnings &amp; Breaches</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-100 text-rose-800">
              {triageData.counts.atRisk}
            </span>
          </button>
        </div>

        {/* Tab Content List */}
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
              <span className="text-xs text-slate-500">Loading cases...</span>
            </div>
          ) : activeTab === 'unassigned' ? (
            triageData.unassigned.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No unassigned cases in this department. All clear!
              </div>
            ) : (
              triageData.unassigned.map((issue) => (
                <div key={issue._id} className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{issue.caseId}</span>
                      <PriorityBadge priority={issue.priority} />
                      <SlaBadge issue={issue} />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 truncate">{issue.title}</h4>
                    <p className="text-[11px] text-slate-500">
                      {issue.location?.ward || 'Mysuru'} • Reported by {issue.reportedBy?.name || 'Citizen'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setAssignIssue(issue)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
                    >
                      Assign Worker
                    </button>
                    <Link
                      to={`/issues/${issue._id}`}
                      className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      title="Inspect full case details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))
            )
          ) : activeTab === 'pending' ? (
            triageData.pendingVerification.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No cases awaiting verification approval.
              </div>
            ) : (
              triageData.pendingVerification.map((issue) => (
                <div key={issue._id} className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{issue.caseId}</span>
                      <StatusBadge status={issue.status} />
                      <PriorityBadge priority={issue.priority} />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 truncate">{issue.title}</h4>
                    <p className="text-[11px] text-purple-700 font-medium">
                      Resolution proof submitted by {issue.assignedTo?.name || 'Field Worker'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setVerifyIssue(issue)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 transition"
                    >
                      Verify Proof
                    </button>
                    <Link
                      to={`/issues/${issue._id}`}
                      className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))
            )
          ) : (
            triageData.atRisk.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Zero SLA breaches or at-risk cases in this department. Excellent performance!
              </div>
            ) : (
              triageData.atRisk.map((issue) => (
                <div key={issue._id} className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{issue.caseId}</span>
                      <StatusBadge status={issue.status} />
                      <SlaBadge issue={issue} />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 truncate">{issue.title}</h4>
                    <p className="text-[11px] text-slate-500">
                      Assigned: {issue.assignedTo?.name || 'Unassigned'} • Due: {issue.sla?.dueAt ? new Date(issue.sla.dueAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setAssignIssue(issue)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200"
                    >
                      Reassign
                    </button>
                    <Link
                      to={`/issues/${issue._id}`}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
                    >
                      Open Case
                    </Link>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Action Modals */}
      {assignIssue && (
        <AssignModal
          isOpen={true}
          issue={assignIssue}
          onClose={() => setAssignIssue(null)}
          onSuccess={handleActionSuccess}
        />
      )}

      {verifyIssue && (
        <VerificationModal
          isOpen={true}
          issue={verifyIssue}
          onClose={() => setVerifyIssue(null)}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
};

export default OfficerDashboardPage;
