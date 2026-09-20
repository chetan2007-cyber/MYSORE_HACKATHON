const express = require('express');
const router = express.Router();
const {
  getInvitationDetails,
  completeStaffSetup,
  getWorkerAssignments,
  getOfficerIssues,
  getSupervisorOverview
} = require('../controllers/staffController');
const { assignIssue } = require('../controllers/workflowController');
const { protect, authorize } = require('../middleware/auth');
const { staffSetupLimiter } = require('../middleware/rateLimiter');

// Public staff onboarding invitation setup
router.get('/invitation/:token', getInvitationDetails);
router.post('/invitation/:token/complete', staffSetupLimiter, completeStaffSetup);

// Field Worker routes
router.get('/worker/assignments', protect, authorize('FIELD_WORKER', 'OFFICER', 'SUPERVISOR', 'ADMIN'), getWorkerAssignments);

// Officer routes
router.get('/officer/issues', protect, authorize('OFFICER', 'SUPERVISOR', 'ADMIN'), getOfficerIssues);
router.post('/officer/issues/:id/assign', protect, authorize('OFFICER', 'SUPERVISOR', 'ADMIN'), assignIssue);

// Supervisor routes
router.get('/supervisor/overview', protect, authorize('SUPERVISOR', 'ADMIN'), getSupervisorOverview);

module.exports = router;
