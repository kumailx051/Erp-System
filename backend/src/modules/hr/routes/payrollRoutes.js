const express = require('express');
const router = express.Router();

const { requireAuth } = require('../../../core/auth/authMiddleware');
const payrollController = require('../controllers/payrollController');
const employeeSalaryController = require('../controllers/employeeSalaryController');

// Payroll management
router.get('/payroll/summary', requireAuth, payrollController.getPayrollSummary);
router.get('/payroll/register', requireAuth, payrollController.getPayrollRegister);
router.get('/payroll/process/:year/:month', requireAuth, payrollController.getPayrollProcessStatus);
router.post('/payroll/process/:year/:month/generate', requireAuth, payrollController.generatePayroll);
router.post('/payroll/process/:year/:month/advance', requireAuth, payrollController.advancePayrollProcess);
router.post('/payroll/process/:year/:month/publish', requireAuth, payrollController.publishPayroll);

// Salary component settings CRUD
router.get('/payroll/components', requireAuth, payrollController.getSalaryComponents);
router.post('/payroll/components', requireAuth, payrollController.createSalaryComponent);
router.put('/payroll/components/:id', requireAuth, payrollController.updateSalaryComponent);
router.delete('/payroll/components/:id', requireAuth, payrollController.deleteSalaryComponent);

// Payroll rule settings
router.get('/payroll/rules', requireAuth, payrollController.getPayrollRules);
router.put('/payroll/rules', requireAuth, payrollController.updatePayrollRules);

// Employee salary endpoints (self-service first to avoid ambiguity)
router.get('/employees/me/salary', requireAuth, employeeSalaryController.getMySalary);
router.get('/employees/me/payslips', requireAuth, employeeSalaryController.getMyPayslips);

// HR/admin employee salary endpoints
router.get('/employees/:id/salary', requireAuth, employeeSalaryController.getEmployeeSalaryById);
router.get('/employees/:id/payslips', requireAuth, employeeSalaryController.getEmployeePayslipsById);

// Payslip document endpoint
router.get('/payslips/:payslipId/pdf', requireAuth, employeeSalaryController.downloadPayslipPdf);

module.exports = router;
