import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-lg bg-sky-500 animate-pulse" />
      </div>
    );
  }

  if (user) {
    if (user.role === 'CITIZEN') return <Navigate to="/citizen" replace />;
    if (user.role === 'FIELD_WORKER') return <Navigate to="/worker" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-6 sm:py-12 px-2.5 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-sky-400 font-black text-xl shadow-md mb-3">
          CT
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">CivicTrack</h1>
        <p className="text-xs text-slate-500 mt-1">From reported to resolved.</p>
      </div>

      <div className="mt-4 sm:mt-6 sm:mx-auto sm:w-full sm:max-w-md px-2.5 sm:px-0">
        <div className="bg-white py-6 px-4 shadow-sm rounded-xl border border-slate-200 sm:py-8 sm:px-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
