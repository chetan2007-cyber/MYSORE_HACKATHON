import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await register({
        name: formData.name,
        email: formData.email.trim(),
        phone: formData.phone,
        password: formData.password,
        role: 'CITIZEN'
      });
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const codeQuery = isLocalhost && res?.data?.otp ? `&code=${res.data.otp}` : '';
      navigate(`/verify-otp?email=${encodeURIComponent(formData.email.trim())}${codeQuery}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration could not be completed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Create your Citizen Account</h2>
        <p className="text-xs text-slate-500 mt-1">
          Report civic issues and follow their progress from report to resolution.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="Priya Sundaram"
            className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="priya@example.com"
            className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+91 98450 12345"
            className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition disabled:opacity-50 shadow-xs"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Create Citizen Account
        </button>
      </form>

      <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-200 space-y-1.5">
        <div>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </div>
        <div className="text-[11px] text-slate-400">
          Are you municipal staff?{' '}
          <Link to="/staff/login" className="font-semibold text-slate-700 hover:underline">
            Staff Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
