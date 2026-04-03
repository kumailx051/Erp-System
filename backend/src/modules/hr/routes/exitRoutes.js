const express = require('express');
const { requireAuth } = require('../../../core/auth/authMiddleware');
const {
  getExitRequests,
  createExitRequest,
  updateExitDecision,
  updateExitWorkflow
} = require('../controllers/exitController');

const router = express.Router();

router.get('/exits', requireAuth, getExitRequests);
router.post('/exits', requireAuth, createExitRequest);
router.patch('/exits/:id/decision', requireAuth, updateExitDecision);
router.patch('/exits/:id/workflow', requireAuth, updateExitWorkflow);

module.exports = router;
