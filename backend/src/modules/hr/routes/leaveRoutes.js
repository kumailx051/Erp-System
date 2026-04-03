const express = require('express');
const { requireAuth } = require('../../../core/auth/authMiddleware');
const {
  getLeaves,
  createLeave,
  updateLeave,
  updateLeaveStatus
} = require('../controllers/leaveController');

const router = express.Router();

router.get('/leaves', requireAuth, getLeaves);
router.post('/leaves', requireAuth, createLeave);
router.put('/leaves/:id', requireAuth, updateLeave);
router.patch('/leaves/:id/status', requireAuth, updateLeaveStatus);

module.exports = router;
