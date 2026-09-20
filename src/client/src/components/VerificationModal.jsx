import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { workflowService } from '../services/api';

const VerificationModal = ({ isOpen, onClose, issue, onSuccess }) => {
  const [action, setAction] = useState('APPROVE'); // 'APPROVE' or 'REJECT'
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !issue) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (action === 'REJECT' && !remarks.trim()) {
      setError('Please provide specific remarks explaining why the resolution was rejected.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await workflowService.verifyResolution(issue._id, {
        action,
        remarks: remarks.trim()
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-lg max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-slate-800">
              Verify Case Resolution: {issue.caseId}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Evidence Preview */}
          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
            <div className="text-xs font-semibold text-slate-800">Submitted Notes:</div>
            <p className="text-xs text-slate-600 italic">
              "{issue.resolution?.notes || 'No remarks provided.'}"
            </p>
            {issue.resolution?.afterImages && issue.resolution.afterImages.length > 0 && (
              <div className="flex gap-2 pt-1">
                {issue.resolution.afterImages.map((img, i) => (
                  <a
                    key={i}
                    href={img}
                    target="_blank"
                    rel="noreferrer"
                    className="w-16 h-12 rounded border border-slate-200 overflow-hidden block bg-slate-100"
                  >
                    <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Verification Decision */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Verification Decision *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAction('APPROVE')}
                className={`py-2 px-3 rounded text-xs font-medium border flex items-center justify-center gap-2 transition ${
                  action === 'APPROVE'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Approve & Mark Resolved
              </button>

              <button
                type="button"
                onClick={() => setAction('REJECT')}
                className={`py-2 px-3 rounded text-xs font-medium border flex items-center justify-center gap-2 transition ${
                  action === 'REJECT'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 ring-1 ring-rose-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                Reject & Send Back
              </button>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {action === 'REJECT'
                ? 'Rejection Remarks (Mandatory) *'
                : 'Officer Approval Remarks (Optional)'}
            </label>
            <textarea
              rows={3}
              required={action === 'REJECT'}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                action === 'REJECT'
                  ? 'Explain why physical remediation is incomplete and what further work is required...'
                  : 'Confirmed work meets municipal quality standards.'
              }
              className="w-full text-xs rounded border border-slate-300 p-2.5 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white rounded transition disabled:opacity-50 ${
                action === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {action === 'APPROVE' ? 'Confirm Approval' : 'Reject Resolution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerificationModal;
