import React, { useState, useEffect } from 'react';
import { BarChart3, Clock, CheckCircle2, TrendingUp, RefreshCw, Layers } from 'lucide-react';
import { analyticsService } from '../services/api';
import { SkeletonCard } from '../components/SkeletonLoader';

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await analyticsService.getAnalytics();
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const summary = data?.summary || {};
  const byCategory = data?.byCategory || [];
  const byDepartment = data?.byDepartment || [];
  const timelineTrends = data?.timelineTrends || [];

  // Calculate max for 7-day trend bar scaling
  const maxTrend = Math.max(
    ...timelineTrends.map((t) => Math.max(t.reported, t.resolved, 1)),
    5
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-700" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Operations &amp; SLA Compliance Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Computed exclusively via MongoDB aggregation pipelines. Real case completion data.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Summary KPI Counters */}
      {loading && !data ? (
        <SkeletonCard count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
              Total Municipal Cases
            </span>
            <div className="text-2xl font-bold text-slate-900">{summary.totalCases || 0}</div>
            <span className="text-[11px] text-slate-500 mt-1 block">Indexed in database</span>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
              Total Verified Resolved
            </span>
            <div className="text-2xl font-bold text-emerald-700">{summary.totalResolved || 0}</div>
            <span className="text-[11px] text-slate-500 mt-1 block">With inspection proof</span>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
              Avg Resolution Time
            </span>
            <div className="text-2xl font-bold text-slate-900">{summary.avgResolutionHours || 0}h</div>
            <span className="text-[11px] text-slate-500 mt-1 block">From report to signoff</span>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
              Overall SLA Compliance
            </span>
            <div className="text-2xl font-bold text-sky-700">{summary.slaComplianceRate || 0}%</div>
            <span className="text-[11px] text-slate-500 mt-1 block">Met deadline threshold</span>
          </div>
        </div>
      )}

      {/* 7-Day Trend: Reported vs Resolved */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              7-Day Case Velocity: Reported vs Resolved
            </h3>
            <p className="text-xs text-slate-500">
              Daily comparison of incoming complaints versus verified completions.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-800" />
              <span className="text-slate-600 font-medium">Reported</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-600" />
              <span className="text-slate-600 font-medium">Resolved</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 pt-6 pb-2 items-end h-48 border-b border-slate-100">
          {timelineTrends.map((t, i) => {
            const repHeight = Math.round((t.reported / maxTrend) * 140);
            const resHeight = Math.round((t.resolved / maxTrend) * 140);
            return (
              <div key={i} className="flex flex-col items-center gap-2 h-full justify-end group">
                <div className="flex items-end gap-1.5 h-full">
                  {/* Reported bar */}
                  <div
                    style={{ height: `${Math.max(repHeight, 4)}px` }}
                    className="w-4 sm:w-6 bg-slate-800 rounded-t transition-all group-hover:bg-slate-700 relative"
                    title={`Reported: ${t.reported}`}
                  >
                    {t.reported > 0 && (
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-slate-700">
                        {t.reported}
                      </span>
                    )}
                  </div>
                  {/* Resolved bar */}
                  <div
                    style={{ height: `${Math.max(resHeight, 4)}px` }}
                    className="w-4 sm:w-6 bg-emerald-600 rounded-t transition-all group-hover:bg-emerald-500 relative"
                    title={`Resolved: ${t.resolved}`}
                  >
                    {t.resolved > 0 && (
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-emerald-700">
                        {t.resolved}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-500">{t.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Breakdown: By Department & By Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Department */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Caseload by Municipal Department
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            {byDepartment.map((dept) => {
              const maxDept = Math.max(...byDepartment.map((d) => d.totalIssues), 1);
              const pct = Math.round((dept.totalIssues / maxDept) * 100);
              return (
                <div key={dept._id} className="space-y-1 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-800">{dept.name}</span>
                    <span className="font-mono text-slate-500">
                      {dept.totalIssues} cases ({dept.resolvedIssues} resolved)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-sky-600 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Category */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Civic Problems by Classification
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            {byCategory.map((cat) => {
              const maxCat = Math.max(...byCategory.map((c) => c.count), 1);
              const pct = Math.round((cat.count / maxCat) * 100);
              return (
                <div key={cat._id} className="space-y-1 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-800">{cat._id}</span>
                    <span className="font-mono text-slate-500">
                      {cat.count} total • {cat.openCount} open
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-slate-800 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
