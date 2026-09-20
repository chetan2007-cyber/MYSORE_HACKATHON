# CivicTrack

> **"From reported to resolved."**  
> *Making every civic issue accountable from report to resolution.*

CivicTrack is a production-quality civic-tech web application built to solve the **"follow-through"** failure in civic governance. Rather than being an open-ended complaint registry, CivicTrack enforces strict operational accountability: every legitimate issue moves through an auditable, multi-stage state machine from report to physical resolution verification and citizen sign-off.

---

## The Core Problem Solved: Follow-Through

In municipal operations, citizens frequently report issues, but reporting alone rarely guarantees remediation. CivicTrack eliminates:
- Complaints getting ignored or lost in backlogs
- Complaints remaining unassigned without clear ownership
- Lack of visibility into work actually in progress
- Untracked SLA deadlines and delayed resolutions
- No physical proof that work was actually completed
- Cases being marked resolved without physical verification
- Citizens being excluded from confirming resolution

---

## Real Case Lifecycle State Machine

CivicTrack enforces an auditable state transition engine in the backend:

```
REPORTED
   ↓
UNDER_REVIEW
   ↓
ASSIGNED
   ↓
ACKNOWLEDGED
   ↓
IN_PROGRESS (can move to ON_HOLD & back)
   ↓
RESOLUTION_SUBMITTED (Mandatory Before/After Evidence)
   ↓
VERIFICATION_REQUIRED (Officer Physical Inspection)
   ↓ (If Approved)          (If Rejected)
RESOLVED ─────────────────→ IN_PROGRESS (with reason)
   ↓
[Citizen Confirmation Gate]
   ├── YES, RESOLVED  ──────→ CLOSED
   └── NO, PROBLEM PERSISTS → REOPENED (Auto-Escalation to Supervisor)
```

---

## Role-Based Access Control (RBAC)

CivicTrack provides tailored interfaces for 5 operational roles:

| Role | Responsibilities | Key Capabilities |
| :--- | :--- | :--- |
| **CITIZEN** | Public reporters | Report issues with photos/wards, track chronological timeline, verify resolution or reopen. |
| **FIELD_WORKER** | Remediation crews | View "Today's Work", acknowledge tasks, start work on site, log progress, upload before/after proof. |
| **OFFICER** | Triage & dispatch | Review incoming reports, assign workers, set priority & SLAs, inspect resolution proof, approve or reject. |
| **SUPERVISOR** | Department oversight | Monitor SLA breaches, reassign overdue cases, resolve active escalations, review department metrics. |
| **ADMIN** | System administration | Complete access across all departments, system audit log, user management, global oversight. |

---

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, React Router v6, Axios, Lucide React, Leaflet & React-Leaflet (2D map).
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Local Mongoose ODM).
- **Authentication**: JWT authentication with bcryptjs password hashing and role authorization middleware.
- **Storage**: Local multipart file storage under `server/uploads/`.

---

## Project Structure

```
civictrack/
├── client/
│   ├── src/
│   │   ├── components/       # StatusBadge, PriorityBadge, SlaBadge, CaseTimeline, EvidenceViewer, InteractiveMap, Modals
│   │   ├── pages/            # Dashboard, Issues, IssueDetail, Citizen, Report, Worker, Escalations, Departments, Analytics, AuditLog, Map
│   │   ├── layouts/          # DashboardLayout, AuthLayout
│   │   ├── context/          # AuthContext (with 1-click persona switcher), NotificationContext
│   │   ├── services/         # Centralized Axios API service layer (api.js)
│   │   ├── constants/        # Status configs, priorities, SLAs, Mysuru wards
│   │   ├── utils/            # Date and time formatters
│   │   ├── App.jsx           # Application routing configuration
│   │   ├── main.jsx          # React DOM entry point
│   │   └── index.css         # Tailwind directives and scrollbar styling
│   ├── public/
│   ├── package.json
│   ├── vite.config.js        # Vite config with API and uploads proxy
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── server/
│   ├── config/               # MongoDB Mongoose connection (db.js)
│   ├── controllers/          # auth, issue, workflow, dashboard, escalation, department, analytics, audit, notification
│   ├── middleware/           # auth (JWT & RBAC), upload (multer), errorHandler
│   ├── models/               # User, Department, Issue, Assignment, IssueUpdate, Escalation, Notification, AuditLog, Counter
│   ├── routes/               # Modular Express router endpoints
│   ├── services/             # stateMachine, slaService, auditService, notificationService
│   ├── utils/                # caseIdGenerator (CT-2026-XXXXXX)
│   ├── uploads/              # Local evidence uploads and sample civic assets
│   ├── seed/                 # Comprehensive database seed script (seed.js)
│   ├── app.js                # Express app setup and middleware
│   ├── server.js             # Server listener entry
│   ├── package.json
│   ├── .env
│   └── .env.example
│
├── README.md
└── .gitignore
```

