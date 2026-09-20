import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import { authService, workflowService } from '../services/api';

const AssignModal = ({ isOpen, onClose, issue, onSuccess }) => {
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [priority, setPriority] = useState(issue?.priority || 'P3');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && issue) {
      setPriority(issue.priority || 'P3');
      fetchWorkers();
    }
  }, [isOpen, issue]);

  const fetchWorkers = async () => {
    try {
      setLoadingWorkers(true);
      const res = await authService.getWorkers(issue.department?._id);
      setWorkers(res.data.data || []);
      if (res.data.data && res.data.data.length > 0) {
        setSelectedWorker(res.data.data[0]._id);
      }
    } catch (err) {
      setError('Failed to load field workers.');
    } finally {
      setLoadingWorkers(false);
    }
  };

  if (!isOpen || !issue) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWorker) {
      setError('Please select a field worker.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await workflowService.assignIssue(issue._id, {
        workerId: selectedWorker,
        departmentId: issue.department?._id,
        priority,
        instructions
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign issue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-lg max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-slate-800">
              Assign Case: {issue.caseId}
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Worker Assignment *
            </label>
            {loadingWorkers ? (
              <div className="text-xs text-slate-400 py-2">Loading available crew...</div>
            ) : (
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                required
                className="w-full text-xs rounded border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {workers.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} — {w.department?.name || 'Operations'} ({w.phone || 'No phone'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Operational Priority *
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full text-xs rounded border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="P1">P1 - Critical (4 Hours SLA)</option>
              <option value="P2">P2 - High (24 Hours SLA)</option>
              <option value="P3">P3 - Medium (72 Hours SLA)</option>
              <option value="P4">P4 - Low (7 Days SLA)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Operational Instructions
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Inspect storm drain, verify if suction pump truck is needed."
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
              disabled={loading || loadingWorkers}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignModal;
