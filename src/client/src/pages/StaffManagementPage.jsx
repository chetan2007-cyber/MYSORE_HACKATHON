import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Building2,
  Copy,
  RotateCcw,
  Check,
  UserCheck,
  AlertTriangle,
  X
} from 'lucide-react';
import { adminService, departmentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatTimeAgo } from '../utils/formatters';

const StaffManagementPage = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    role: 'FIELD_WORKER'
  });
  const [modalError, setModalError] = useState('');
  const [createdInviteUrl, setCreatedInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      setError('');
      const [staffRes, deptsRes] = await Promise.all([
        adminService.getStaff(),
        departmentService.getDepartments()
      ]);
      setStaff(staffRes.data.data || []);
      setDepartments(deptsRes.data.data || []);
      if (deptsRes.data.data?.length > 0 && !formData.department) {
        setFormData((prev) => ({ ...prev, department: deptsRes.data.data[0]._id }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load staff roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setModalError('');
      const res = await adminService.inviteStaff(formData);
      setCreatedInviteUrl(res.data.setupUrl || '');
      setSuccessMsg(`Invitation dispatched to ${formData.email}`);
      await fetchStaffData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to invite staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (staffId, staffEmail) => {
    try {
      const res = await adminService.resendStaffInvitation(staffId);
      setSuccessMsg(`Fresh invitation dispatched to ${staffEmail}`);
      if (res.data.setupUrl) {
        setCreatedInviteUrl(res.data.setupUrl);
        setShowModal(true); // Open modal with link to inspect
      }
      await fetchStaffData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend invitation.');
    }
  };

  const handleToggleStatus = async (staffId, currentStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await adminService.updateStaff(staffId, { status: nextStatus });
      setSuccessMsg(`Staff status updated to ${nextStatus}.`);
      await fetchStaffData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update staff status.');
    }
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setShowModal(false);
    setCreatedInviteUrl('');
    setModalError('');
    setFormData({
      name: '',
      email: '',
      phone: '',
      department: departments[0]?._id || '',
      role: 'FIELD_WORKER'
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Management</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-800">
              Admin Gateway
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Provision authorized municipal personnel, dispatch setup invitations, and govern operational roles.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition shadow-xs self-start"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Staff Member</span>
        </button>
      </div>

      {/* Global Alerts */}
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

      {/* Staff Roster Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">Authorized Personnel</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-200 text-slate-700">
              {staff.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Strictly Managed via Admin Invitation</span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
            <span className="text-xs text-slate-500">Loading municipal personnel...</span>
          </div>
        ) : staff.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No municipal staff members provisioned yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5">Staff Member</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">Department</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Last Login</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((member) => (
                  <tr key={member._id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{member.name}</div>
                      <div className="font-mono text-[11px] text-slate-500">{member.email}</div>
                      {member.phone && (
                        <div className="text-[10px] text-slate-400">{member.phone}</div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                          member.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : member.role === 'SUPERVISOR'
                            ? 'bg-amber-100 text-amber-800'
                            : member.role === 'OFFICER'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {member.role.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {member.department ? (
                        <span className="font-medium text-slate-800">
                          {member.department.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Central Administration</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {member.status === 'ACTIVE' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      )}
                      {member.status === 'INVITED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>Invited (Pending Setup)</span>
                        </span>
                      )}
                      {['SUSPENDED', 'DEACTIVATED'].includes(member.status) && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Suspended</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-[11px] text-slate-500 font-mono">
                      {member.lastLoginAt ? formatTimeAgo(member.lastLoginAt) : 'Never'}
                    </td>

                    <td className="px-4 py-3 text-right space-x-2">
                      {member.status === 'INVITED' && (
                        <button
                          type="button"
                          onClick={() => handleResend(member._id, member.email)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-brand-700 hover:bg-sky-50 transition border border-sky-200"
                          title="Resend invitation link"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Resend Setup</span>
                        </button>
                      )}

                      {member.role !== 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(member._id, member.status)}
                          className={`px-2 py-1 rounded text-[11px] font-medium transition border ${
                            member.status === 'ACTIVE'
                              ? 'text-rose-700 hover:bg-rose-50 border-rose-200'
                              : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                          }`}
                        >
                          {member.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Member Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full border border-slate-200 shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand-600" />
                <span>Invite Municipal Staff Member</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                The staff member will receive a secure one-time link to configure their password.
              </p>
            </div>

            {modalError && (
              <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            {createdInviteUrl ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Staff Invitation Dispatched!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    An invitation email was triggered. You can also copy the one-time secure onboarding link below for immediate setup or testing:
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    One-Time Setup Link (Expires in 48 Hours)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdInviteUrl}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyLink(createdInviteUrl)}
                      className="shrink-0 p-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition"
                      title="Copy link"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-md text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Arun Kumar"
                    className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="arun@civictrack.local"
                    className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98450 12345"
                    className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Department *
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Staff Role *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold"
                    >
                      <option value="FIELD_WORKER">Field Worker</option>
                      <option value="OFFICER">Operations Officer</option>
                      <option value="SUPERVISOR">Supervisor</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3.5 py-2 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    <span>Dispatch Invitation</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagementPage;
