import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Loader2,
  X,
  AlertCircle
} from 'lucide-react';
import { escalationService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PriorityBadge from '../components/PriorityBadge';
import { SkeletonTable } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { formatTimeAgo, formatDateTime } from '../utils/formatters';

const EscalationsPage = () => {
  const { user, canOversee } = useAuth();
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState('ACTIVE'); // 'ACTIVE' or 'RESOLVED'

  // Modal for resolving an escalation
  const [selectedEscalation, setSelectedEscalation] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveAction, setResolveAction] = useState('RESOLVED'); // 'RESOLVED' or 'ACKNOWLEDGED'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchEscalations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await escalationService.getEscalations({ status: statusTab });
      setEscalations(res.data.data || []);
    } catch (err) {
      console.error('Failed to load escalations:', err);
    } finally {
      setLoading(false);
    }
  }, [statusTab]);

  useEffect(() => {
    fetchEscalations();
  }, [fetchEscalations]);

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (resolveAction === 'RESOLVED' && !resolveNotes.trim()) {
      setError('Please provide resolution notes explaining supervisor intervention.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await escalationService.resolveEscalation(selectedEscalation._id, {
        action: resolveAction,
        notes: resolveNotes.trim()
      });
      setSelectedEscalation(null);
      setResolveNotes('');
      fetchEscalations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update escalation.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityBadge = (sev) => {
    const map = {
      CRITICAL: 'bg-rose-100 text-rose-800 border-rose-300',
      HIGH: 'bg-amber-100 text-amber-800 border-amber-300',
      MEDIUM: 'bg-blue-100 text-blue-800 border-blue-200',
      LOW: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${map[sev] || map.HIGH}`}>
        {sev}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Escalations &amp; SLA Breaches Hub
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisory queue monitoring critical delays, overdue assignments, and citizen reopen flags.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setStatusTab('ACTIVE')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              statusTab === 'ACTIVE'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Escalations
          </button>
          <button
            onClick={() => setStatusTab('RESOLVED')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              statusTab === 'RESOLVED'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Resolved Escalations
          </button>
        </div>
      </div>

      {/* Escalation Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <SkeletonTable rows={6} cols={7} />
          ) : escalations.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={`No ${statusTab.toLowerCase()} escalations`}
              description="There are currently no escalations recorded under this status. All department SLA deadlines are operating within normal parameters."
            />
          ) : (
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3.5">Case ID</th>
                  <th className="py-2.5 px-3.5">Escalation Reason</th>
                  <th className="py-2.5 px-3.5">Severity</th>
                  <th className="py-2.5 px-3.5">Department</th>
                  <th className="py-2.5 px-3.5">Current Owner</th>
                  <th className="py-2.5 px-3.5">Logged</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {escalations.map((esc) => (
                  <tr key={esc._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {esc.issue?.caseId || '—'}
                    </td>
                    <td className="py-3 px-3.5 max-w-sm">
                      <div className="font-semibold text-slate-800 line-clamp-2">
                        {esc.reason}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {esc.issue?.title}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {getSeverityBadge(esc.severity)}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                      {esc.issue?.department?.name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {esc.issue?.assignedTo?.name ? (
                        <span className="text-slate-700">{esc.issue.assignedTo.name}</span>
                      ) : (
                        <span className="text-amber-700 font-medium italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-500">
                      {formatTimeAgo(esc.createdAt)}
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {canOversee && esc.status === 'ACTIVE' && (
                          <button
                            onClick={() => setSelectedEscalation(esc)}
                            className="px-2.5 py-1 rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
                          >
                            Intervene / Resolve
                          </button>
                        )}
                        <button
                          onClick={() => esc.issue?._id && navigate(`/issues/${esc.issue._id}`)}
                          className="px-2 py-1 rounded text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                        >
                          View Case →
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Supervisor Intervention Modal */}
      {selectedEscalation && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-md w-full border border-slate-200 shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-semibold text-slate-800">
                  Supervisor Action: {selectedEscalation.issue?.caseId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEscalation(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700 space-y-1">
                <span className="font-semibold text-slate-900 block">Escalation Trigger:</span>
                <p className="italic">"{selectedEscalation.reason}"</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Action Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolveAction('ACKNOWLEDGED')}
                    className={`p-2 rounded text-xs font-medium border text-center transition ${
                      resolveAction === 'ACKNOWLEDGED'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Acknowledge &amp; Dispatch
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolveAction('RESOLVED')}
                    className={`p-2 rounded text-xs font-medium border text-center transition ${
                      resolveAction === 'RESOLVED'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Resolve Escalation
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supervisor Notes / Directives *
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="Detail the supervisory intervention taken to clear the operational hurdle..."
                  className="w-full text-xs rounded border border-slate-300 p-2.5 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedEscalation(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Intervention
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscalationsPage;
