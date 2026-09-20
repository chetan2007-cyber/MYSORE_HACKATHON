const express = require('express');
const router = express.Router();
const { getDepartments, getDepartmentById } = require('../controllers/departmentController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getDepartments);
router.get('/:id', protect, getDepartmentById);

module.exports = router;
