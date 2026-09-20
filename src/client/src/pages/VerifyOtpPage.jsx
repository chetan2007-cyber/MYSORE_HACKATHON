import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle, Loader2, ArrowRight, RotateCcw } from 'lucide-react';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const VerifyOtpPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthSession } = useAuth();

  const emailParam = searchParams.get('email') || '';
  const codeParam = searchParams.get('code') || '';
  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cooldown, setCooldown] = useState(60);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
    if (codeParam && codeParam.length === 6) {
      setOtp(codeParam.split(''));
      setSuccessMsg(`Verification code provided: ${codeParam}`);
    }
  }, [emailParam, codeParam]);

  // Resend cooldown timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleDigitChange = (index, value) => {
    // Only accept numeric
    const cleanVal = value.replace(/\D/g, '');

    const newOtp = [...otp];
    if (cleanVal.length > 1) {
      // Pasted string
      const pasted = cleanVal.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasted[i] || '';
      }
      setOtp(newOtp);
      const nextFocus = Math.min(pasted.length, 5);
      if (inputRefs.current[nextFocus]) inputRefs.current[nextFocus].focus();
      return;
    }

    newOtp[index] = cleanVal;
    setOtp(newOtp);

    // Auto advance focus
    if (cleanVal && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (!email) {
      setError('Please provide an email address.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');

      const res = await authService.verifyOtp({
        email: email.trim(),
        otp: fullOtp
      });

      const { token, user } = res.data;
      setAuthSession(token, user);

      setSuccessMsg('Account verified successfully! Redirecting...');

      // Short delay to let user see confirmation
      setTimeout(() => {
        if (user.role === 'CITIZEN') navigate('/citizen');
        else if (user.role === 'FIELD_WORKER') navigate('/worker');
        else navigate('/dashboard');
      }, 700);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    if (!email) {
      setError('Email address is required to resend code.');
      return;
    }

    try {
      setResending(true);
      setError('');
      setSuccessMsg('');
      const res = await authService.resendOtp({ email: email.trim() });
      if (res.data?.otp) {
        setOtp(String(res.data.otp).split(''));
        setSuccessMsg(`Verification code: ${res.data.otp}`);
      } else {
        setSuccessMsg('A fresh verification code has been dispatched to your email.');
      }
      setCooldown(60);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mx-auto mb-3">
          <Mail className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Verify Your Email Address
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
          We sent a 6-digit single-use verification code to:
        </p>
        <div className="mt-1 font-mono text-xs font-semibold text-slate-800 bg-slate-50 py-1 px-2.5 rounded inline-block border border-slate-200">
          {email || 'your email'}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 6 Digit Input Boxes */}
        <div>
          <label className="block text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Enter 6-Digit Code
          </label>
          <div className="flex justify-center gap-2 sm:gap-2.5">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-10 h-12 sm:w-11 sm:h-13 text-center text-xl font-bold font-mono rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-2xs"
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || otp.join('').length < 6}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition disabled:opacity-50 shadow-xs"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Verify &amp; Activate Account
        </button>

        {/* Resend Action */}
        <div className="pt-2 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
          <span>Didn't receive the email?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-800 disabled:opacity-40 transition"
          >
            {resending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Verification Code'}
            </span>
          </button>
        </div>
      </form>

      <div className="pt-3 border-t border-slate-200 text-center text-xs text-slate-500">
        Wrong email address?{' '}
        <Link to="/register" className="font-semibold text-slate-800 hover:underline">
          Register again
        </Link>{' '}
        or{' '}
        <Link to="/login" className="font-semibold text-slate-800 hover:underline">
          Return to Sign In
        </Link>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
