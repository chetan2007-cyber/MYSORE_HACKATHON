import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Search, Filter, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { auditService } from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { formatDateTime, formatTimeAgo } from '../utils/formatters';

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (search.trim()) params.search = search.trim();
      if (actionFilter) params.action = actionFilter;

      const res = await auditService.getAuditLogs(params);
      setLogs(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAuditLogs();
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('REOPEN') || action.includes('REJECT') || action.includes('ESCALATION')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (action.includes('APPROVE') || action.includes('CLOSED')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('ASSIGN') || action.includes('START')) {
      return 'bg-sky-50 text-sky-700 border-sky-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-slate-700" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              System Audit Trail
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically sequenced, immutable record of all state transitions and administrative actions. ({total} Events)
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Case ID (e.g. CT-2026-000101), actor name, or action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs rounded-md border border-slate-200 pl-9 pr-3 py-2 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs rounded-md border border-slate-200 px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Actions</option>
            <option value="ISSUE_CREATED">ISSUE_CREATED</option>
            <option value="ISSUE_ASSIGNED">ISSUE_ASSIGNED</option>
            <option value="ASSIGNMENT_ACKNOWLEDGED">ASSIGNMENT_ACKNOWLEDGED</option>
            <option value="WORK_STARTED">WORK_STARTED</option>
            <option value="PROGRESS_UPDATE_ADDED">PROGRESS_UPDATE_ADDED</option>
            <option value="RESOLUTION_SUBMITTED">RESOLUTION_SUBMITTED</option>
            <option value="RESOLUTION_APPROVED">RESOLUTION_APPROVED</option>
            <option value="RESOLUTION_REJECTED">RESOLUTION_REJECTED</option>
            <option value="ISSUE_CLOSED">ISSUE_CLOSED</option>
            <option value="ISSUE_REOPENED">ISSUE_REOPENED</option>
            <option value="ESCALATION_CREATED">ESCALATION_CREATED</option>
            <option value="ESCALATION_RESOLVED">ESCALATION_RESOLVED</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition"
          >
            Filter Logs
          </button>
        </form>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <SkeletonTable rows={10} cols={6} />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No audit entries found"
              description="No system records match your query parameters."
            />
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3.5">Timestamp</th>
                  <th className="py-2.5 px-3.5">Action</th>
                  <th className="py-2.5 px-3.5">Case ID</th>
                  <th className="py-2.5 px-3.5">Actor</th>
                  <th className="py-2.5 px-3.5">Role</th>
                  <th className="py-2.5 px-3.5">Metadata / Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-500">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap font-bold text-slate-900">
                      {log.caseId || '—'}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-800 font-sans font-medium">
                      {log.actorName || 'System'}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-500">
                      {log.actorRole}
                    </td>
                    <td className="py-2.5 px-3.5 max-w-xs truncate text-slate-600 font-sans text-xs">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Page <span className="font-semibold text-slate-900">{page}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogPage;
