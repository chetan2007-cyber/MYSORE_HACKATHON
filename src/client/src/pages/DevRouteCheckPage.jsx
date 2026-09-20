import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, RefreshCw, Server, Database, Shield, Layout, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { supervisorService } from '../services/api';
import env from '../config/env';

const API_BASE = env.apiUrl;

const DevRouteCheckPage = () => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState({
    backendConnected: false,
    dbConnected: false,
    supervisorApiStatus: false,
    supervisorApiMessage: '',
    apiHealthData: null
  });

  const runDiagnostics = async () => {
    setLoading(true);
    let backendConnected = false;
    let dbConnected = false;
    let supervisorApiStatus = false;
    let supervisorApiMessage = '';
    let apiHealthData = null;

    try {
      const healthRes = await axios.get(`${API_BASE}/health`, { timeout: 3000 });
      backendConnected = healthRes.status === 200;
      dbConnected = healthRes.data?.database === 'connected' || healthRes.data?.status === 'ok' || healthRes.data?.status === 'healthy';
      apiHealthData = healthRes.data;
    } catch (err) {
      backendConnected = false;
      dbConnected = false;
    }

    if (token) {
      try {
        const supRes = await supervisorService.getOverview();
        supervisorApiStatus = supRes.status === 200;
        supervisorApiMessage = 'HTTP 200 OK';
      } catch (err) {
        supervisorApiStatus = false;
        supervisorApiMessage = `${err.response?.status || 'Error'}: ${err.response?.data?.message || err.message}`;
      }
    } else {
      supervisorApiMessage = 'Not authenticated (Sign in as supervisor to test)';
    }

    setDiagnostics({
      backendConnected,
      dbConnected,
      supervisorApiStatus,
      supervisorApiMessage,
      apiHealthData
    });
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, [token]);

  const routeList = [
    { path: '/my-reports', label: 'Citizen Portal', requiredRoles: ['CITIZEN', 'ADMIN'] },
    { path: '/worker', label: 'Field Worker Workspace', requiredRoles: ['FIELD_WORKER', 'ADMIN'] },
    { path: '/officer', label: 'Operations Officer Triage', requiredRoles: ['OFFICER', 'ADMIN'] },
    { path: '/supervisor', label: 'Supervisor Oversight Dashboard', requiredRoles: ['SUPERVISOR', 'ADMIN'] },
    { path: '/admin', label: 'Administrator Command Center', requiredRoles: ['ADMIN'] }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800 uppercase mb-1">
            Developer Diagnostic Tool
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            System Route &amp; Service Health Check
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time diagnostics for authentication context, backend endpoints, database connectivity, and role authorization.
          </p>
        </div>

        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Run Check</span>
        </button>
      </div>

      {/* Grid: System Services */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Backend Connectivity */}
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>Backend API</span>
            </span>
            {diagnostics.backendConnected ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                PASS
              </span>
            ) : (
              <span className="text-rose-700 font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                FAIL
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-slate-500">
            {diagnostics.backendConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
        </div>

        {/* MongoDB Connectivity */}
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>MongoDB</span>
            </span>
            {diagnostics.dbConnected ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                PASS
              </span>
            ) : (
              <span className="text-rose-700 font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                FAIL
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-slate-500">
            {diagnostics.dbConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
        </div>

        {/* Authentication Context */}
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Authentication</span>
            </span>
            {user ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                PASS
              </span>
            ) : (
              <span className="text-amber-700 font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                GUEST
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-slate-500 truncate">
            {user ? `${user.role} (${user.email})` : 'No active session'}
          </div>
        </div>

        {/* Supervisor API Route */}
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span className="flex items-center gap-1.5">
              <Layout className="w-3.5 h-3.5 text-slate-400" />
              <span>Supervisor API</span>
            </span>
            {diagnostics.supervisorApiStatus ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                PASS
              </span>
            ) : (
              <span className="text-amber-700 font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                CHECK
              </span>
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-500 truncate" title={diagnostics.supervisorApiMessage}>
            {diagnostics.supervisorApiMessage}
          </div>
        </div>
      </div>

      {/* Role Route Verification Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Role Route Availability Verification
          </h3>
          <span className="text-[11px] text-slate-400">Target Application Routes</span>
        </div>

        <div className="divide-y divide-slate-100">
          {routeList.map((r) => {
            const hasAccess = user && (r.requiredRoles.includes(user.role) || user.role === 'ADMIN');
            return (
              <div key={r.path} className="px-5 py-3.5 flex items-center justify-between text-xs hover:bg-slate-50/80 transition">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {r.path}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-900">{r.label}</span>
                    <span className="text-[11px] text-slate-400 ml-2 font-mono">
                      (Allowed: {r.requiredRoles.join(', ')})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                      hasAccess
                        ? 'bg-emerald-100 text-emerald-800'
                        : user
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {hasAccess ? 'ALLOWED / PASS' : user ? 'RESTRICTED' : 'REQUIRES LOGIN'}
                  </span>

                  <Link
                    to={r.path}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
                  >
                    <span>Test Route</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DevRouteCheckPage;
