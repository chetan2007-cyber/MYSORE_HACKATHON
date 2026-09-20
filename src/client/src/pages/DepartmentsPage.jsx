import React, { useState, useEffect } from 'react';
import { Building2, AlertTriangle, Clock, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';
import { departmentService } from '../services/api';
import { SkeletonCard } from '../components/SkeletonLoader';
import { useNavigate } from 'react-router-dom';

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await departmentService.getDepartments();
      setDepartments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-700" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Department Performance &amp; Workload
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational throughput, SLA compliance rates, and live backlogs calculated from MongoDB records.
          </p>
        </div>

        <button
          onClick={fetchDepartments}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Departments Grid */}
      {loading ? (
        <SkeletonCard count={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {departments.map((dept) => {
            const m = dept.metrics || {};
            return (
              <div
                key={dept._id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition space-y-4"
              >
                {/* Top Info */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-sky-700 px-2 py-0.5 rounded bg-sky-50 border border-sky-200">
                        {dept.code}
                      </span>
                      <h2 className="text-base font-bold text-slate-900">
                        {dept.name}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {dept.description}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate(`/issues?department=${dept._id}`)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                    title="View Department Issues"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Performance Metrics Block */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-center">
                  <div className="p-2 rounded bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                      Open Workload
                    </span>
                    <span className="text-lg font-bold text-slate-900">{m.openIssues || 0}</span>
                  </div>

                  <div className="p-2 rounded bg-blue-50/50 border border-blue-100">
                    <span className="text-[10px] uppercase font-semibold text-blue-700 block">
                      In Progress
                    </span>
                    <span className="text-lg font-bold text-blue-900">{m.inProgress || 0}</span>
                  </div>

                  <div className="p-2 rounded bg-amber-50/50 border border-amber-100">
                    <span className="text-[10px] uppercase font-semibold text-amber-700 block">
                      SLA At Risk
                    </span>
                    <span className="text-lg font-bold text-amber-900">{m.slaAtRisk || 0}</span>
                  </div>

                  <div className="p-2 rounded bg-rose-50/50 border border-rose-100">
                    <span className="text-[10px] uppercase font-semibold text-rose-700 block">
                      SLA Breached
                    </span>
                    <span className="text-lg font-bold text-rose-900">{m.slaBreached || 0}</span>
                  </div>

                  <div className="p-2 rounded bg-emerald-50/50 border border-emerald-100">
                    <span className="text-[10px] uppercase font-semibold text-emerald-700 block">
                      Resolved Today
                    </span>
                    <span className="text-lg font-bold text-emerald-900">{m.resolvedToday || 0}</span>
                  </div>
                </div>

                {/* Footnotes & SLA Compliance Rate */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Head Officer:</span>
                    <span className="font-medium text-slate-700">
                      {dept.headOfficer?.name || 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span>Avg Resolution: <strong className="text-slate-800">{m.avgResolutionHours}h</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>SLA Compliance: <strong className="text-emerald-700">{m.complianceRate}%</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DepartmentsPage;
