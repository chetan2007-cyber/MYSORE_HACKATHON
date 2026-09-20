const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue
} = require('../controllers/issueController');
const {
  assignIssue,
  acknowledgeAssignment,
  startWork,
  addProgressUpdate,
  submitResolution,
  verifyResolution,
  confirmResolution,
  escalateIssue
} = require('../controllers/workflowController');

// Base Issue routes
router
  .route('/')
  .post(protect, upload.array('attachments', 5), createIssue)
  .get(protect, getIssues);

router
  .route('/:id')
  .get(protect, getIssueById)
  .patch(protect, authorize('OFFICER', 'SUPERVISOR', 'ADMIN'), updateIssue);

// Operational Workflow transitions
router.post(
  '/:id/assign',
  protect,
  authorize('OFFICER', 'SUPERVISOR', 'ADMIN'),
  assignIssue
);

router.post(
  '/:id/acknowledge',
  protect,
  authorize('FIELD_WORKER', 'SUPERVISOR', 'ADMIN'),
  acknowledgeAssignment
);

router.post(
  '/:id/start',
  protect,
  authorize('FIELD_WORKER', 'SUPERVISOR', 'ADMIN'),
  startWork
);

router.post(
  '/:id/updates',
  protect,
  upload.array('attachments', 3),
  addProgressUpdate
);

router.post(
  '/:id/resolution',
  protect,
  authorize('FIELD_WORKER', 'SUPERVISOR', 'ADMIN'),
  upload.array('evidence', 5),
  submitResolution
);

router.post(
  '/:id/verify',
  protect,
  authorize('OFFICER', 'SUPERVISOR', 'ADMIN'),
  verifyResolution
);

router.post(
  '/:id/confirm',
  protect,
  confirmResolution
);

router.post(
  '/:id/escalate',
  protect,
  authorize('OFFICER', 'SUPERVISOR', 'ADMIN'),
  escalateIssue
);

module.exports = router;
