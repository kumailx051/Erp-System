const express = require('express');
const { requireAuth } = require('../../../core/auth/authMiddleware');
const {
  listShifts,
  createShift,
  getRoster,
  assignShift
} = require('../controllers/shiftController');

const router = express.Router();

router.get('/shifts', requireAuth, listShifts);
router.post('/shifts', requireAuth, createShift);
router.get('/shifts/roster', requireAuth, getRoster);
router.put('/shifts/roster/:employeeId', requireAuth, assignShift);

module.exports = router;
