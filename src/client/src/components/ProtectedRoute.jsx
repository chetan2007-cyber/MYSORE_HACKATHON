import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowRight, LogOut } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-600 animate-pulse" />
          <span className="text-xs text-slate-500 font-mono">Authenticating session...</span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    const isStaffRoute = allowedRoles && allowedRoles.some((r) => ['FIELD_WORKER', 'OFFICER', 'SUPERVISOR', 'ADMIN'].includes(r));
    return <Navigate to={isStaffRoute ? '/staff/login' : '/login'} replace />;
  }

  // Role validation
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.includes(user.role) || user.role === 'ADMIN';

    if (!hasRole) {
      // Find their legitimate home route to avoid redirect loop
      let userHome = '/my-reports';
      if (user.role === 'FIELD_WORKER') userHome = '/worker';
      else if (user.role === 'OFFICER') userHome = '/officer';
      else if (user.role === 'SUPERVISOR') userHome = '/supervisor';
      else if (user.role === 'ADMIN') userHome = '/admin';

      return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h2 className="text-base font-bold text-slate-900 mb-1">
              Restricted Portal Access
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              You are signed in as <strong className="text-slate-800">{user.name}</strong> with role{' '}
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                {user.role}
              </span>
              . This portal requires authorization as: {allowedRoles.join(', ')}.
            </p>

            <div className="flex items-center justify-center gap-3">
              <Link
                to={userHome}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
              >
                <span>Go to Your Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition border border-slate-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
