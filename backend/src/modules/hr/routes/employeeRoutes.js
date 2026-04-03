const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { requireAuth, requireAdmin } = require('../../../core/auth/authMiddleware');
const upload = require('../../../core/middlewares/uploadMiddleware');

/**
 * Employee Routes
 * All routes require authentication
 * Admin-only routes noted
 */

// Create employee (requires auth)
router.post(
  '/employees',
  requireAuth,
  upload.array('documents', 4), // Allow up to 4 document uploads
  employeeController.createEmployee
);

// Get all employees (requires auth)
router.get(
  '/employees',
  requireAuth,
  employeeController.getEmployees
);

// Get next auto-generated employee code (requires auth)
router.get(
  '/employees/next-code',
  requireAuth,
  employeeController.getNextEmployeeCode
);

// Check whether employee email already exists (requires auth)
router.get(
  '/employees/check-email',
  requireAuth,
  employeeController.checkEmployeeEmail
);

// Check profile completion status for authenticated employee user
router.get(
  '/employees/my-profile/status',
  requireAuth,
  employeeController.getMyEmployeeProfileStatus
);

// Get employee by ID (requires auth)
router.get(
  '/employees/:id',
  requireAuth,
  employeeController.getEmployeeById
);

// Update employee (requires auth)
router.put(
  '/employees/:id',
  requireAuth,
  upload.array('documents', 4), // Allow additional document uploads
  employeeController.updateEmployee
);

// Delete employee (requires auth - admin only for data governance)
router.delete(
  '/employees/:id',
  requireAuth,
  employeeController.deleteEmployee
);

// Upload/replace employee avatar image (requires auth)
router.post(
  '/employees/:id/avatar',
  requireAuth,
  upload.single('avatar'),
  employeeController.uploadProfileImage
);

// Upload document for employee (requires auth)
router.post(
  '/employees/:employeeId/documents',
  requireAuth,
  upload.single('document'),
  employeeController.uploadDocument
);

// Delete document (requires auth)
router.delete(
  '/documents/:documentId',
  requireAuth,
  employeeController.deleteDocument
);

module.exports = router;
