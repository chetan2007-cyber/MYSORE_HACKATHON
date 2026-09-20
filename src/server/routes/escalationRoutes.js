const express = require('express');
const router = express.Router();
const { getEscalations, resolveEscalation } = require('../controllers/escalationController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('OFFICER', 'SUPERVISOR', 'ADMIN'), getEscalations);
router.post('/:id/resolve', protect, authorize('SUPERVISOR', 'ADMIN'), resolveEscalation);

module.exports = router;
