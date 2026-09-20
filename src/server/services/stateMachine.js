/**
 * CivicTrack Issue State Machine
 * Enforces strict, auditable lifecycle transitions.
 * 
 * Allowed standard flow:
 * REPORTED -> UNDER_REVIEW -> ASSIGNED -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLUTION_SUBMITTED -> VERIFICATION_REQUIRED -> RESOLVED -> CLOSED
 * Branches:
 * IN_PROGRESS <-> ON_HOLD
 * VERIFICATION_REQUIRED -> IN_PROGRESS (Rejected)
 * RESOLVED -> REOPENED (Citizen unsatisfied)
 * CLOSED -> REOPENED (Citizen requests reopen)
 * REOPENED -> UNDER_REVIEW | ASSIGNED | IN_PROGRESS
 */

const ALLOWED_TRANSITIONS = {
  REPORTED: ['UNDER_REVIEW', 'ASSIGNED'],
  UNDER_REVIEW: ['ASSIGNED', 'REPORTED'],
  ASSIGNED: ['ACKNOWLEDGED', 'UNDER_REVIEW'],
  ACKNOWLEDGED: ['IN_PROGRESS', 'ASSIGNED'],
  IN_PROGRESS: ['ON_HOLD', 'RESOLUTION_SUBMITTED', 'VERIFICATION_REQUIRED'],
  ON_HOLD: ['IN_PROGRESS'],
  RESOLUTION_SUBMITTED: ['VERIFICATION_REQUIRED'],
  VERIFICATION_REQUIRED: ['RESOLVED', 'IN_PROGRESS'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS']
};

/**
 * Validates if transition from currentStatus to targetStatus is permitted.
 */
const validateTransition = (currentStatus, targetStatus) => {
  if (currentStatus === targetStatus) {
    return { valid: true };
  }

  const allowedNext = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowedNext || !allowedNext.includes(targetStatus)) {
    return {
      valid: false,
      error: `Invalid status transition: Cannot move issue from '${currentStatus}' to '${targetStatus}'. Allowed next statuses: [${(allowedNext || []).join(', ')}]`
    };
  }

  return { valid: true };
};

module.exports = {
  ALLOWED_TRANSITIONS,
  validateTransition
};
