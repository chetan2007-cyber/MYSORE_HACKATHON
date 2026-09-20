import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  WifiOff,
  CloudUpload,
  Trash2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { issueService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import SlaBadge from '../components/SlaBadge';
import { SkeletonCard } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { formatTimeAgo } from '../utils/formatters';
import { getOfflineReports, deleteOfflineReport } from '../services/offlineStorage';
import { syncOfflineReports, subscribeSync } from '../services/syncService';

const CitizenDashboardPage = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [offlineReports, setOfflineReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serverOffline, setServerOffline] = useState(false);
  const [syncingLocal, setSyncingLocal] = useState(false);
  const navigate = useNavigate();

  const fetchMyReports = useCallback(async () => {
    setLoading(true);

    // 1. Fetch locally queued offline reports from IndexedDB
    try {
      const local = await getOfflineReports();
      setOfflineReports(local || []);
    } catch (dbErr) {
      console.warn('Could not read IndexedDB offline queue:', dbErr);
    }

    // 2. Fetch synchronized server reports from backend
    try {
      const res = await issueService.getIssues({ myReports: 'true', limit: 50 });
      setIssues(res.data?.data || []);
      setServerOffline(false);
    } catch (err) {
      console.warn('Backend currently unreachable for citizen reports:', err.message);
      setServerOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyReports();

    // Listen to sync engine completion events
    const handleSyncEvent = () => {
      fetchMyReports();
    };

    window.addEventListener('civictrack:synced', handleSyncEvent);
    return () => window.removeEventListener('civictrack:synced', handleSyncEvent);
  }, [fetchMyReports]);

  const handleSyncNow = async () => {
    setSyncingLocal(true);
    try {
      await syncOfflineReports();
    } finally {
      setSyncingLocal(false);
      fetchMyReports();
    }
  };

  const handleDeleteOffline = async (localId, e) => {
    e.stopPropagation();
    if (window.confirm('Discard this offline queued report? It has not been synchronized to the municipal server.')) {
      await deleteOfflineReport(localId);
      fetchMyReports();
    }
  };

  const openReports = issues.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status));
  const resolvedReports = issues.filter((i) => ['RESOLVED', 'CLOSED'].includes(i.status));
  const awaitingCitizenAction = issues.filter((i) => i.status === 'RESOLVED');

  const pendingOffline = offlineReports.filter((r) => r.syncStatus === 'QUEUED' || r.syncStatus === 'FAILED' || r.syncStatus === 'SYNCING');
  const syncedOffline = offlineReports.filter((r) => r.syncStatus === 'SYNCED');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Citizen Welcome Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            Citizen Action Hub
          </span>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            My Civic Reports
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Track every issue you've reported through its physical remediation lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchMyReports}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-slate-900 bg-sky-400 hover:bg-sky-300 transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Report an Issue</span>
          </Link>
        </div>
      </div>

      {/* Server Offline Banner */}
      {serverOffline && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-2xs text-xs text-amber-900 flex items-start gap-3">
          <WifiOff className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-950">
              Offline Mode — Server Not Connected
            </h4>
            <p className="text-amber-800 leading-relaxed">
              Displaying locally stored device data. You can continue creating reports offline; they will queue locally and upload as soon as connectivity returns.
            </p>
          </div>
        </div>
      )}

      {/* Action Banner for issues requiring citizen confirmation */}
      {awaitingCitizenAction.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-emerald-950">
              {awaitingCitizenAction.length} Report(s) Verified by City — Needs Your Confirmation
            </h3>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">
            The municipal field team and officers have submitted remediation proof for your issue. Please verify that the work has been satisfactorily completed on the ground.
          </p>
          <div className="flex flex-wrap gap-2">
            {awaitingCitizenAction.map((rep) => (
              <Link
                key={rep._id}
                to={`/issues/${rep._id}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition"
              >
                <span>Verify {rep.caseId}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: Locally Queued Offline Reports (IndexedDB) */}
      {/* ========================================================================= */}
      {pendingOffline.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-amber-700" />
              <h2 className="text-sm font-bold text-amber-950 uppercase tracking-wider">
                Offline Queued Reports ({pendingOffline.length})
              </h2>
            </div>
            <button
              onClick={handleSyncNow}
              disabled={syncingLocal}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-semibold shadow-2xs transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingLocal ? 'animate-spin' : ''}`} />
              <span>Sync Queue Now</span>
            </button>
          </div>

          <div className="space-y-3">
            {pendingOffline.map((item) => (
              <div
                key={item.localId}
                className="bg-amber-50/40 border border-amber-200 rounded-xl p-4.5 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                        {item.localId}
                      </span>
                      <span className="text-amber-300">•</span>
                      <span className="text-xs text-amber-800 font-medium">
                        {item.category}
                      </span>
                      <span className="text-amber-300">•</span>
                      <span className="text-xs text-slate-500 font-mono">
                        Saved {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {item.title}
                    </h3>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {item.syncStatus === 'SYNCING' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-100 text-sky-800 text-[11px] font-bold border border-sky-300 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />
                        SYNCING...
                      </span>
                    ) : item.syncStatus === 'FAILED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-300">
                        <AlertTriangle className="w-3 h-3" />
                        SYNC FAILED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-300">
                        <Clock className="w-3 h-3 text-amber-700" />
                        QUEUED FOR SYNC
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/60 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 truncate max-w-md">
                    <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span className="truncate">{item.ward} — {item.address}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-amber-900 font-medium">
                      {item.attachmentCount || 0} evidence photo(s)
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteOffline(item.localId, e)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                      title="Discard local draft"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {item.lastError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-700 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.lastError}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: Confirmed Synchronized Reports (Server Data) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Synchronized Reports ({issues.length})
          </h2>
          <span className="text-xs text-slate-500">
            {openReports.length} Open • {resolvedReports.length} Resolved
          </span>
        </div>

        {loading ? (
          <SkeletonCard count={3} />
        ) : issues.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={serverOffline ? "No server reports loaded offline" : "No reports submitted yet"}
            description={
              serverOffline
                ? "You are currently offline. Connect to the internet to load your historical server records."
                : "You haven't reported any civic problems yet. If you see broken pavement, overflowing garbage, or dark streetlights in Mysuru, report them immediately."
            }
            action={
              <Link
                to="/report"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded text-xs font-semibold"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit a Report</span>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div
                key={issue._id}
                onClick={() => navigate(`/issues/${issue._id}`)}
                className="bg-white border border-slate-200 rounded-xl p-4.5 hover:border-slate-300 hover:shadow-xs transition cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brand-600">
                        {issue.caseId}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500 font-medium">
                        {issue.category}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {issue.title}
                    </h3>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <StatusBadge status={issue.status} />
                    {issue.slaEvaluation && (
                      <SlaBadge slaEvaluation={issue.slaEvaluation} />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{issue.location?.ward || issue.location?.address}</span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    {issue.department?.name && (
                      <span className="text-slate-600 font-sans">
                        Dept: {issue.department.name}
                      </span>
                    )}
                    <span>Updated {formatTimeAgo(issue.updatedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CitizenDashboardPage;
