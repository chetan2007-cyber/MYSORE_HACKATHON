import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Building2,
  AlertTriangle,
  FileText,
  AlertOctagon,
  ArrowRight,
  ShieldAlert,
  BarChart3,
  UserPlus,
  Loader2,
  RefreshCw,
  Sliders,
  Settings
} from 'lucide-react';
import { adminService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState({
    users: { total: 0, citizens: 0, workers: 0, officers: 0, supervisors: 0, admins: 0 },
    caseload: { open: 0, slaBreached: 0, activeEscalations: 0 },
    departments: []
  });
  const [loading, setLoading] = useState(true);

  const fetchAdminOverview = async () => {
    try {
      setLoading(true);
      const res = await adminService.getOverview();
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminOverview();
  }, []);

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              System Administrator Gateway
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Municipal Operations Administration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            System governance, authorized staff provisioning, department policies, and operational audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminOverview}
            disabled={loading}
            className="p-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/admin/staff"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Staff Management</span>
          </Link>
        </div>
      </div>

      {/* User Roster Distribution Metrics */}
      <div>
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-brand-600" />
          <span>User Ecosystem Breakdown</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500">Total Users</span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
              {data.users.total}
            </div>
            <span className="text-[10px] text-slate-400">All registered identities</span>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-emerald-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-700">Citizens</span>
            <div className="text-2xl font-bold text-emerald-800 font-mono mt-1">
              {data.users.citizens}
            </div>
            <span className="text-[10px] text-emerald-600">Public accounts</span>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-700">Field Workers</span>
            <div className="text-2xl font-bold text-slate-800 font-mono mt-1">
              {data.users.workers}
            </div>
            <span className="text-[10px] text-slate-400">Remediation crews</span>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-sky-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-sky-700">Officers</span>
            <div className="text-2xl font-bold text-sky-800 font-mono mt-1">
              {data.users.officers}
            </div>
            <span className="text-[10px] text-sky-600">Triage &amp; verification</span>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-amber-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-800">Supervisors</span>
            <div className="text-2xl font-bold text-amber-800 font-mono mt-1">
              {data.users.supervisors}
            </div>
            <span className="text-[10px] text-amber-700">SLA oversight</span>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-purple-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-purple-800">Admins</span>
            <div className="text-2xl font-bold text-purple-800 font-mono mt-1">
              {data.users.admins}
            </div>
            <span className="text-[10px] text-purple-700">Full system authority</span>
          </div>
        </div>
      </div>

      {/* Operational Pulse Metrics */}
      <div>
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-brand-600" />
          <span>Municipal Operations Pulse</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">Open Civic Cases</span>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                {data.caseload.open}
              </div>
              <span className="text-[11px] text-slate-400">Active municipal workflow</span>
            </div>
            <FileText className="w-8 h-8 text-slate-300" />
          </div>

          <div className="p-4 rounded-lg bg-white border border-rose-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-rose-700">SLA Breaches</span>
              <div className="text-2xl font-bold text-rose-700 font-mono mt-1">
                {data.caseload.slaBreached}
              </div>
              <span className="text-[11px] text-rose-600 font-medium">Overdue resolution target</span>
            </div>
            <AlertTriangle className="w-8 h-8 text-rose-300" />
          </div>

          <div className="p-4 rounded-lg bg-white border border-amber-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-amber-800">Active Escalations</span>
              <div className="text-2xl font-bold text-amber-800 font-mono mt-1">
                {data.caseload.activeEscalations}
              </div>
              <span className="text-[11px] text-amber-700 font-medium">Pending supervisory action</span>
            </div>
            <AlertOctagon className="w-8 h-8 text-amber-300" />
          </div>
        </div>
      </div>

      {/* Administrative Action Center Navigation */}
      <div>
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Administrative Modules
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link
            to="/admin/staff"
            className="p-4 rounded-lg bg-white border border-slate-200 hover:border-brand-500 hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-50 text-sky-600 group-hover:bg-brand-600 group-hover:text-white transition">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Staff Management</h4>
                  <p className="text-[11px] text-slate-500">Invite and manage personnel</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
            </div>
          </Link>

          <Link
            to="/departments"
            className="p-4 rounded-lg bg-white border border-slate-200 hover:border-brand-500 hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Departments &amp; SLAs</h4>
                  <p className="text-[11px] text-slate-500">4 Active Municipal Depts</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
            </div>
          </Link>

          <Link
            to="/issues"
            className="p-4 rounded-lg bg-white border border-slate-200 hover:border-brand-500 hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Global Case Registry</h4>
                  <p className="text-[11px] text-slate-500">Audit &amp; view all issues</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
            </div>
          </Link>

          <Link
            to="/escalations"
            className="p-4 rounded-lg bg-white border border-slate-200 hover:border-brand-500 hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Escalations Hub</h4>
                  <p className="text-[11px] text-slate-500">Breaches &amp; citizen reopens</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
            </div>
          </Link>

          <Link
            to="/audit-log"
            className="p-4 rounded-lg bg-white border border-slate-200 hover:border-brand-500 hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">System Audit Trail</h4>
                  <p className="text-[11px] text-slate-500">Immutable ledger of actions</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
            </div>
          </Link>

          <Link
            to="/analytics"
            className="p-4 rounded-lg bg-white border border-slate-200 hover:border-brand-500 hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">SLA &amp; Caseload Analytics</h4>
                  <p className="text-[11px] text-slate-500">Aggregations &amp; trends</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
