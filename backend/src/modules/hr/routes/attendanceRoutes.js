const express = require('express');
const { requireAuth } = require('../../../core/auth/authMiddleware');
const {
	getAttendanceAnalytics,
	getAttendanceEmployees,
	getAttendanceReport,
	getEmployeeAttendanceDetails,
	markAttendance
} = require('../controllers/attendanceController');

const router = express.Router();

router.get('/attendance/analytics', requireAuth, getAttendanceAnalytics);
router.get('/attendance/employees', requireAuth, getAttendanceEmployees);
router.get('/attendance/reports', requireAuth, getAttendanceReport);
router.get('/attendance/employees/:id/details', requireAuth, getEmployeeAttendanceDetails);
router.post('/attendance/mark', requireAuth, markAttendance);

module.exports = router;