---

---

## Dual-Entry Authentication Architecture

CivicTrack implements a secure **dual-entry system** separating public self-service citizen accounts from authorized municipal personnel:

1. **Portal Selection (`/auth`)**:
   - Clean, professional entry point asking *"How are you using CivicTrack?"*
   - Choice 1: **Citizen** $\rightarrow$ `[ Continue as Citizen ]` (`/register`)
   - Choice 2: **Municipal Staff** $\rightarrow$ `[ Staff Sign In ]` (`/staff/login`)

2. **Citizen Self-Registration (`/register`)**:
   - Strictly provisions `role: CITIZEN`. (Any privileged role requested in payload is rejected/ignored).
   - Requires 6-digit Email OTP verification (`/verify-otp`) to activate the account.
   - Post-verification routes directly to **My Reports** (`/my-reports`).

3. **Municipal Staff Provisioning (`/admin/staff` & `/staff/setup/:token`)**:
   - Municipal staff roles (`FIELD_WORKER`, `OFFICER`, `SUPERVISOR`) **cannot self-register publicly**.
   - Privileged accounts are provisioned by an `ADMIN` via the Staff Management portal.
   - Generates a secure, expiring one-time setup token dispatched via email (`/staff/setup/:token`).
   - Staff member establishes their password, account activates, and logs into their dedicated portal.

---

## Development Demo Accounts

For hackathon evaluation and local testing, pre-seeded accounts are immediately available:

