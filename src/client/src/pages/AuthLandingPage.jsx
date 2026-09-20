import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Building2, ArrowRight, ShieldCheck } from 'lucide-react';

const AuthLandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          How are you using CivicTrack?
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Select your entry point to access the appropriate operational workflow.
        </p>
      </div>

      <div className="space-y-3.5">
        {/* Citizen Entry Card */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-xs transition group">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0 group-hover:bg-brand-600 group-hover:text-white transition">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Citizen</h3>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Public Access
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Report civic issues, track remediation progress in real time, and verify physical resolutions.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
                >
                  <span>Continue as Citizen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <Link
                  to="/login"
                  className="py-2 px-3 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Municipal Staff Entry Card */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-400 hover:shadow-xs transition group">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-900 group-hover:text-white transition">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Municipal Staff</h3>
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Authorized Personnel
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Field Workers, Operations Officers, Supervisors &amp; Administrators managing municipal follow-through.
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => navigate('/staff/login')}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                  <span>Staff Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200 text-center">
        <p className="text-[11px] text-slate-400 leading-normal">
          Access is role-based and managed by CivicTrack administrators.<br />
          Staff accounts are provisioned via administrative invitation.
        </p>
      </div>
    </div>
  );
};

export default AuthLandingPage;
