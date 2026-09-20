# CivicTrack Offline-First Architecture & Synchronization Engine

## 1. Executive Summary

CivicTrack is engineered as an **offline-first progressive web application (PWA)** ensuring that civic issue reporting remains 100% operational in areas with unstable, intermittent, or absent cellular connectivity (e.g., basements, rural ward boundaries, disaster zones, or mobile dead zones across Mysuru).

The architecture adheres to strict civic governance principles:
- **No Mock / Fake Success**: When offline, reports are explicitly labeled as `OFFLINE / QUEUED FOR SYNC`. No false claim is made that the municipal server or MongoDB has received the record.
- **Durable Local Storage**: Reports and multipart photo evidence are persisted in browser-durable **IndexedDB** (`CivicTrackOfflineDB`), surviving browser restarts, device reboots, and page refreshes.
- **Idempotent Synchronization**: Every locally-created report generates a collision-resistant UUID `idempotencyKey` prior to submission. Retries and network reconnects guarantee zero duplicate tickets in MongoDB.
- **Service Worker Precaching**: The application shell and static assets are cached via Workbox, allowing citizens to load the app shell and create reports without an active internet connection.

---

## 2. Core Architectural Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Browser (PWA)                     │
│                                                             │
│   ┌──────────────────┐               ┌──────────────────┐   │
│   │  Service Worker  │               │    IndexedDB     │   │
│   │ (Workbox Precache│               │ (offlineReports  │   │
│   │  App Shell & CDN)│               │  Blob Evidence)  │   │
│   └────────▲─────────┘               └────────▲─────────┘   │
│            │                                  │             │
│   ┌────────┴──────────────────────────────────┴─────────┐  │
│   │       Offline Sync Engine (syncService.js)           │  │
│   │  - Idempotency Header: X-Idempotency-Key             │  │
│   │  - Connectivity Detection & Health Check             │  │
│   │  - Automatic & Manual "Sync Now" Triggers            │  │
│   └──────────────────────────┬───────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────┘
                               │
                      HTTP / Multipart
               (X-Idempotency-Key: UUID)
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  CivicTrack Express Backend                 │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │    Idempotent Issue Gateway (issueController.js)    │   │
│   │  1. Check existing Issue by idempotencyKey          │   │
│   │  2. If found: Return 200 { isDuplicate: true }      │   │
│   │  3. If new: Create Issue with Sparse Unique Index   │   │
│   │  4. Race condition fallback (E11000 duplicate key)  │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              │                              │
│   ┌──────────────────────────▼──────────────────────────┐   │
│   │                 MongoDB Database                    │   │
│   │  - Collection: issues                               │   │
│   │  - Sparse Unique Index: { idempotencyKey: 1 }       │   │
│   │  - State: REPORTED (Official Case ID CT-2026-XXXXXX)│   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Specifications

### 3.1. Service Worker & Caching Strategy (`vite.config.js`)
- **App Shell Precaching**: `index.html`, JavaScript bundles, CSS stylesheets, SVGs, and web manifest are automatically version-hashed and cached during build.
- **Static Asset Cache**: Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) and Leaflet map stylesheets (`unpkg.com/leaflet`) use a `CacheFirst` policy (30-day to 1-year TTL).
- **Security Boundary**: All API routes (`/api/*`) are strictly configured with `NetworkOnly`. Under no circumstances are private citizen complaint data, JWT tokens, or authenticated responses cached in the public browser service worker cache.
- **SPA Offline Routing**: Navigation requests while offline fall back to the cached `index.html` shell, allowing client-side React Router to resolve `/my-reports`, `/report`, `/worker`, etc.

### 3.2. Durable Browser Storage (`offlineStorage.js`)
- **Database**: `CivicTrackOfflineDB` (Version 1).
- **Object Store**: `offlineReports`, with primary key `localId` (format: `offline_${timestamp}_${rand}`).
- **Indexes**:
  - `syncStatus`: Querying items in `QUEUED`, `SYNCING`, `SYNCED`, or `FAILED` state.
  - `createdAt`: Chronological ordering.
  - `idempotencyKey`: Unique constraint ensuring zero local duplication.
- **Evidence Blob Support**: Uses the native IndexedDB Structured Clone algorithm to store binary `Blob` and `File` objects directly without lossy base64 encoding or memory overhead.

