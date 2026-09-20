import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowUpDown,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import { issueService, departmentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaBadge from '../components/SlaBadge';
import { SkeletonTable } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { formatDate } from '../utils/formatters';
import { STATUS_CONFIG, CIVIC_CATEGORIES } from '../constants';

const IssuesListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isCitizen } = useAuth();

  const [issues, setIssues] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter states initialized from URL params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [priority, setPriority] = useState(searchParams.get('priority') || '');
  const [department, setDepartment] = useState(searchParams.get('department') || '');
  const [slaStatus, setSlaStatus] = useState(searchParams.get('slaStatus') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  // Load departments for filter dropdown
  useEffect(() => {
    departmentService
      .getDepartments()
      .then((res) => setDepartments(res.data.data || []))
      .catch((err) => console.error('Failed to load departments:', err));
  }, []);

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        sortBy,
        sortOrder
      };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (department) params.department = department;
      if (slaStatus) params.slaStatus = slaStatus;

      const res = await issueService.getIssues(params);
      setIssues(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch issues:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, priority, department, slaStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchIssues();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setDepartment('');
    setSlaStatus('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Case Management Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Searchable registry of all municipal civic issues with live SLA tracking. ({total} Total Cases)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={isCitizen ? '/report' : '/report'}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Issue</span>
          </Link>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Case ID (e.g. CT-2026-000101), title, or Mysuru location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs rounded-md border border-slate-200 pl-9 pr-3 py-2 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition"
          >
            Search Cases
          </button>
        </form>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs rounded border border-slate-200 p-1.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              {Object.keys(STATUS_CONFIG).map((st) => (
                <option key={st} value={st}>
                  {STATUS_CONFIG[st].label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs rounded border border-slate-200 p-1.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">All Priorities</option>
              <option value="P1">P1 - Critical (4h)</option>
              <option value="P2">P2 - High (24h)</option>
              <option value="P3">P3 - Medium (72h)</option>
              <option value="P4">P4 - Low (7d)</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs rounded border border-slate-200 p-1.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* SLA Filter */}
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
              SLA Status
            </label>
            <select
              value={slaStatus}
              onChange={(e) => {
                setSlaStatus(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs rounded border border-slate-200 p-1.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">All SLA Statuses</option>
              <option value="BREACHED">Breached</option>
              <option value="AT_RISK">At Risk</option>
              <option value="ON_TRACK">On Track</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full py-1.5 px-3 rounded border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Case Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <SkeletonTable rows={10} cols={8} />
          ) : issues.length === 0 ? (
            <EmptyState
              icon={Filter}
              title="No issues found"
              description="No cases match your selected filter or search terms. Try clearing your filters."
              action={
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded"
                >
                  Clear Filters
                </button>
              }
            />
          ) : (
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3.5">Case ID</th>
                  <th className="py-2.5 px-3.5">Issue Title</th>
                  <th className="py-2.5 px-3.5">Priority</th>
                  <th className="py-2.5 px-3.5">Department</th>
                  <th className="py-2.5 px-3.5">Assigned To</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">SLA Deadline</th>
                  <th className="py-2.5 px-3.5 text-right">Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issues.map((issue) => (
                  <tr
                    key={issue._id}
                    onClick={() => navigate(`/issues/${issue._id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {issue.caseId}
                    </td>
                    <td className="py-3 px-3.5 max-w-sm">
                      <div className="font-semibold text-slate-800 truncate" title={issue.title}>
                        {issue.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {issue.location?.address} • {issue.category}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <PriorityBadge priority={issue.priority} />
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                      {issue.department?.name || (
                        <span className="text-amber-700 font-medium">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {issue.assignedTo?.name ? (
                        <span className="text-slate-700">{issue.assignedTo.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">None assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <StatusBadge status={issue.status} />
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <SlaBadge slaEvaluation={issue.slaEvaluation} />
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap font-mono text-slate-500">
                      {formatDate(issue.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing Page <span className="font-semibold text-slate-900">{page}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalPages}</span> ({total} Total Records)
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssuesListPage;
