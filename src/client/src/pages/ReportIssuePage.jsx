import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  MapPin,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { issueService } from '../services/api';
import { CIVIC_CATEGORIES, MYSURU_WARDS } from '../constants';

import { saveOfflineReport } from '../services/offlineStorage';
import { refreshQueueCount } from '../services/syncService';
import { WifiOff, CloudUpload } from 'lucide-react';

const ReportIssuePage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    category: 'Sanitation & Waste',
    description: '',
    ward: MYSURU_WARDS[0].ward,
    address: '',
    landmark: '',
    priority: 'P3'
  });

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState(null);
  const [duplicateCaseId, setDuplicateCaseId] = useState(null);
  const [registeredCase, setRegisteredCase] = useState(null);
  const [offlineQueuedRecord, setOfflineQueuedRecord] = useState(null);

  // Manual GPS / Coordinates Override for Evaluation Testing
  const [overrideCoords, setOverrideCoords] = useState(false);
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.address) {
      setError('Please fill in all mandatory fields: title, description, and street address.');
      setErrorCode(null);
      setDuplicateCaseId(null);
      return;
    }

    const selectedWardObj = MYSURU_WARDS.find((w) => w.ward === formData.ward) || MYSURU_WARDS[0];
    const targetLat = overrideCoords && customLat !== '' ? customLat : selectedWardObj.lat;
    const targetLng = overrideCoords && customLng !== '' ? customLng : selectedWardObj.lng;

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    // 1. Direct offline handling: save immediately to local IndexedDB queue
    if (isOffline) {
      try {
        setLoading(true);
        setError('');
        setErrorCode(null);
        setDuplicateCaseId(null);
        const saved = await saveOfflineReport({
          ...formData,
          lat: targetLat,
          lng: targetLng,
          files
        });
        await refreshQueueCount();
        setOfflineQueuedRecord(saved);
        return;
      } catch (err) {
        setError('Failed to persist report to local offline queue: ' + err.message);
        return;
      } finally {
        setLoading(false);
      }
    }

    // 2. Online handling: attach idempotency key, submit to backend
    try {
      setLoading(true);
      setError('');
      setErrorCode(null);
      setDuplicateCaseId(null);

      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const data = new FormData();
      data.append('title', formData.title.trim());
      data.append('category', formData.category);
      data.append('description', formData.description.trim());
      data.append('ward', formData.ward);
      data.append('address', formData.address.trim());
      data.append('landmark', formData.landmark.trim());
      data.append('priority', formData.priority);
      data.append('lat', targetLat);
      data.append('lng', targetLng);

      files.forEach((file) => {
        data.append('attachments', file);
      });

      const res = await issueService.createIssue(data, {
        headers: { 'X-Idempotency-Key': idempotencyKey }
      });
      setRegisteredCase(res.data.data);
    } catch (err) {
      // 3. Fallback: If network drops during online submission, preserve report locally
      const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || !navigator.onLine;
      if (isNetworkError) {
        console.warn('Network transmission failed. Saving report to local offline queue...');
        try {
          const saved = await saveOfflineReport({
            ...formData,
            lat: targetLat,
            lng: targetLng,
            files
          });
          await refreshQueueCount();
          setOfflineQueuedRecord(saved);
          return;
        } catch (storageErr) {
          setError('Network disconnected and local offline save failed: ' + storageErr.message);
          return;
        }
      }
      const respData = err.response?.data;
      setErrorCode(respData?.code || null);
      setDuplicateCaseId(respData?.existingCaseId || null);
      setError(respData?.message || 'Failed to submit civic issue report.');
    } finally {
      setLoading(false);
    }
  };

  // If saved offline, show honest local queue confirmation screen
  if (offlineQueuedRecord) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <div className="bg-white rounded-xl border border-amber-300 p-8 shadow-sm text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
            <CloudUpload className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
              Offline / Queued for Sync
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
              Report Saved to Offline Queue
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              Your civic complaint has been saved locally on this device. It will synchronize automatically with the CivicTrack municipal backend when internet connectivity returns.
            </p>
          </div>

          {/* Honest Queue Status Banner */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-left text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">No server Case ID assigned yet:</strong>
              <p className="text-[11px] text-amber-800 mt-0.5">
                The official Case ID (e.g. CT-2026-XXXXXX) will be generated by the municipal server upon synchronization. Your evidence and coordinates are safely preserved.
              </p>
            </div>
          </div>

          {/* Local Record Details Card */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-5 text-left text-xs space-y-3 font-mono">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-sans">Local Queue Reference:</span>
              <span className="text-xs font-bold text-amber-900 font-mono">
                {offlineQueuedRecord.localId}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-sans">Queue Status:</span>
              <span className="font-semibold text-amber-800 font-sans px-2 py-0.5 rounded bg-amber-100 border border-amber-300">
                Waiting for connection
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-sans">Category & Priority:</span>
              <span className="font-medium text-slate-800 font-sans">
                {offlineQueuedRecord.category} ({offlineQueuedRecord.priority})
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-sans">Ward / Location:</span>
              <span className="font-medium text-slate-800 font-sans truncate max-w-[200px]">
                {offlineQueuedRecord.ward}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans">Stored Evidence:</span>
              <span className="font-medium text-slate-800 font-sans">
                {offlineQueuedRecord.attachmentCount || 0} photo attachment(s) preserved
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/my-reports"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition flex items-center gap-1.5 shadow-xs"
            >
              <span>View in My Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => {
                setOfflineQueuedRecord(null);
                setFormData({
                  title: '',
                  category: 'Sanitation & Waste',
                  description: '',
                  ward: MYSURU_WARDS[0].ward,
                  address: '',
                  landmark: '',
                  priority: 'P3'
                });
                setFiles([]);
              }}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
            >
              Report Another Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If successfully registered, show confirmation screen
  if (registeredCase) {
    const expectedHours =
      registeredCase.priority === 'P1'
        ? '4 hours'
        : registeredCase.priority === 'P2'
        ? '24 hours'
        : registeredCase.priority === 'P3'
        ? '72 hours'
        : '7 days';

    return (
      <div className="max-w-xl mx-auto py-8">
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              CivicTrack Accountability Registration
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Your issue has been registered.
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              A municipal case lifecycle has commenced. This complaint cannot be silently ignored or marked resolved without verified evidence.
            </p>
          </div>

          {/* Registration Details Card */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-5 text-left text-xs space-y-3 font-mono">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-sans">Official Case ID:</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {registeredCase.caseId}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-sans">Current Status:</span>
              <span className="font-semibold text-sky-700 font-sans px-2 py-0.5 rounded bg-sky-50 border border-sky-200">
                {registeredCase.status}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-sans">Expected SLA Window:</span>
              <span className="font-semibold text-slate-800 font-sans flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {expectedHours}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans">Department Route:</span>
              <span className="font-medium text-slate-800 font-sans">
                {registeredCase.department?.name || 'Assigned to Triage Queue'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to={`/issues/${registeredCase._id}`}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition flex items-center gap-1.5 shadow-xs"
            >
              <span>Track Case Timeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => {
                setRegisteredCase(null);
                setFormData({
                  title: '',
                  category: 'Sanitation & Waste',
                  description: '',
                  ward: MYSURU_WARDS[0].ward,
                  address: '',
                  landmark: '',
                  priority: 'P3'
                });
                setFiles([]);
              }}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
            >
              Report Another Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Report a Civic Issue
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Provide accurate details and photos to initiate an auditable municipal resolution workflow.
        </p>
      </div>

      {error && (
        <div
          className={`p-4 rounded-lg border text-xs flex items-start gap-3 shadow-xs ${
            errorCode === 'DUPLICATE_REPORT'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : errorCode === 'ABUSIVE_CONTENT'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : errorCode === 'INVALID_LOCATION'
              ? 'bg-orange-50 border-orange-300 text-orange-900'
              : errorCode === 'INVALID_IMAGE_FILE'
              ? 'bg-purple-50 border-purple-300 text-purple-900'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          <AlertCircle
            className={`w-5 h-5 shrink-0 mt-0.5 ${
              errorCode === 'DUPLICATE_REPORT'
                ? 'text-amber-600'
                : errorCode === 'ABUSIVE_CONTENT'
                ? 'text-rose-600'
                : errorCode === 'INVALID_LOCATION'
                ? 'text-orange-600'
                : errorCode === 'INVALID_IMAGE_FILE'
                ? 'text-purple-600'
                : 'text-rose-600'
            }`}
          />
          <div className="space-y-1">
            <div className="font-semibold text-sm">
              {errorCode === 'DUPLICATE_REPORT' && 'Duplicate Report Detected'}
              {errorCode === 'ABUSIVE_CONTENT' && 'Content Moderation Rejection'}
              {errorCode === 'INVALID_LOCATION' && 'Invalid Coordinates Rejection'}
              {errorCode === 'INVALID_IMAGE_FILE' && 'Invalid Attachment Signature'}
              {!errorCode && 'Submission Error'}
            </div>
            <p>{error}</p>
            {errorCode === 'DUPLICATE_REPORT' && duplicateCaseId && (
              <div className="pt-2 flex items-center gap-2">
                <span className="text-[11px] text-amber-800">Existing Case ID: <strong>{duplicateCaseId}</strong></span>
                <Link
                  to={`/issues?search=${duplicateCaseId}`}
                  className="px-2.5 py-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 font-semibold text-[11px] transition inline-flex items-center gap-1"
                >
                  <span>View Existing Case</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
            {errorCode === 'INVALID_LOCATION' && (
              <p className="text-[11px] text-orange-700 font-mono pt-1">
                Valid latitude: -90.0 to +90.0 | Valid longitude: -180.0 to +180.0
              </p>
            )}
            {errorCode === 'INVALID_IMAGE_FILE' && (
              <p className="text-[11px] text-purple-700 font-mono pt-1">
                Enforced by binary magic bytes: JPEG (FF D8 FF), PNG (89 50 4E 47), WebP, MP4
              </p>
            )}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-4"
      >
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Issue Title *
          </label>
          <input
            type="text"
            required
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g. Deep crater pothole outside Infosys Gate 2"
            className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {CIVIC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Urgency / Priority
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="P1">P1 - Critical Hazard (4 Hours SLA)</option>
              <option value="P2">P2 - High Priority (24 Hours SLA)</option>
              <option value="P3">P3 - Medium Priority (72 Hours SLA)</option>
              <option value="P4">P4 - Low Priority (7 Days SLA)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Detailed Description *
          </label>
          <textarea
            rows={4}
            required
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe the problem, severity, obstruction to pedestrians/vehicles, and safety hazards..."
            className="w-full text-xs rounded-md border border-slate-300 p-2.5 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mysuru Ward / Neighborhood *
            </label>
            <select
              name="ward"
              value={formData.ward}
              onChange={handleInputChange}
              className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {MYSURU_WARDS.map((w) => (
                <option key={w.ward} value={w.ward}>
                  {w.ward}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nearby Landmark
            </label>
            <input
              type="text"
              name="landmark"
              value={formData.landmark}
              onChange={handleInputChange}
              placeholder="e.g. Opposite Marimallappa College"
              className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Specific Street Address / Cross Road *
          </label>
          <input
            type="text"
            required
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="e.g. 5th Main, 3rd Cross, Kuvempunagar Double Road"
            className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* GPS Coordinates Testing Override */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              Geographic Coordinates
            </span>
            <button
              type="button"
              onClick={() => {
                const toggled = !overrideCoords;
                setOverrideCoords(toggled);
                if (toggled && (!customLat || !customLng)) {
                  const selectedWardObj = MYSURU_WARDS.find((w) => w.ward === formData.ward) || MYSURU_WARDS[0];
                  setCustomLat(selectedWardObj.lat);
                  setCustomLng(selectedWardObj.lng);
                }
              }}
              className="text-[11px] font-medium text-brand-600 hover:text-brand-700 underline cursor-pointer"
            >
              {overrideCoords ? 'Reset to Ward Default' : 'Override / Test Custom Coordinates'}
            </button>
          </div>

          {overrideCoords ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Latitude (-90 to +90)
                </label>
                <input
                  type="text"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  placeholder="e.g. 12.3051 or 200 (test)"
                  className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Longitude (-180 to +180)
                </label>
                <input
                  type="text"
                  value={customLng}
                  onChange={(e) => setCustomLng(e.target.value)}
                  placeholder="e.g. 76.6551 or 300 (test)"
                  className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                />
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 font-mono">
              Defaulted to Mysuru GIS centroid for selected ward: ({MYSURU_WARDS.find((w) => w.ward === formData.ward)?.lat || 12.3051}, {MYSURU_WARDS.find((w) => w.ward === formData.ward)?.lng || 76.6551})
            </p>
          )}
        </div>

        {/* Photo / Video Attachment */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Attach Photograph / Video (Recommended)
          </label>
          <div className="border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-lg p-5 text-center cursor-pointer transition bg-slate-50/50">
            <input
              type="file"
              multiple
              accept="image/*,video/mp4"
              onChange={handleFileChange}
              className="hidden"
              id="report-files"
            />
            <label htmlFor="report-files" className="cursor-pointer block">
              <UploadCloud className="w-8 h-8 mx-auto text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                Click to attach photo evidence
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Visual proof speeds up triage and dispatch • Max 25MB
              </p>
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              <span className="text-[11px] font-semibold text-slate-600">
                Selected Attachments ({files.length}):
              </span>
              <ul className="text-[11px] text-slate-500 list-disc list-inside">
                {files.map((f, i) => (
                  <li key={i}>{f.name} ({(f.size / 1024).toFixed(1)} KB)</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition disabled:opacity-50 shadow-xs"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Register Civic Issue
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportIssuePage;
