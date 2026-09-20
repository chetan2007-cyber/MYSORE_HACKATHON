import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Loader2, KeyRound, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_PERSONAS } from '../constants';
import env from '../config/env';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, switchDemoRole } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setUnverifiedEmail('');
      const user = await login(email, password);
      if (user.role === 'CITIZEN') navigate('/my-reports');
      else if (user.role === 'FIELD_WORKER') navigate('/worker');
      else if (user.role === 'OFFICER') navigate('/officer');
      else if (user.role === 'SUPERVISOR') navigate('/supervisor');
      else if (user.role === 'ADMIN') navigate('/admin');
      else navigate('/my-reports');
    } catch (err) {
      const data = err.response?.data;
      if (data?.requireVerification) {
        setUnverifiedEmail(email.trim());
        setError(data.message || 'This account is pending email verification.');
      } else {
        setError(data?.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    try {
      setLoading(true);
      setError('');
      setUnverifiedEmail('');
      const user = await switchDemoRole(role);
      if (user.role === 'CITIZEN') navigate('/my-reports');
      else if (user.role === 'FIELD_WORKER') navigate('/worker');
      else if (user.role === 'OFFICER') navigate('/officer');
      else if (user.role === 'SUPERVISOR') navigate('/supervisor');
      else if (user.role === 'ADMIN') navigate('/admin');
      else navigate('/my-reports');
    } catch (err) {
      setError('Failed demo login: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Sign in to your account</h2>
        <p className="text-xs text-slate-500 mt-1">Enter your municipal credentials to access the workflow.</p>
      </div>

      {error && (
        <div className={`p-3 rounded-lg text-xs flex flex-col gap-2 ${
          unverifiedEmail 
            ? 'bg-amber-50 border border-amber-200 text-amber-900' 
            : 'bg-rose-50 border border-rose-200 text-rose-700'
        }`}>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          {unverifiedEmail && (
            <div className="pl-6">
              <Link
                to={`/verify-otp?email=${encodeURIComponent(unverifiedEmail)}`}
                className="inline-flex items-center gap-1 font-semibold text-amber-900 hover:text-amber-950 underline text-xs"
              >
                Enter verification code now &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Email Address
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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Password
            </label>
          </div>
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

      {/* Demo Quick Logins */}
      {env.enableDemoLogin && (
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-brand-600" />
              1-Click Demo Personas:
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-slate-500 bg-slate-100">
              {env.isDev ? 'Development Mode' : 'Hackathon Evaluation Mode'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {DEMO_PERSONAS.map((p) => (
              <button
                key={p.role}
                type="button"
                onClick={() => handleDemoLogin(p.role)}
                disabled={loading}
                className="px-2 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-left transition text-[11px]"
              >
                <div className="font-semibold text-slate-800 truncate">{p.label}</div>
                <div className="text-[10px] text-slate-400 truncate">{p.name.split(' ')[0]}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-center pt-2 text-xs text-slate-500 space-y-1.5">
        <div>
          Citizen looking to report?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Create citizen account
          </Link>
        </div>
        <div className="text-[11px] text-slate-400">
          Municipal staff member?{' '}
          <Link to="/staff/login" className="font-semibold text-slate-700 hover:underline">
            Staff Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
