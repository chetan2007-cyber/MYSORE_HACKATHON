import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogIn, AlertCircle, Loader2, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STAFF_DEMO_ACCOUNTS = [
  { role: 'FIELD_WORKER', title: 'Field Worker', email: 'worker@civictrack.local', pass: 'Worker@123', dept: 'Sanitation' },
  { role: 'OFFICER', title: 'Operations Officer', email: 'officer@civictrack.local', pass: 'Officer@123', dept: 'Operations' },
  { role: 'SUPERVISOR', title: 'Sanitation Supervisor', email: 'supervisor@civictrack.local', pass: 'Supervisor@123', dept: 'Sanitation' },
  { role: 'ADMIN', title: 'Municipal Admin', email: 'admin@civictrack.local', pass: 'Admin@123', dept: 'City Administration' }
];

const StaffLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleQuickFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both work email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const user = await login(email.trim(), password);

      // Role-specific redirection based on backend response
      if (user.role === 'FIELD_WORKER') {
        navigate('/worker');
      } else if (user.role === 'OFFICER') {
        navigate('/officer');
      } else if (user.role === 'SUPERVISOR') {
        navigate('/supervisor');
      } else if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/my-reports');
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.requireSetup) {
        setError(data.message || 'Staff setup incomplete. Please use the invitation link sent to your email.');
      } else {
        setError(data?.message || 'Invalid work credentials. Please check your email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
          <span>Restricted Municipal Access</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Municipal Staff Sign In</h2>
        <p className="text-xs text-slate-500 mt-1">
          Sign in with the account provided by your organization.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Work Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="officer@civictrack.local"
            className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition disabled:opacity-50 shadow-xs"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          Sign In
        </button>
      </form>

      {/* Development Demo Quick-Fill Section */}
      <div className="pt-3 border-t border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
            <KeyRound className="w-3.5 h-3.5 text-brand-600" />
            Development Demo Accounts:
          </span>
          <span className="text-[10px] text-slate-400">Click to fill</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {STAFF_DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.role}
              type="button"
              onClick={() => handleQuickFill(acc.email, acc.pass)}
              className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-left transition text-[11px]"
            >
              <div className="font-semibold text-slate-800">{acc.title}</div>
              <div className="text-[10px] text-slate-500 font-mono truncate">{acc.email}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-200 space-y-1.5">
        <div>
          Don't have staff access?{' '}
          <span className="text-slate-600 font-medium">Contact your administrator.</span>
        </div>
        <div>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-700 font-medium"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Return to Portal Selection</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StaffLoginPage;
