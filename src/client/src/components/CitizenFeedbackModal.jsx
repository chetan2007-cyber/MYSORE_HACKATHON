import React, { useState } from 'react';
import { X, CheckCircle2, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { workflowService } from '../services/api';

const CitizenFeedbackModal = ({ isOpen, onClose, issue, onSuccess }) => {
  const [action, setAction] = useState('CONFIRM'); // 'CONFIRM' or 'REOPEN'
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !issue) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (action === 'REOPEN' && !reason.trim()) {
      setError('Please explain why the issue is still a problem.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await workflowService.confirmResolution(issue._id, {
        action,
        reason: reason.trim()
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit response.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-lg max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-800">
            Citizen Verification: {issue.caseId}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-center py-2">
            <h4 className="text-base font-bold text-slate-900 mb-1">
              Has this issue been resolved?
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your feedback is the final gate in the CivicTrack accountability workflow. Please confirm if the remediation on the ground meets your satisfaction.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAction('CONFIRM')}
              className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition ${
                action === 'CONFIRM'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>YES, RESOLVED</span>
              <span className="text-[10px] font-normal text-slate-500">Close Case</span>
            </button>

            <button
              type="button"
              onClick={() => setAction('REOPEN')}
              className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition ${
                action === 'REOPEN'
                  ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <RotateCcw className="w-5 h-5 text-rose-600" />
              <span>NO, STILL A PROBLEM</span>
              <span className="text-[10px] font-normal text-slate-500">Escalate & Reopen</span>
            </button>
          </div>

          {action === 'REOPEN' && (
            <div>
              <label className="block text-xs font-semibold text-rose-800 mb-1">
                Why is the problem still unresolved? *
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Garbage was only partially picked up; the storm drain is still blocked; or the street light is still flickering."
                className="w-full text-xs rounded border border-rose-300 p-2.5 bg-rose-50/30 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          )}

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
                action === 'CONFIRM'
                  ? 'bg-slate-900 hover:bg-slate-800'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {action === 'CONFIRM' ? 'Confirm and Close Case' : 'Reopen & Escalate Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CitizenFeedbackModal;
