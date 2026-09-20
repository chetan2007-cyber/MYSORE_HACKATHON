import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  ArrowUpCircle
} from 'lucide-react';
import { useConnectivity } from '../services/connectivityService';
import {
  syncOfflineReports,
  subscribeSync,
  getSyncState,
  refreshQueueCount
} from '../services/syncService';

const ConnectivityStatus = () => {
  const { isBrowserOnline, isApiReachable, status } = useConnectivity();
  const [syncInfo, setSyncInfo] = useState(() => getSyncState());
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    refreshQueueCount();
    const unsub = subscribeSync(setSyncInfo);
    return unsub;
  }, []);

  const handleManualSync = async (e) => {
    if (e) e.stopPropagation();
    await syncOfflineReports();
  };

  const isOnline = isBrowserOnline && isApiReachable;
  const isOffline = !isBrowserOnline;
  const isServerDown = isBrowserOnline && !isApiReachable;
  const pendingCount = syncInfo.pendingCount || 0;

  return (
    <div className="flex items-center gap-2">
      {/* 1. Syncing State */}
      {syncInfo.isSyncing ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold shadow-2xs animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
          <span>Syncing queue...</span>
        </div>
      ) : isOffline ? (
        /* 2. Fully Offline */
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold shadow-2xs"
            title="Your device is disconnected from the internet. Reports will be saved locally in IndexedDB."
          >
            <WifiOff className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Offline</span>
            {pendingCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-950 font-mono text-[10px]">
                {pendingCount} queued
              </span>
            )}
          </div>
        </div>
      ) : isServerDown ? (
        /* 3. Online but API Unreachable */
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold shadow-2xs"
            title="Internet is available, but the CivicTrack backend is not responding."
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Server Unreachable</span>
            {pendingCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-950 font-mono text-[10px]">
                {pendingCount}
              </span>
            )}
          </div>
        </div>
      ) : pendingCount > 0 ? (
        /* 4. Online with Pending Reports Waiting for Sync */
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 border border-sky-300 text-sky-900 text-xs font-semibold shadow-2xs">
            <CloudUpload className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>{pendingCount} to sync</span>
          </div>
          <button
            type="button"
            onClick={handleManualSync}
            className="px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
            title="Synchronize offline reports now"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Sync Now</span>
          </button>
        </div>
      ) : (
        /* 5. Healthy Online */
        <div
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-[11px] font-medium"
          title="Online — CivicTrack backend connected"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>Online</span>
        </div>
      )}
    </div>
  );
};

export default ConnectivityStatus;
