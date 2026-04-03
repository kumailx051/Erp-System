const express = require('express');
const { requireAuth } = require('../../../core/auth/authMiddleware');
const {
  getOrganizationSummary,
  getOrganizationOptions,
  createDepartment,
  createDesignation,
  updateDepartment,
  deleteDepartment,
  updateDesignation,
  deleteDesignation,
  assignDepartmentHead
} = require('../controllers/organizationController');

const router = express.Router();

router.get('/organization/summary', requireAuth, getOrganizationSummary);
router.get('/organization/options', requireAuth, getOrganizationOptions);
router.post('/organization/departments', requireAuth, createDepartment);
router.post('/organization/designations', requireAuth, createDesignation);
router.put('/organization/departments/:id', requireAuth, updateDepartment);
router.delete('/organization/departments/:id', requireAuth, deleteDepartment);
router.put('/organization/departments/:id/head', requireAuth, assignDepartmentHead);
router.put('/organization/designations/:id', requireAuth, updateDesignation);
router.delete('/organization/designations/:id', requireAuth, deleteDesignation);

module.exports = router;
