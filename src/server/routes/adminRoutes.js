const express = require('express');
const router = express.Router();
const {
  getStaffMembers,
  inviteStaffMember,
  updateStaffMember,
  resendStaffInvitation,
  getAdminOverview
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All admin routes strictly require authentication and ADMIN role
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/staff', getStaffMembers);
router.post('/staff', inviteStaffMember);
router.patch('/staff/:id', updateStaffMember);
router.post('/staff/:id/resend-invitation', resendStaffInvitation);
router.get('/overview', getAdminOverview);

module.exports = router;
