const express = require('express');
const router = express.Router();
const { getSupervisorOverview } = require('../controllers/supervisorController');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/supervisor/overview
// @access  Private (Supervisor, Admin)
router.get('/overview', protect, authorize('SUPERVISOR', 'ADMIN'), getSupervisorOverview);

module.exports = router;
