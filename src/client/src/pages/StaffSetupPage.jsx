import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { staffService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const StaffSetupPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setAuthSession } = useAuth();

  const [invitation, setInvitation] = useState(null);
  const [validating, setValidating] = useState(true);
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      try {
        setValidating(true);
        setTokenError('');
        const res = await staffService.getInvitation(token);
        setInvitation(res.data.data);
      } catch (err) {
        setTokenError(
          err.response?.data?.message || 'This staff invitation link is invalid or has expired.'
        );
      } finally {
        setValidating(false);
      }
    };

    if (token) checkToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      const res = await staffService.completeSetup(token, { password });
      const { token: jwtToken, user } = res.data;

      setAuthSession(jwtToken, user);
      setSuccess(true);

      setTimeout(() => {
        if (user.role === 'FIELD_WORKER') navigate('/worker');
        else if (user.role === 'OFFICER') navigate('/officer');
        else if (user.role === 'SUPERVISOR') navigate('/supervisor');
        else if (user.role === 'ADMIN') navigate('/admin');
        else navigate('/dashboard');
      }, 1200);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to activate staff credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="py-12 text-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600 mx-auto" />
        <p className="text-xs text-slate-500">Validating municipal staff invitation token...</p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="space-y-5 text-center">
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Invalid or Expired Invitation</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-sm mx-auto">
            {tokenError}
          </p>
        </div>
        <div className="pt-2">
          <Link
            to="/staff/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800"
          >
            <span>Proceed to Staff Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Authorized Staff Provisioning</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Establish Staff Password</h2>
        <p className="text-xs text-slate-500 mt-1">
          Welcome to CivicTrack. Create a password to complete your account activation.
        </p>
      </div>

      {/* Staff metadata card */}
      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Staff Member:</span>
          <span className="font-semibold text-slate-900">{invitation?.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Work Email:</span>
          <span className="font-mono text-slate-800">{invitation?.email}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Assigned Role:</span>
          <span className="font-semibold text-brand-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[11px]">
            {invitation?.role?.replace('_', ' ')}
          </span>
        </div>
        {invitation?.department && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Department:</span>
            <span className="font-medium text-slate-800">{invitation.department.name}</span>
          </div>
        )}
      </div>

      {formError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Account activated successfully! Launching your operational dashboard...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            New Password *
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Confirm Password *
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || success}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition disabled:opacity-50 shadow-xs"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Activate Account &amp; Enter Dashboard
        </button>
      </form>
    </div>
  );
};

export default StaffSetupPage;
