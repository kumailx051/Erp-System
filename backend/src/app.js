require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const authRoutes = require('./core/auth/authRoutes');
const hrAccountsRoutes = require('./modules/admin/routes/hrAccountsRoutes');
const employeeRoutes = require('./modules/hr/routes/employeeRoutes');
const organizationRoutes = require('./modules/hr/routes/organizationRoutes');
const attendanceRoutes = require('./modules/hr/routes/attendanceRoutes');
const shiftRoutes = require('./modules/hr/routes/shiftRoutes');
const leaveTypeRoutes = require('./modules/hr/routes/leaveTypeRoutes');
const leaveRoutes = require('./modules/hr/routes/leaveRoutes');
const recruitmentRoutes = require('./modules/hr/routes/recruitmentRoutes');
const exitRoutes = require('./modules/hr/routes/exitRoutes');
const payrollRoutes = require('./modules/hr/routes/payrollRoutes');

const app = express();

app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(
	cors({
		origin: process.env.FRONTEND_URL || 'http://localhost:5173',
		credentials: true
	})
);
app.use(express.json());

// Serve uploads folder as static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
	res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', hrAccountsRoutes);
app.use('/api/hr', employeeRoutes);
app.use('/api/hr', organizationRoutes);
app.use('/api/hr', attendanceRoutes);
app.use('/api/hr', shiftRoutes);
app.use('/api/hr', leaveTypeRoutes);
app.use('/api/hr', leaveRoutes);
app.use('/api/hr', recruitmentRoutes);
app.use('/api/hr', exitRoutes);
app.use('/api/hr', payrollRoutes);

app.use((req, res) => {
	res.status(404).json({ message: 'Route not found' });
});

module.exports = app;
