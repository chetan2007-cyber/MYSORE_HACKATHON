import axios from 'axios';
import env from '../config/env';
import {
  getPendingOfflineReports,
  getOfflineReports,
  updateOfflineReport,
  deleteOfflineReport
} from './offlineStorage';
import { checkApiHealth, updateQueueCount } from './connectivityService';

/**
 * Dedicated Offline Synchronization Engine
 * 
 * Manages reliable queue processing, idempotency header attachment,
 * evidence blob conversion, collision prevention, and sync state listeners.
 */

let syncState = {
  isSyncing: false,
  lastSyncAt: null,
  pendingCount: 0,
  lastResult: null
};

const syncListeners = new Set();

function notifySync() {
  syncListeners.forEach((fn) => {
    try {
      fn({ ...syncState });
    } catch (e) {
      console.error('[SyncService] Listener error:', e);
    }
  });
}

export function subscribeSync(listener) {
  syncListeners.add(listener);
  listener({ ...syncState });
  return () => syncListeners.delete(listener);
}

export function getSyncState() {
  return { ...syncState };
}

/**
 * Refresh local queue counts and notify subscribers
 */
export async function refreshQueueCount() {
  try {
    const pending = await getPendingOfflineReports();
    syncState.pendingCount = pending.length;
    updateQueueCount(pending.length);
    notifySync();
    return pending.length;
  } catch (err) {
    return 0;
  }
}

/**
 * Synchronize all pending offline reports with the backend API
 */
export async function syncOfflineReports() {
  if (syncState.isSyncing) {
    console.log('[SyncService] Synchronization already in progress. Skipping concurrent run.');
    return syncState.lastResult;
  }

  // 1. Verify network and server reachability
  const isHealthy = await checkApiHealth();
  if (!isHealthy) {
    console.log('[SyncService] Backend currently unreachable. Postponing synchronization.');
    return null;
  }

  // 2. Read pending queue entries
  let pendingReports = [];
  try {
    pendingReports = await getPendingOfflineReports();
  } catch (err) {
    console.error('[SyncService] Failed to read IndexedDB queue:', err);
    return null;
  }

  if (pendingReports.length === 0) {
    syncState.pendingCount = 0;
    updateQueueCount(0);
    notifySync();
    return { synced: 0, failed: 0 };
  }

  syncState.isSyncing = true;
  notifySync();

  let syncedCount = 0;
  let failedCount = 0;
  const errors = [];

  const token = localStorage.getItem('civictrack_token');

  for (const report of pendingReports) {
    try {
      // Mark item as active SYNCING
      await updateOfflineReport(report.localId, {
        syncStatus: 'SYNCING',
        lastAttemptAt: new Date().toISOString()
      });
      notifySync();

      // Ensure user authentication is present
      if (!token) {
        await updateOfflineReport(report.localId, {
          syncStatus: 'FAILED',
          lastError: 'Authentication token missing. Please sign in to sync.'
        });
        failedCount++;
        errors.push({ localId: report.localId, error: 'Unauthenticated' });
        continue;
      }

      // Reconstruct multipart FormData with blobs
      const formData = new FormData();
      formData.append('title', report.title);
      formData.append('category', report.category);
      formData.append('description', report.description);
      formData.append('ward', report.ward);
      formData.append('address', report.address);
      formData.append('landmark', report.landmark || '');
      formData.append('priority', report.priority || 'P3');
      formData.append('lat', report.lat || 12.3051);
      formData.append('lng', report.lng || 76.6551);

      // Reconstruct file attachments from IndexedDB stored blobs
      if (report.attachments && report.attachments.length > 0) {
        report.attachments.forEach((att) => {
          if (att.blob) {
            const fileObj = new File([att.blob], att.name, {
              type: att.type || 'application/octet-stream'
            });
            formData.append('attachments', fileObj);
          }
        });
      }

      // Send idempotent submission to backend API
      const res = await axios.post(`${env.apiUrl}/issues`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Idempotency-Key': report.idempotencyKey,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 15000
      });

      if (res.status === 200 || res.status === 201) {
        const serverData = res.data?.data;
        await updateOfflineReport(report.localId, {
          syncStatus: 'SYNCED',
          serverIssueId: serverData?._id || null,
          serverCaseId: serverData?.caseId || null,
          syncedAt: new Date().toISOString(),
          lastError: null
        });
        syncedCount++;
      } else {
        throw new Error(`Unexpected server response code: ${res.status}`);
      }
    } catch (err) {
      // If server detected a duplicate, this report is already safely registered on the server
      if (err.response?.status === 409) {
        const existingCaseId = err.response?.data?.existingCaseId || null;
        console.log(`[SyncService] Report '${report.localId}' resolved as existing server case ${existingCaseId}`);
        await updateOfflineReport(report.localId, {
          syncStatus: 'SYNCED',
          serverCaseId: existingCaseId,
          syncedAt: new Date().toISOString(),
          lastError: null
        });
        syncedCount++;
        continue;
      }

      console.error(`[SyncService] Failed to sync report '${report.localId}':`, err.message);
      failedCount++;

      let errorMsg = 'Failed to sync with server. Will retry automatically.';
      if (err.response?.status === 401) {
        errorMsg = 'Session expired. Please log in to complete synchronization.';
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        errorMsg = 'Network connection timed out during upload. Retrying...';
      }

      await updateOfflineReport(report.localId, {
        syncStatus: 'FAILED',
        retryCount: (report.retryCount || 0) + 1,
        lastError: errorMsg
      });

      errors.push({ localId: report.localId, error: errorMsg });

      // If token expired, halt loop
      if (err.response?.status === 401) {
        break;
      }
    }
  }

  // Update final state
  syncState.isSyncing = false;
  syncState.lastSyncAt = new Date();
  syncState.lastResult = { synced: syncedCount, failed: failedCount, errors };

  await refreshQueueCount();
  notifySync();

  // Dispatch global DOM event for UI components (e.g. My Reports page) to reload
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('civictrack:synced', {
        detail: { syncedCount, failedCount }
      })
    );
  }

  return syncState.lastResult;
}

// Background event listener registrations
if (typeof window !== 'undefined') {
  // 1. Trigger when browser regains connection
  window.addEventListener('online', () => {
    console.log('[SyncService] Online event detected. Initiating background sync...');
    setTimeout(() => {
      syncOfflineReports();
    }, 1500);
  });

  // 2. Trigger when app returns to foreground / tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshQueueCount().then((count) => {
        if (count > 0 && navigator.onLine) {
          syncOfflineReports();
        }
      });
    }
  });

  // 3. Initial count refresh on startup
  setTimeout(() => {
    refreshQueueCount().then((count) => {
      if (count > 0 && navigator.onLine) {
        syncOfflineReports();
      }
    });
  }, 2000);
}

export default {
  syncOfflineReports,
  refreshQueueCount,
  subscribeSync,
  getSyncState
};