### 3.3. Idempotency & Duplicate Prevention (`issueController.js`)
- **Idempotency Key Generation**: Generated client-side using `crypto.randomUUID()` when the report is first drafted offline.
- **Server-Side Validation**:
  1. The controller inspects `req.headers['x-idempotency-key']`.
  2. An indexed query `Issue.findOne({ idempotencyKey })` checks for existing documents.
  3. If found: Returns the existing document immediately with HTTP 200 and `{ isDuplicate: true }`.
  4. If new: Passes `idempotencyKey` to `Issue.create(...)`.
  5. **Concurrency Race Guard**: In the event that two identical requests arrive simultaneously, MongoDB's sparse unique index rejects the second with error code `11000`. The catch block catches `11000` and retrieves the created ticket, guaranteeing idempotent consistency.

### 3.4. Network Connectivity Detection (`connectivityService.js`)
- Does **not** assume `navigator.onLine === true` guarantees API reachability.
- Combines browser `online` / `offline` events with periodic lightweight health pings to `GET /api/health` with a 3.5s timeout.
- Classifies 4 distinct states:
  1. `ONLINE`: Browser connected, backend responsive.
  2. `OFFLINE`: Hardware/browser disconnected.
  3. `API_UNREACHABLE`: Network active (e.g., captive portal or backend restart), but API server down.
  4. `SYNCING`: Background queue processing in progress.

### 3.5. Dedicated Synchronization Engine (`syncService.js`)
- **Concurrency Mutex**: An internal lock flag prevents parallel sync runs from clashing.
- **Batch Processing**: Reads all `QUEUED` and `FAILED` records from IndexedDB.
- **Multipart Reconstruction**: Rebuilds `FormData` appending stored `Blob`s as `File` objects.
- **Automatic Triggers**:
  1. Browser `online` event.
  2. Tab visibility change (`document.visibilityState === 'visible'`).
  3. Application startup.
  4. Manual citizen click on `[Sync Now]` button.
- **Error Classification**:
  - `401 Unauthorized`: Token expired; flags item with "Session expired. Sign in to sync", halts loop without deleting user data.
  - `400 Validation Error`: Server validation failed; flags `FAILED` with explicit field error.
  - `Network / 5xx`: Increments `retryCount`, preserves in queue for automatic retry.

---

## 4. What Works Offline vs. What Does Not

| Capability | Offline Support | Implementation Details |
| :--- | :---: | :--- |
| **Load Application Shell** | ✅ YES | Service Worker serves cached React bundle & styles. |
| **Navigate Existing Cached Views** | ✅ YES | React Router resolves cached pages without network. |
| **Preserve Authenticated Session** | ✅ YES | `AuthContext` retains cached user; network errors do not log out. |
| **Open Report Form** | ✅ YES | `/report` opens with Mysuru ward selector and form validation. |
| **Capture Coordinates & Ward** | ✅ YES | Pre-configured Mysuru ward coordinates and manual addresses. |
| **Attach Photo Evidence** | ✅ YES | Files preserved as raw binary Blobs in IndexedDB. |
| **Save Report Offline** | ✅ YES | Persists to IndexedDB with status `QUEUED FOR SYNC`. |
| **View Queued Reports in My Reports** | ✅ YES | `/my-reports` displays offline items at the top with badge. |
| **Automatic Reconnect Synchronization** | ✅ YES | Sync engine uploads on reconnect with idempotency key. |
| **Manual Sync Now Fallback** | ✅ YES | Visible button allows citizen to force immediate upload. |
| **New Citizen Registration** | ❌ NO | Requires real-time SMS/Email OTP verification with server. |
| **First-Time Account Login** | ❌ NO | Requires server-side bcrypt password check and JWT issuance. |
| **Field Worker Assignment Status Change** | ❌ NO | Municipal accountability requires live server verification. |
| **Supervisor Escalation Resolution** | ❌ NO | Requires live administrative database audit logging. |

---

## 5. Storage Limitations & Resilience
- **Browser Quotas**: IndexedDB generally supports up to 60% of available disk space on Chromium browsers (>10 GB).
- **Attachment Size Policy**: CivicTrack enforces a client-side limit of 25MB total attachments per report to prevent browser memory exhaustion.
- **Purge Strategy**: Once synchronized, local records are marked `SYNCED`. An automated cleanup job (`clearSyncedReports`) clears synced entries older than 7 days, preventing indefinite storage growth while giving citizens immediate confirmation.
