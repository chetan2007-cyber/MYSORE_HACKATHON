/**
 * CivicTrack Real SLA Engine
 * Dynamically computes SLA windows, thresholds, and breach detection based on real timestamps.
 */

const DEFAULT_SLA_HOURS = {
  P1: 4,    // 4 hours
  P2: 24,   // 24 hours
  P3: 72,   // 3 days
  P4: 168   // 7 days
};

/**
 * Calculates due date based on start time, priority, and optional department settings.
 */
const calculateSlaDueDate = (priority, department = null, startedAt = new Date()) => {
  let hours = DEFAULT_SLA_HOURS[priority] || 72;

  if (department && department.slaHours && department.slaHours[priority]) {
    hours = department.slaHours[priority];
  }

  const dueAt = new Date(startedAt.getTime() + hours * 60 * 60 * 1000);
  return { dueAt, totalHours: hours };
};

/**
 * Evaluates the SLA status for an issue given its current timestamps and issue status.
 */
const evaluateSlaStatus = (issue) => {
  if (['RESOLVED', 'CLOSED'].includes(issue.status)) {
    return {
      status: 'COMPLETED',
      isBreached: issue.sla?.breachedAt !== null,
      remainingMinutes: 0,
      timeLabel: 'Completed'
    };
  }

  const now = new Date();
  const dueAt = new Date(issue.sla?.dueAt || Date.now());
  const startedAt = new Date(issue.sla?.startedAt || issue.createdAt || Date.now());

  const totalWindowMs = dueAt.getTime() - startedAt.getTime();
  const remainingMs = dueAt.getTime() - now.getTime();
  const remainingMinutes = Math.floor(remainingMs / (1000 * 60));

  if (remainingMs <= 0) {
    const overdueMinutes = Math.abs(remainingMinutes);
    const overdueHours = Math.floor(overdueMinutes / 60);
    const label = overdueHours > 24 
      ? `${Math.floor(overdueHours / 24)}d overdue` 
      : overdueHours > 0 
        ? `${overdueHours}h overdue` 
        : `${overdueMinutes}m overdue`;

    return {
      status: 'BREACHED',
      isBreached: true,
      remainingMinutes,
      timeLabel: label
    };
  }

  // If less than 25% of the total SLA window is remaining, flag as AT_RISK
  const isAtRisk = totalWindowMs > 0 && remainingMs <= (totalWindowMs * 0.25);

  const remHours = Math.floor(remainingMinutes / 60);
  const remMins = remainingMinutes % 60;
  let label = '';
  if (remHours > 24) {
    label = `${Math.floor(remHours / 24)}d ${remHours % 24}h left`;
  } else if (remHours > 0) {
    label = `${remHours}h ${remMins}m left`;
  } else {
    label = `${remMins}m left`;
  }

  return {
    status: isAtRisk ? 'AT_RISK' : 'ON_TRACK',
    isBreached: false,
    remainingMinutes,
    timeLabel: label
  };
};

module.exports = {
  DEFAULT_SLA_HOURS,
  calculateSlaDueDate,
  evaluateSlaStatus
};
