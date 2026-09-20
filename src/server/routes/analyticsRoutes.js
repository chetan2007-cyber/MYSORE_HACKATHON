const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('OFFICER', 'SUPERVISOR', 'ADMIN'), getAnalytics);

module.exports = router;
