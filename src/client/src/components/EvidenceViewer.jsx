import React, { useState } from 'react';
import { Camera, CheckCircle2, AlertTriangle, ExternalLink, X } from 'lucide-react';
import { formatDateTime } from '../utils/formatters';

const EvidenceViewer = ({ resolution, attachments = [] }) => {
  const [activeModalImage, setActiveModalImage] = useState(null);

  const beforeImages =
    resolution?.beforeImages && resolution.beforeImages.length > 0
      ? resolution.beforeImages
      : attachments.map(a => a.path);

  const afterImages = resolution?.afterImages || [];

  const hasEvidence = beforeImages.length > 0 || afterImages.length > 0;

  if (!hasEvidence && !resolution?.notes) {
    return (
      <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
        No physical resolution evidence has been uploaded for this case yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Evidence Side-by-Side Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Before Evidence */}
        <div className="border border-slate-200 rounded-lg p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
              BEFORE REMEDIATION
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {beforeImages.length} Image(s)
            </span>
          </div>

          {beforeImages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {beforeImages.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveModalImage(img)}
                  className="group relative aspect-4/3 rounded border border-slate-200 overflow-hidden bg-slate-100 cursor-pointer"
                >
                  <img
                    src={img}
                    alt={`Before evidence ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded">
              No initial photograph attached.
            </div>
          )}
        </div>

        {/* After Evidence */}
        <div className="border border-slate-200 rounded-lg p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              AFTER REMEDIATION (COMPLETED)
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {afterImages.length} Image(s)
            </span>
          </div>

          {afterImages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {afterImages.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveModalImage(img)}
                  className="group relative aspect-4/3 rounded border border-slate-200 overflow-hidden bg-slate-100 cursor-pointer"
                >
                  <img
                    src={img}
                    alt={`After evidence ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded">
              Awaiting worker resolution submission.
            </div>
          )}
        </div>
      </div>

      {/* Resolution Notes & Verification Status */}
      {resolution?.notes && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900">Worker Completion Notes:</span>
            {resolution.submittedAt && (
              <span className="text-slate-400 font-mono">
                Submitted {formatDateTime(resolution.submittedAt)}
              </span>
            )}
          </div>
          <p className="leading-relaxed">{resolution.notes}</p>
          {resolution.completionRemarks && (
            <p className="text-slate-500 italic">
              Remarks: "{resolution.completionRemarks}"
            </p>
          )}

          {/* Verification Status */}
          {resolution.verificationStatus && (
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-600">Verification:</span>
                {resolution.verificationStatus === 'APPROVED' && (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved by{' '}
                    {resolution.verifiedBy?.name || 'Officer'}
                  </span>
                )}
                {resolution.verificationStatus === 'REJECTED' && (
                  <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" /> Rejected by{' '}
                    {resolution.verifiedBy?.name || 'Officer'}
                  </span>
                )}
                {resolution.verificationStatus === 'PENDING' && (
                  <span className="text-amber-700 font-medium">
                    Pending Officer Verification
                  </span>
                )}
              </div>
              {resolution.verifiedAt && (
                <span className="text-slate-400 font-mono">
                  {formatDateTime(resolution.verifiedAt)}
                </span>
              )}
            </div>
          )}

          {resolution.rejectionReason && (
            <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px]">
              <span className="font-semibold">Rejection reason:</span>{' '}
              {resolution.rejectionReason}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {activeModalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setActiveModalImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg p-2 shadow-2xl">
            <button
              onClick={() => setActiveModalImage(null)}
              className="absolute -top-3 -right-3 p-1.5 rounded-full bg-slate-800 text-white hover:bg-black transition"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={activeModalImage}
              alt="Enlarged evidence"
              className="max-h-[80vh] w-auto rounded object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceViewer;
