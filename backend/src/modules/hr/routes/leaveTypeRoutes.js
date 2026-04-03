const express = require('express');
const { requireAuth } = require('../../../core/auth/authMiddleware');
const { getLeaveTypes, createLeaveType } = require('../controllers/leaveTypeController');

const router = express.Router();

router.get('/leave-types', requireAuth, getLeaveTypes);
router.post('/leave-types', requireAuth, createLeaveType);

module.exports = router;
