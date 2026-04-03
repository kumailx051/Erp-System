const { sequelize } = require('../../../core/database/connection');
const Leave = require('../models/Leave');
const LeaveType = require('../models/LeaveType');
const { Employee } = require('../models/Employee');

function titleCaseStatus(status) {
  const value = String(status || '').toLowerCase();
  if (!value) return 'Pending';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toDateOnly(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function computeDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

async function generateLeaveCode() {
  const count = await Leave.count();
  return `LV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

function parseBalances(raw) {
  if (!raw || typeof raw !== 'object') return {};
  return { ...raw };
}

function getBalanceKey(leaveTypeId) {
  return String(leaveTypeId);
}

function getOrInitializeBalance(balances, leaveTypeId, leaveTypeDaysPerYear) {
  const key = getBalanceKey(leaveTypeId);
  if (Object.prototype.hasOwnProperty.call(balances, key)) {
    return balances[key];
  }

  if (leaveTypeDaysPerYear === null || leaveTypeDaysPerYear === undefined) {
    balances[key] = null;
    return null;
  }

  balances[key] = Number(leaveTypeDaysPerYear);
  return balances[key];
}

async function getEmployeeForRequester(req, transaction) {
  const email = String(req.user?.email || '').trim().toLowerCase();
  if (!email) {
    return null;
  }

  return Employee.findOne({
    where: { email, is_active: true },
    transaction
  });
}

function isPrivilegedRole(role) {
  return ['hr', 'admin'].includes(String(role || '').toLowerCase());
}

exports.getLeaves = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!isPrivilegedRole(role) && role !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access leave requests'
      });
    }

    const where = {};

    if (role === 'employee') {
      const employee = await getEmployeeForRequester(req);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee profile not found for authenticated user'
        });
      }
      where.employee_id = employee.id;
    }

    const leaves = await Leave.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    const employeeIds = Array.from(new Set(leaves.map((leave) => leave.employee_id)));
    const leaveTypeIds = Array.from(new Set(leaves.map((leave) => leave.leave_type_id)));

    const employees = employeeIds.length > 0
      ? await Employee.findAll({
          where: { id: employeeIds },
          attributes: ['id', 'first_name', 'last_name', 'department']
        })
      : [];

    const leaveTypes = leaveTypeIds.length > 0
      ? await LeaveType.findAll({
          where: { id: leaveTypeIds },
          attributes: ['id', 'name']
        })
      : [];

    const employeeById = new Map();
    employees.forEach((employee) => employeeById.set(employee.id, employee));

    const leaveTypeById = new Map();
    leaveTypes.forEach((leaveType) => leaveTypeById.set(leaveType.id, leaveType));

    return res.status(200).json({
      success: true,
      data: {
        leaves: leaves.map((leave) => {
          const employee = employeeById.get(leave.employee_id);
          const leaveType = leaveTypeById.get(leave.leave_type_id);

          return {
            id: leave.id,
            leaveCode: leave.leave_code,
            employeeId: leave.employee_id,
            employeeName: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || 'Unknown Employee',
            department: employee?.department || '--',
            leaveTypeId: leave.leave_type_id,
            leaveTypeName: leaveType?.name || 'Unknown Leave Type',
            startDate: leave.start_date,
            endDate: leave.end_date,
            totalDays: leave.total_days,
            reason: leave.reason,
            status: titleCaseStatus(leave.status),
            attachmentName: leave.attachment_name || ''
          };
        })
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch leaves',
      error: error.message
    });
  }
};

exports.createLeave = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!isPrivilegedRole(role) && role !== 'employee') {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create leave requests'
      });
    }

    let employeeId = Number(req.body?.employeeId);

    if (role === 'employee') {
      const selfEmployee = await getEmployeeForRequester(req, transaction);
      if (!selfEmployee) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Employee profile not found for authenticated user'
        });
      }
      employeeId = selfEmployee.id;
    }

    const leaveTypeId = Number(req.body?.leaveTypeId);
    const startDate = toDateOnly(req.body?.startDate);
    const endDate = toDateOnly(req.body?.endDate);
    const reason = String(req.body?.reason || '').trim();
    const attachmentName = String(req.body?.attachmentName || '').trim() || null;

    if (!employeeId || !leaveTypeId || !startDate || !endDate || !reason) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'employeeId, leaveTypeId, startDate, endDate and reason are required'
      });
    }

    // Validate start date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateObj = new Date(startDate);
    if (startDateObj < today) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be in the past. Please select today or a future date.'
      });
    }

    // Validate end date is not before start date
    const endDateObj = new Date(endDate);
    if (endDateObj < startDateObj) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date'
      });
    }

    const totalDays = computeDays(startDate, endDate);
    if (totalDays < 1) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid leave date range'
      });
    }

    const employee = await Employee.findOne({
      where: { id: employeeId, is_active: true },
      transaction
    });

    if (!employee) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const leaveType = await LeaveType.findOne({
      where: { id: leaveTypeId, is_active: true },
      transaction
    });

    if (!leaveType) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Leave type not found'
      });
    }

    // Check if employee has leave balance (can be 0 or null, field check)
    const balances = parseBalances(employee.leave_balances);
    const currentBalance = getOrInitializeBalance(balances, leaveTypeId, leaveType.days_per_year);

    if (currentBalance !== null && Number(currentBalance) <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `No available leave balance for this leave type. All leaves are utilized.`
      });
    }

    const leaveCode = await generateLeaveCode();
    const created = await Leave.create({
      leave_code: leaveCode,
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      start_date: startDate,
      end_date: endDate,
      total_days: totalDays,
      reason,
      attachment_name: attachmentName,
      status: 'pending',
      created_by: Number(req.user?.sub) || null
    }, { transaction });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: 'Leave request created successfully',
      data: {
        id: created.id,
        leaveCode: created.leave_code,
        status: titleCaseStatus(created.status)
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: 'Failed to create leave request',
      error: error.message
    });
  }
};

exports.updateLeave = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!isPrivilegedRole(role) && role !== 'employee') {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update leave requests'
      });
    }

    const leaveId = Number(req.params?.id);
    let employeeId = Number(req.body?.employeeId);
    const leaveTypeId = Number(req.body?.leaveTypeId);
    const startDate = toDateOnly(req.body?.startDate);
    const endDate = toDateOnly(req.body?.endDate);
    const reason = String(req.body?.reason || '').trim();
    const attachmentName = String(req.body?.attachmentName || '').trim() || null;

    if (role === 'employee') {
      const selfEmployee = await getEmployeeForRequester(req, transaction);
      if (!selfEmployee) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Employee profile not found for authenticated user'
        });
      }
      employeeId = selfEmployee.id;
    }

    if (!leaveId || !employeeId || !leaveTypeId || !startDate || !endDate || !reason) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'leaveId, employeeId, leaveTypeId, startDate, endDate and reason are required'
      });
    }

    // Validate start date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateObj = new Date(startDate);
    if (startDateObj < today) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be in the past. Please select today or a future date.'
      });
    }

    // Validate end date is not before start date
    const endDateObj = new Date(endDate);
    if (endDateObj < startDateObj) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date'
      });
    }

    const leave = await Leave.findByPk(leaveId, { transaction });
    if (!leave) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (role === 'employee') {
      if (leave.employee_id !== employeeId) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'You can only update your own leave requests'
        });
      }

      if (String(leave.status || '').toLowerCase() !== 'pending') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Only pending leave requests can be edited'
        });
      }
    }

    const totalDays = computeDays(startDate, endDate);
    if (totalDays < 1) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid leave date range'
      });
    }

    const employee = await Employee.findOne({
      where: { id: employeeId, is_active: true },
      transaction
    });

    if (!employee) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const leaveType = await LeaveType.findOne({
      where: { id: leaveTypeId, is_active: true },
      transaction
    });

    if (!leaveType) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Leave type not found'
      });
    }

    // If an approved leave is edited, restore previous balance first.
    if (leave.status === 'approved') {
      const previousEmployee = await Employee.findByPk(leave.employee_id, { transaction });
      const previousLeaveType = await LeaveType.findByPk(leave.leave_type_id, { transaction });
      if (previousEmployee && previousLeaveType) {
        const balances = parseBalances(previousEmployee.leave_balances);
        const previousBalance = getOrInitializeBalance(balances, previousLeaveType.id, previousLeaveType.days_per_year);

        if (previousBalance !== null) {
          balances[getBalanceKey(previousLeaveType.id)] = Number(previousBalance) + Number(leave.total_days || 0);
          await previousEmployee.update({ leave_balances: balances }, { transaction });
        }
      }
    }

    await leave.update({
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      start_date: startDate,
      end_date: endDate,
      total_days: totalDays,
      reason,
      attachment_name: attachmentName,
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Leave request updated successfully',
      data: {
        id: leave.id,
        status: titleCaseStatus(leave.status)
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: 'Failed to update leave request',
      error: error.message
    });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!isPrivilegedRole(role)) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only HR/Admin can approve or reject leave requests'
      });
    }

    const leaveId = Number(req.params?.id);
    const nextStatus = String(req.body?.status || '').trim().toLowerCase();

    if (!leaveId || !['approved', 'rejected'].includes(nextStatus)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid leave id and status (approved/rejected) are required'
      });
    }

    const leave = await Leave.findByPk(leaveId, { transaction });
    if (!leave) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    const employee = await Employee.findByPk(leave.employee_id, { transaction });
    const leaveType = await LeaveType.findByPk(leave.leave_type_id, { transaction });

    if (!employee || !leaveType) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Employee or leave type not found'
      });
    }

    const previousStatus = String(leave.status || '').toLowerCase();

    if (previousStatus !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only pending leave requests can be approved or rejected'
      });
    }

    const balances = parseBalances(employee.leave_balances);
    const balanceValue = getOrInitializeBalance(balances, leaveType.id, leaveType.days_per_year);

    // Deduct balance when pending leave is approved.
    if (nextStatus === 'approved') {
      if (balanceValue !== null) {
        const available = Number(balanceValue);
        const required = Number(leave.total_days || 0);

        if (available < required) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Insufficient leave balance. Available: ${available}, Required: ${required}`
          });
        }

        balances[getBalanceKey(leaveType.id)] = available - required;
      }
    }

    await employee.update({ leave_balances: balances }, { transaction });

    await leave.update({
      status: nextStatus,
      reviewed_by: Number(req.user?.sub) || null,
      reviewed_at: new Date()
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Leave status updated successfully',
      data: {
        id: leave.id,
        status: titleCaseStatus(leave.status)
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: 'Failed to update leave status',
      error: error.message
    });
  }
};
