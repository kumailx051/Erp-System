const { Employee } = require('../models/Employee');
const Payslip = require('../models/Payslip');
const PayslipLineItem = require('../models/PayslipLineItem');
const {
  getEmployeeSalary,
  getEmployeePayslips
} = require('../services/payrollService');
const { buildPayslipPdf } = require('../services/payslipPdfService');

function isHrOrAdmin(user) {
  return user?.role === 'admin' || user?.role === 'hr';
}

async function resolveEmployeeByAuthUser(user) {
  const email = String(user?.email || '').trim().toLowerCase();
  if (!email) {
    return null;
  }

  return Employee.findOne({
    where: {
      email,
      is_active: true
    }
  });
}

exports.getEmployeeSalaryById = async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'HR or admin access required' });
    }

    const employeeId = Number(req.params.id);
    if (!Number.isInteger(employeeId)) {
      return res.status(400).json({ success: false, message: 'Invalid employee id' });
    }

    const data = await getEmployeeSalary(employeeId);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch employee salary', error: error.message });
  }
};

exports.getEmployeePayslipsById = async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'HR or admin access required' });
    }

    const employeeId = Number(req.params.id);
    if (!Number.isInteger(employeeId)) {
      return res.status(400).json({ success: false, message: 'Invalid employee id' });
    }

    const year = req.query.year ? Number(req.query.year) : null;
    const data = await getEmployeePayslips(employeeId, year);

    return res.status(200).json({
      success: true,
      data: {
        total: data.length,
        payslips: data
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch employee payslips', error: error.message });
  }
};

exports.getMySalary = async (req, res) => {
  try {
    if (req.user?.role !== 'employee') {
      return res.status(403).json({ success: false, message: 'Employee access required' });
    }

    const employee = await resolveEmployeeByAuthUser(req.user);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const data = await getEmployeeSalary(employee.id);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch your salary', error: error.message });
  }
};

exports.getMyPayslips = async (req, res) => {
  try {
    if (req.user?.role !== 'employee') {
      return res.status(403).json({ success: false, message: 'Employee access required' });
    }

    const employee = await resolveEmployeeByAuthUser(req.user);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const year = req.query.year ? Number(req.query.year) : null;
    const payslips = await getEmployeePayslips(employee.id, year);

    return res.status(200).json({
      success: true,
      data: {
        total: payslips.length,
        payslips
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch your payslips', error: error.message });
  }
};

exports.downloadPayslipPdf = async (req, res) => {
  try {
    const payslipId = Number(req.params.payslipId);
    if (!Number.isInteger(payslipId)) {
      return res.status(400).json({ success: false, message: 'Invalid payslip id' });
    }

    const payslip = await Payslip.findByPk(payslipId);
    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    const employee = await Employee.findByPk(payslip.employee_id);
    if (!employee || !employee.is_active) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (req.user?.role === 'employee') {
      const me = await resolveEmployeeByAuthUser(req.user);
      if (!me || me.id !== employee.id) {
        return res.status(403).json({ success: false, message: 'You can only access your own payslips' });
      }
    } else if (!isHrOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to download payslip' });
    }

    const lineItems = await PayslipLineItem.findAll({ where: { payslip_id: payslip.id } });

    const pdfBuffer = await buildPayslipPdf({
      employee: {
        fullName: `${employee.first_name} ${employee.last_name}`.trim(),
        employeeCode: employee.employee_code,
        department: employee.department,
        designation: employee.designation
      },
      payslip,
      lineItems
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${employee.employee_code || employee.id}-${payslip.month_year}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate payslip PDF', error: error.message });
  }
};
