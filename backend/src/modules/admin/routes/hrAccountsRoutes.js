const express = require('express');
const { requireAuth, requireAdmin } = require('../../../core/auth/authMiddleware');
const { listUsers, createUser, resetDatabase, getDatabaseTables } = require('../controllers/hrAccountsController');

const router = express.Router();

router.use(requireAuth, requireAdmin);
router.get('/users', listUsers);
router.post('/users', createUser);
router.get('/database-tables', getDatabaseTables);
router.post('/reset-database', resetDatabase);

// Backward-compatible aliases
router.get('/hr-accounts', listUsers);
router.post('/hr-accounts', createUser);

module.exports = router;
