import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Building2,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Camera,
  UserCheck,
  Wrench,
  AlertOctagon,
  FileCheck,
  RotateCcw,
  ShieldCheck,
  Paperclip,
  Check
} from 'lucide-react';
import { issueService, workflowService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaBadge from '../components/SlaBadge';
import CaseTimeline from '../components/CaseTimeline';
import EvidenceViewer from '../components/EvidenceViewer';
import AssignModal from '../components/AssignModal';
import ResolutionModal from '../components/ResolutionModal';
import VerificationModal from '../components/VerificationModal';
import CitizenFeedbackModal from '../components/CitizenFeedbackModal';
import EscalationModal from '../components/EscalationModal';
import { SkeletonTimeline } from '../components/SkeletonLoader';
import { formatDateTime, formatDate, formatTimeAgo } from '../utils/formatters';

const IssueDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isCitizen, isWorker, canManage, canOversee } = useAuth();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);

  // Quick progress update input
  const [updateText, setUpdateText] = useState('');

  const fetchCaseDetails = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const res = await issueService.getIssueById(id);
      setIssue(res.data.data);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to load case details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCaseDetails();
  }, [fetchCaseDetails]);

  // Handle Field Worker Acknowledge
  const handleAcknowledge = async () => {
    try {
      setActionLoading(true);
      await workflowService.acknowledgeAssignment(issue._id, { action: 'ACKNOWLEDGE' });
      setSuccessMessage('Assignment acknowledged. Status updated.');
      fetchCaseDetails();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to acknowledge assignment.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Field Worker Start Work
  const handleStartWork = async () => {
    try {
      setActionLoading(true);
      await workflowService.startWork(issue._id);
      setSuccessMessage('Work started on site. Status updated to IN PROGRESS.');
      fetchCaseDetails();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to start work.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Progress Update
  const handleSendProgressUpdate = async (e) => {
    e.preventDefault();
    if (!updateText.trim()) return;

    try {
      setActionLoading(true);
      const formData = new FormData();
      formData.append('message', updateText.trim());
      await workflowService.addProgressUpdate(issue._id, formData);
      setUpdateText('');
      setSuccessMessage('Progress update recorded to case timeline.');
      fetchCaseDetails();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to post update.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !issue) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-28 bg-slate-100 rounded-lg border border-slate-200 animate-pulse" />
        <SkeletonTimeline count={5} />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-base font-bold text-slate-800">Case Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          The requested civic issue does not exist or has been deleted.
        </p>
        <Link
          to="/issues"
          className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-md"
        >
          Return to Case List
        </Link>
      </div>
    );
  }

  // Permissions & condition flags
  const isAssignedWorker =
    isWorker && String(issue.assignedTo?._id) === String(user?._id);

  const canWorkerAcknowledge =
    (isAssignedWorker || canManage) && issue.status === 'ASSIGNED';

  const canWorkerStart =
    (isAssignedWorker || canManage) && issue.status === 'ACKNOWLEDGED';

  const canWorkerSubmitResolution =
    (isAssignedWorker || canManage) && issue.status === 'IN_PROGRESS';

  const canOfficerVerify =
    canManage &&
    ['VERIFICATION_REQUIRED', 'RESOLUTION_SUBMITTED'].includes(issue.status);

  const canCitizenConfirm =
    (isCitizen || canManage) && issue.status === 'RESOLVED';

  const canAssign =
    canManage &&
    ['REPORTED', 'UNDER_REVIEW', 'REOPENED', 'ASSIGNED'].includes(issue.status);

  const canEscalate =
    canManage && !['RESOLVED', 'CLOSED'].includes(issue.status);

  return (
    <div className="space-y-6">
      {/* Back button & status message */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono">
            Updated {formatTimeAgo(issue.updatedAt)}
          </span>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* CASE HEADER BLOCK */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {issue.caseId}
              </span>
              <PriorityBadge priority={issue.priority} showFull />
              <StatusBadge status={issue.status} />
              {issue.slaEvaluation && (
                <SlaBadge slaEvaluation={issue.slaEvaluation} />
              )}
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight pt-1">
              {issue.title}
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
              {issue.description}
            </p>
          </div>

          {/* Operational Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canAssign && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{issue.assignedTo ? 'Reassign' : 'Assign Worker'}</span>
              </button>
            )}

            {canWorkerAcknowledge && (
              <button
                onClick={handleAcknowledge}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Acknowledge Assignment</span>
              </button>
            )}

            {canWorkerStart && (
              <button
                onClick={handleStartWork}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Start Work on Site</span>
              </button>
            )}

            {canWorkerSubmitResolution && (
              <button
                onClick={() => setShowResolutionModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Submit Resolution Evidence</span>
              </button>
            )}

            {canOfficerVerify && (
              <button
                onClick={() => setShowVerifyModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Verify Resolution</span>
              </button>
            )}

            {canCitizenConfirm && (
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition ring-2 ring-emerald-500/30"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Citizen Signoff / Reopen</span>
              </button>
            )}

            {canEscalate && (
              <button
                onClick={() => setShowEscalateModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Escalate</span>
              </button>
            )}
          </div>
        </div>

        {/* METADATA GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
              Location
            </span>
            <div className="font-medium text-slate-800 truncate" title={issue.location?.address}>
              {issue.location?.address}
            </div>
            <span className="text-[11px] text-slate-500 truncate block">
              {issue.location?.ward}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
              Department
            </span>
            <div className="font-medium text-slate-800">
              {issue.department?.name || 'Unassigned'}
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Code: {issue.department?.code || '—'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
              Assigned Field Worker
            </span>
            <div className="font-medium text-slate-800">
              {issue.assignedTo?.name || 'Unassigned'}
            </div>
            <span className="text-[11px] text-slate-500">
              {issue.assignedTo?.phone || 'Awaiting assignment'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
              Reported By
            </span>
            <div className="font-medium text-slate-800">
              {issue.reportedBy?.name || 'Citizen'}
            </div>
            <span className="text-[11px] text-slate-500">
              {formatDate(issue.createdAt)}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
              SLA Deadline
            </span>
            <div className="font-mono font-medium text-slate-800">
              {formatDateTime(issue.sla?.dueAt)}
            </div>
            <span className="text-[11px] text-slate-500">
              Window: {issue.priority === 'P1' ? '4h' : issue.priority === 'P2' ? '24h' : issue.priority === 'P3' ? '72h' : '7d'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
              Escalations Logged
            </span>
            <div className="font-medium text-slate-800">
              {issue.escalationCount > 0 ? (
                <span className="text-rose-600 font-bold">
                  {issue.escalationCount} active/recorded
                </span>
              ) : (
                '0'
              )}
            </div>
            <span className="text-[11px] text-slate-500">Supervisor oversight</span>
          </div>
        </div>
      </div>

      {/* Citizen Resolution Prompt Banner if Resolved */}
      {issue.status === 'RESOLVED' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-emerald-950">
                Remediation Completed &amp; Verified by Municipal Officer
              </h3>
            </div>
            <p className="text-xs text-emerald-800 mt-1 max-w-2xl leading-relaxed">
              This case is marked as <strong>RESOLVED</strong>. As part of CivicTrack accountability, the citizen must confirm if the issue is physically fixed on site, or reopen if problems persist.
            </p>
          </div>

          <button
            onClick={() => setShowFeedbackModal(true)}
            className="px-4 py-2 rounded-md text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 transition shrink-0 shadow-xs"
          >
            Confirm or Reopen Case →
          </button>
        </div>
      )}

      {/* Reopened Banner if Reopened */}
      {issue.status === 'REOPENED' && (
        <div className="bg-rose-50 border border-rose-300 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <h3 className="text-sm font-bold text-rose-950">
              Case Reopened by Citizen — High Escalation Active
            </h3>
          </div>
          <p className="text-xs text-rose-800 mt-1">
            Citizen Reason: "{issue.citizenFeedback?.reopenReason || 'Remediation was incomplete.'}"
          </p>
        </div>
      )}

      {/* MAIN TWO-COLUMN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Evidence & Chronological Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Physical Resolution Evidence Section */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Physical Evidence &amp; Proof of Completion
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Mandatory for Resolution
              </span>
            </div>

            <EvidenceViewer
              resolution={issue.resolution}
              attachments={issue.attachments}
            />
          </div>

          {/* Chronological Lifecycle Timeline Section */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-800">
                  Chronological Case Lifecycle &amp; Follow-Through Timeline
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {issue.timeline?.length || 0} Events Logged
              </span>
            </div>

            <CaseTimeline
              timeline={issue.timeline}
              attachments={issue.attachments}
            />

            {/* Post Progress Update Form */}
            {['ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'REOPENED'].includes(issue.status) && (
              <form
                onSubmit={handleSendProgressUpdate}
                className="mt-6 pt-4 border-t border-slate-100 flex gap-2"
              >
                <input
                  type="text"
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  placeholder="Post operational update (e.g. 'Cleaning crew arrived at site', '80% waste loaded')..."
                  className="flex-1 text-xs rounded border border-slate-300 px-3 py-2 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={actionLoading || !updateText.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Log Update</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right 1 Column: Operational Sidebar (Audit, Assignments, Location Coordinates) */}
        <div className="space-y-6">
          {/* Assignment Record Details */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-slate-500" />
              Assignment Details
            </h3>

            {issue.assignments && issue.assignments.length > 0 ? (
              <div className="space-y-2.5 text-xs">
                {issue.assignments.slice(0, 2).map((asg) => (
                  <div
                    key={asg._id}
                    className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span>{asg.assignedTo?.name || 'Worker'}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono">
                        {asg.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Assigned by {asg.assignedBy?.name || 'Officer'} on {formatDate(asg.createdAt)}
                    </div>
                    {asg.instructions && (
                      <div className="text-[11px] text-slate-700 italic pt-1 border-t border-slate-200/60">
                        "{asg.instructions}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded">
                No formal assignments dispatched yet.
              </div>
            )}
          </div>

          {/* Location & GPS Details */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-500" />
              Geographic Coordinates
            </h3>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Latitude:</span>
                <span className="font-semibold text-slate-800">
                  {issue.location?.coordinates?.lat || '12.3051'}° N
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Longitude:</span>
                <span className="font-semibold text-slate-800">
                  {issue.location?.coordinates?.lng || '76.6551'}° E
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ward:</span>
                <span className="font-semibold text-slate-800 font-sans">
                  {issue.location?.ward}
                </span>
              </div>
            </div>
          </div>

          {/* Audit History (Visible to Officers, Supervisors, Admins) */}
          {issue.auditTrail && issue.auditTrail.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-slate-500" />
                  Immutable Audit Log
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  {issue.auditTrail.length} Entries
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto divide-y divide-slate-100 pr-1">
                {issue.auditTrail.map((log) => (
                  <div key={log._id} className="pt-2 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-semibold text-slate-700">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatTimeAgo(log.timestamp)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      By {log.actorName} ({log.actorRole})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Modals */}
      <AssignModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        issue={issue}
        onSuccess={() => {
          setSuccessMessage('Case assigned successfully.');
          fetchCaseDetails();
        }}
      />

      <ResolutionModal
        isOpen={showResolutionModal}
        onClose={() => setShowResolutionModal(false)}
        issue={issue}
        onSuccess={() => {
          setSuccessMessage('Resolution evidence submitted for verification.');
          fetchCaseDetails();
        }}
      />

      <VerificationModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        issue={issue}
        onSuccess={() => {
          setSuccessMessage('Verification decision recorded.');
          fetchCaseDetails();
        }}
      />

      <CitizenFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        issue={issue}
        onSuccess={() => {
          setSuccessMessage('Feedback recorded.');
          fetchCaseDetails();
        }}
      />

      <EscalationModal
        isOpen={showEscalateModal}
        onClose={() => setShowEscalateModal(false)}
        issue={issue}
        onSuccess={() => {
          setSuccessMessage('Escalation logged.');
          fetchCaseDetails();
        }}
      />
    </div>
  );
};

export default IssueDetailPage;
