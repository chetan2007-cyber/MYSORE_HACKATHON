/**
 * CivicTrack Durable Offline Storage Service (IndexedDB)
 * 
 * Provides robust, zero-dependency browser-durable persistence for offline
 * report submissions, surviving page reloads, browser restarts, and device reboots.
 */

const DB_NAME = 'CivicTrackOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offlineReports';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this browser environment.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('idempotencyKey', 'idempotencyKey', { unique: true });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Failed to open IndexedDB database.'));
    };
  });

  return dbPromise;
}

/**
 * Generate a cryptographically secure UUID or fallback
 */
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Save a newly created civic report into the local offline queue
 */
export async function saveOfflineReport({
  title,
  category,
  description,
  ward,
  address,
  landmark = '',
  priority = 'P3',
  lat = 12.3051,
  lng = 76.6551,
  files = []
}) {
  const db = await openDB();

  const timestamp = new Date().toISOString();
  const localId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const idempotencyKey = generateId();

  // Convert File objects to serializable attachment structures with Blob
  const attachments = (files || []).map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    blob: file // IndexedDB natively clones Blobs without conversion
  }));

  const reportRecord = {
    localId,
    idempotencyKey,
    title: (title || '').trim(),
    category,
    description: (description || '').trim(),
    ward,
    address: (address || '').trim(),
    landmark: (landmark || '').trim(),
    priority,
    lat: Number(lat) || 12.3051,
    lng: Number(lng) || 76.6551,
    attachments,
    attachmentCount: attachments.length,
    syncStatus: 'QUEUED', // 'QUEUED' | 'SYNCING' | 'SYNCED' | 'FAILED'
    retryCount: 0,
    lastAttemptAt: null,
    lastError: null,
    serverIssueId: null,
    serverCaseId: null,
    syncedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(reportRecord);

    req.onsuccess = () => resolve(reportRecord);
    req.onerror = () => reject(req.error || new Error('Failed to save offline report.'));
  });
}

/**
 * Retrieve all offline reports from IndexedDB
 */
export async function getOfflineReports() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const items = req.result || [];
      // Sort newest first
      items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      resolve(items);
    };
    req.onerror = () => reject(req.error || new Error('Failed to fetch offline reports.'));
  });
}

/**
 * Retrieve pending queue items (QUEUED or FAILED)
 */
export async function getPendingOfflineReports() {
  const all = await getOfflineReports();
  return all.filter((item) => item.syncStatus === 'QUEUED' || item.syncStatus === 'FAILED');
}

/**
 * Retrieve a specific offline report by local ID
 */
export async function getOfflineReportById(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(localId);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error(`Failed to fetch report ${localId}.`));
  });
}

/**
 * Update an existing offline report status / metadata
 */
export async function updateOfflineReport(localId, updates) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(localId);

    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) {
        return reject(new Error(`Offline report '${localId}' not found.`));
      }

      const merged = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const putReq = store.put(merged);
      putReq.onsuccess = () => resolve(merged);
      putReq.onerror = () => reject(putReq.error || new Error('Failed to update offline report.'));
    };

    getReq.onerror = () => reject(getReq.error || new Error('Failed to retrieve record for update.'));
  });
}

/**
 * Delete an offline report (e.g. if user discards draft or after purge)
 */
export async function deleteOfflineReport(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(localId);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error || new Error(`Failed to delete report ${localId}.`));
  });
}

/**
 * Clear successfully synchronized reports older than specified days
 */
export async function clearSyncedReports(daysOld = 7) {
  const all = await getOfflineReports();
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  const toDelete = all.filter((r) => r.syncStatus === 'SYNCED' && new Date(r.syncedAt).getTime() < cutoff);

  for (const r of toDelete) {
    await deleteOfflineReport(r.localId);
  }
}
