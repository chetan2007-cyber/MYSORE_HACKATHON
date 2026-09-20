import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { workflowService } from '../services/api';

const ResolutionModal = ({ isOpen, onClose, issue, onSuccess }) => {
  const [notes, setNotes] = useState('');
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !issue) return null;

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Please provide detailed notes describing what work was completed.');
      return;
    }
    if (files.length === 0) {
      setError('At least one physical AFTER photograph is required as proof of resolution.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('notes', notes.trim());
      formData.append('completionRemarks', completionRemarks.trim());
      files.forEach((file) => {
        formData.append('evidence', file);
      });

      await workflowService.submitResolution(issue._id, formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit resolution evidence.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-lg max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-slate-800">
              Submit Resolution Evidence: {issue.caseId}
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
              Remediation Notes *
            </label>
            <textarea
              rows={3}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared 3 tonnes of roadside debris and disinfected the pavement with bleaching powder."
              className="w-full text-xs rounded border border-slate-300 p-2.5 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Completion Remarks
            </label>
            <input
              type="text"
              value={completionRemarks}
              onChange={(e) => setCompletionRemarks(e.target.value)}
              placeholder="e.g. Crew Team 4, vehicle KA-09-EA-4122 deployed"
              className="w-full text-xs rounded border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Upload After Photographs (Physical Proof) *
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-lg p-4 text-center cursor-pointer transition bg-slate-50/50">
              <input
                type="file"
                multiple
                accept="image/*,video/mp4"
                onChange={handleFileChange}
                className="hidden"
                id="resolution-files"
              />
              <label htmlFor="resolution-files" className="cursor-pointer block">
                <UploadCloud className="w-7 h-7 mx-auto text-slate-400 mb-1" />
                <span className="text-xs font-medium text-brand-600 hover:text-brand-700">
                  Click to choose photographs
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  JPG, PNG, WEBP up to 25MB
                </p>
              </label>
            </div>

            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                <span className="text-[11px] font-semibold text-slate-600">
                  Selected Files ({files.length}):
                </span>
                <ul className="text-[11px] text-slate-500 list-disc list-inside">
                  {files.map((f, i) => (
                    <li key={i}>{f.name} ({(f.size / 1024).toFixed(1)} KB)</li>
                  ))}
                </ul>
              </div>
            )}
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
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded transition disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Submit for Officer Verification
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResolutionModal;