| Role | Email | Password | Dedicated Portal |
| :--- | :--- | :--- | :--- |
| **Field Worker** | `worker@civictrack.local` | `Worker@123` | `/worker` (Today's Assigned Tasks) |
| **Operations Officer** | `officer@civictrack.local` | `Officer@123` | `/officer` (Triage & Inspection Hub) |
| **Sanitation Supervisor** | `supervisor@civictrack.local` | `Supervisor@123` | `/supervisor` (SLA & Escalation Hub) |
| **City Admin** | `admin@civictrack.local` | `Admin@123` | `/admin` (Staff Management & System Overview) |
| **Citizen** | `citizen@civictrack.local` | `Citizen@123` | `/my-reports` (Citizen Tracking Hub) |

> [!TIP]
> On the **Staff Sign In** page (`/staff/login`), click any role under the **"Development Demo Accounts"** box to automatically populate credentials for instant 1-click evaluation.


---

## Installation & Setup

### Prerequisites
- Node.js (v18+)
- Local MongoDB running on `mongodb://127.0.0.1:27017`

### 1. Backend Setup
```bash
cd server
npm install
npm run seed     # Seeds 35+ realistic Mysuru issues, departments, timelines & demo users
npm run dev      # Runs Express backend on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev      # Runs Vite development server on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

## Key API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | User login with JWT generation |
| `POST` | `/api/auth/demo-login` | Fast role toggle for testing |
| `GET` | `/api/issues` | Search, filter, and paginate issues |
| `POST` | `/api/issues` | Register new issue with attachments |
| `GET` | `/api/issues/:id` | Full issue record with timeline, evidence, and audit logs |
| `POST` | `/api/issues/:id/assign` | Assign department & field worker |
| `POST` | `/api/issues/:id/acknowledge` | Field worker acknowledges assignment |
| `POST` | `/api/issues/:id/start` | Field worker starts work on site |
| `POST` | `/api/issues/:id/updates` | Post progress note to case timeline |
| `POST` | `/api/issues/:id/resolution` | Submit resolution with Before & After evidence |
| `POST` | `/api/issues/:id/verify` | Officer approves or rejects resolution |
| `POST` | `/api/issues/:id/confirm` | Citizen confirms closed or reopens case |
| `POST` | `/api/issues/:id/escalate` | Trigger manual supervisor escalation |
| `GET` | `/api/dashboard` | Aggregated operational metrics & attention queue |
| `GET` | `/api/escalations` | Active & resolved supervisor escalations |
| `GET` | `/api/departments` | Live department workload & SLA compliance stats |
| `GET` | `/api/analytics` | MongoDB aggregations (trends, category, resolution times) |
| `GET` | `/api/audit-logs` | Immutable administrative audit trail |

---

## Offline-First Architecture & Synchronization Engine

CivicTrack incorporates a progressive web application (PWA) architecture with a durable IndexedDB queue and an idempotent backend synchronization gateway:

1. **Service Worker Precaching**: Automatically precaches the React app shell, asset bundles, Inter fonts, and Leaflet map styles via Workbox. All `/api/*` routes are strictly configured as `NetworkOnly` to protect user privacy.
2. **Durable Browser Storage (IndexedDB)**: Offline reports, geolocation coordinates, and raw photo evidence blobs are persisted in `CivicTrackOfflineDB`, surviving page reloads and browser restarts.
3. **Idempotency & Zero-Duplicate Guarantee**: Submissions include an `X-Idempotency-Key` header with a client-generated UUID. The backend validates against an indexed sparse unique constraint in MongoDB; retrying identical requests returns the existing case without creating duplicate tickets.
4. **Resilient Session Handling**: Offline page refreshes preserve the active authenticated session from local storage without premature logout on network failure.

For comprehensive technical specifications, refer to [docs/offline-architecture.md](docs/offline-architecture.md).

---

## How to Demonstrate Offline Mode (HackMysuru Video Scenario)

Follow this deterministic sequence to evaluate CivicTrack's offline capabilities during evaluation:

### Step 1: Open Application Online
1. Navigate to `http://localhost:5173` in your Chromium-based browser (Chrome, Edge, or Brave).
2. On the **Auth Portal Selection** screen, click **"Continue as Citizen"** (`/login`).
3. Sign in using `citizen@civictrack.local` / `Citizen@123` (or click the quick demo button).
4. Arrive on **My Civic Reports** (`/my-reports`). Observe the green **"Online"** indicator in the top navbar.
5. Click **"+ Report an Issue"** (`/report`). The app shell and form are now cached in the browser's Service Worker.

### Step 2: Simulate Offline Mode (Disconnect Network)
1. Open **Chrome DevTools** (`F12` or `Ctrl + Shift + I`).
2. Navigate to the **Network** tab.
3. In the throttling dropdown (labeled *No throttling* by default), select **Offline**.
4. Observe the navbar connectivity badge instantly switch to **"Offline"** (amber indicator).

### Step 3: Create & Submit Report Offline
1. On the Report page, enter report details:
   - **Title**: `Deep Road Crater on Kuvempunagar Double Road`
   - **Category**: `Roads & Infrastructure`
   - **Urgency / Priority**: `P2 - High Priority (24 Hours SLA)`
   - **Ward**: `Ward 15 - Kuvempunagar`
   - **Specific Address**: `Opposite Apollo BGS Hospital Road`
   - **Attachment**: Attach any sample image file.
2. Click **"Register Civic Issue"**.
3. Observe the honest confirmation screen:
   - Banner displays: **OFFLINE / QUEUED FOR SYNC**
   - Heading: **"Report Saved to Offline Queue"**
   - Alert: *"No server Case ID assigned yet. The official Case ID will be issued upon synchronization."*
   - Local tracking reference: `offline_...`

### Step 4: Refresh Page While Offline (Prove Local Persistence)
1. Press `Ctrl + R` (or `F5`) to hard-reload the browser tab while still **Offline**.
2. Notice the app shell reloads instantly from the Service Worker cache without an internet connection error.
3. Click **"View in My Reports"** (or navigate to `/my-reports`).
4. In the **Offline Queued Reports** section, observe your report persisted with status **"QUEUED FOR SYNC"** and preserved photo evidence count.

### Step 5: Restore Network & Observe Automatic Sync
1. In the DevTools **Network** tab, switch the dropdown back from **Offline** to **No throttling** (Online).
2. Within 1-2 seconds, the connectivity engine detects the connection:
   - Navbar status pulses: **"Syncing queue..."**
   - The queued item transitions to **"SYNCING..."** and then moves to **Synchronized Reports**.
   - An official municipal Case ID is assigned (e.g. `CT-2026-000208`).
3. Click on the synchronized case card to open the complete Case Timeline.

---

## Bad-Input Validation & HackMysuru Live Demonstration (01:50 – 02:30)

CivicTrack includes a backend-authoritative validation suite designed for live evaluation during the **01:50–02:30** segment of the HackMysuru video walkthrough. For complete architectural documentation, see [docs/bad-input-validation.md](docs/bad-input-validation.md).

### 1. The Four Bad-Input Test Cases

| Case | Test Input | Backend Status | Response Code & Behavior |
| :--- | :--- | :--- | :--- |
| **A. Duplicate Report** | Submitting the same complaint (same citizen, title, ward) within 24 hours | `HTTP 409 Conflict` | `DUPLICATE_REPORT`: *"Duplicate report detected. This report was already submitted."* Returns existing Case ID. Exactly 1 document remains in MongoDB. |
| **B. Impossible Location** | Coordinates out of bounds (`lat: 200, lng: 300` or non-numeric) | `HTTP 400 Bad Request` | `INVALID_LOCATION`: *"Invalid location. Coordinates must be valid latitude (-90 to 90) and longitude (-180 to 180)."* No silent default fallback. |
| **C. Disguised Photo** | Plain text file renamed to `photo.jpg` | `HTTP 400 Bad Request` | `INVALID_IMAGE_FILE`: Real raw binary magic-byte inspection (`FF D8 FF` check). Rejected file is immediately deleted from server disk. |
| **D. Abusive Text** | Description with profane or test words (e.g. `abusive_test_word` or `@busive_test_w0rd`) | `HTTP 400 Bad Request` | `ABUSIVE_CONTENT`: *"Please remove abusive language from the report description."* Normalizes leetspeak substitutions and separators. |

### 2. Live Demo Steps (40-Second Video Procedure)

1. Navigate to `/report` in the Citizen Portal.
2. **Test Location**: Click **"Override / Test Custom Coordinates"**, enter `Lat: 200, Lng: 300`. Click Submit. Observe the orange **"Invalid Coordinates Rejection"** alert.
3. **Test Content Moderation**: Click **"Reset to Ward Default"**. In Description, type `Problem persists abusive_test_word`. Click Submit. Observe the red **"Content Moderation Rejection"** alert.
4. **Test Magic Bytes**: Clear the test word. Attach a `.txt` file renamed to `photo.jpg`. Click Submit. Observe the purple **"Invalid Attachment Signature"** alert.
5. **Test Authentic Submission**: Attach a genuine JPEG image. Click Submit. Observe the green **Registration Confirmation Card** with Case ID `CT-2026-XXXX`.
6. **Test Duplicate Prevention**: Click Back to `/report` and submit with the same title and ward. Observe the amber **"Duplicate Report Detected"** alert linking back to your existing Case ID.

### 3. Automated Test Execution

```bash
cd src/server
node test-bad-input-suite.js
```
*Result: 26 passed assertions across all 4 bad-input categories, immediate disk file unlinking, and authoritative MongoDB document count verification.*


