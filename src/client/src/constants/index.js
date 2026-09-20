export const STATUS_CONFIG = {
  REPORTED: {
    label: 'Reported',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    dot: 'bg-slate-400',
    step: 1
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
    step: 2
  },
  ASSIGNED: {
    label: 'Assigned',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
    step: 3
  },
  ACKNOWLEDGED: {
    label: 'Acknowledged',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    dot: 'bg-cyan-500',
    step: 4
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-600',
    step: 5
  },
  ON_HOLD: {
    label: 'On Hold',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    step: 5
  },
  RESOLUTION_SUBMITTED: {
    label: 'Resolution Submitted',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    step: 6
  },
  VERIFICATION_REQUIRED: {
    label: 'Verification Required',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
    step: 6
  },
  RESOLVED: {
    label: 'Resolved',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    step: 7
  },
  CLOSED: {
    label: 'Closed',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    dot: 'bg-slate-600',
    step: 8
  },
  REOPENED: {
    label: 'Reopened',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-300',
    dot: 'bg-rose-600',
    step: 3
  }
};

export const PRIORITY_CONFIG = {
  P1: {
    label: 'P1 - Critical',
    badge: 'P1',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-600',
    description: '4 hours SLA'
  },
  P2: {
    label: 'P2 - High',
    badge: 'P2',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    description: '24 hours SLA'
  },
  P3: {
    label: 'P3 - Medium',
    badge: 'P3',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    description: '72 hours SLA'
  },
  P4: {
    label: 'P4 - Low',
    badge: 'P4',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    description: '7 days SLA'
  }
};

export const SLA_STATUS_CONFIG = {
  ON_TRACK: {
    label: 'On Track',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500'
  },
  AT_RISK: {
    label: 'At Risk',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
    dot: 'bg-amber-500'
  },
  BREACHED: {
    label: 'Breached',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-300',
    dot: 'bg-rose-600'
  },
  COMPLETED: {
    label: 'Met',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    dot: 'bg-slate-400'
  }
};

export const CIVIC_CATEGORIES = [
  'Sanitation & Waste',
  'Roads & Infrastructure',
  'Drainage & Sewage',
  'Streetlights & Electrical',
  'Water Supply',
  'Public Health & Safety'
];

export const MYSURU_WARDS = [
  { ward: 'Ward 11 - Vijayanagar North', lat: 12.3365, lng: 76.6120 },
  { ward: 'Ward 12 - Vijayanagar South', lat: 12.3310, lng: 76.6080 },
  { ward: 'Ward 18 - Kuvempunagar North', lat: 12.2920, lng: 76.6270 },
  { ward: 'Ward 19 - Kuvempunagar South', lat: 12.2880, lng: 76.6230 },
  { ward: 'Ward 31 - Hebbal Industrial', lat: 12.3650, lng: 76.5920 },
  { ward: 'Ward 4 - Nazarbad', lat: 12.3120, lng: 76.6690 },
  { ward: 'Ward 15 - Saraswathipuram', lat: 12.3080, lng: 76.6340 },
  { ward: 'Ward 9 - Jayalakshmipuram', lat: 12.3210, lng: 76.6310 },
  { ward: 'Ward 7 - Gokulam', lat: 12.3280, lng: 76.6320 },
  { ward: 'Ward 24 - Bannimantap', lat: 12.3390, lng: 76.6540 },
  { ward: 'Ward 3 - Chamundipuram', lat: 12.2960, lng: 76.6580 },
  { ward: 'Ward 21 - Ramakrishnanagar', lat: 12.2850, lng: 76.6190 },
  { ward: 'Ward 16 - Krishnamurthypuram', lat: 12.2990, lng: 76.6450 },
  { ward: 'Ward 22 - Dattagalli South', lat: 12.2770, lng: 76.6050 },
  { ward: 'Ward 29 - Yadavagiri', lat: 12.3320, lng: 76.6410 }
];

export const DEMO_PERSONAS = [
  { role: 'CITIZEN', label: 'Citizen', name: 'Priya Sundaram', email: 'citizen@civictrack.local' },
  { role: 'FIELD_WORKER', label: 'Field Worker', name: 'Manjunath Gowda', email: 'worker@civictrack.local' },
  { role: 'OFFICER', label: 'Operations Officer', name: 'Rahul Sharma', email: 'officer@civictrack.local' },
  { role: 'SUPERVISOR', label: 'Department Supervisor', name: 'Dr. Ramesh Rao', email: 'supervisor@civictrack.local' },
  { role: 'ADMIN', label: 'City Admin', name: 'Rajesh Kumar', email: 'admin@civictrack.local' }
];
