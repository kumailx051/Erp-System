const { fn, col, where } = require('sequelize');
const LeaveType = require('../models/LeaveType');
const { Employee } = require('../models/Employee');

async function initializeLeaveTypeBalanceForEmployees(leaveTypeId, daysPerYear) {
  if (daysPerYear === null || daysPerYear === undefined) {
    return;
  }

  const employees = await Employee.findAll({
    where: { is_active: true },
    attributes: ['id', 'leave_balances']
  });

  for (const employee of employees) {
    const balances = employee.leave_balances && typeof employee.leave_balances === 'object'
      ? { ...employee.leave_balances }
      : {};
    const key = String(leaveTypeId);

    if (!Object.prototype.hasOwnProperty.call(balances, key)) {
      balances[key] = Number(daysPerYear);
      await employee.update({ leave_balances: balances });
    }
  }
}

exports.getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.findAll({
      where: { is_active: true },
      order: [['created_at', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        leaveTypes: leaveTypes.map((item) => ({
          id: item.id,
          name: item.name,
          abbreviation: item.abbreviation,
          daysPerYear: item.days_per_year,
          carryForward: item.carry_forward,
          encashable: item.encashable,
          applicableTo: item.applicable_to,
          isActive: item.is_active
        }))
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch leave types',
      error: error.message
    });
  }
};

exports.createLeaveType = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const abbreviation = String(req.body?.abbreviation || '').trim();
    const rawDays = req.body?.daysPerYear;
    const daysPerYear = rawDays === '' || rawDays === null || rawDays === undefined
      ? null
      : Number(rawDays);
    const carryForward = Boolean(req.body?.carryForward);
    const encashable = Boolean(req.body?.encashable);
    const applicableTo = String(req.body?.applicableTo || '').trim() || 'All Employees';

    if (!name || !abbreviation) {
      return res.status(400).json({
        success: false,
        message: 'name and abbreviation are required'
      });
    }

    if (daysPerYear !== null && (!Number.isInteger(daysPerYear) || daysPerYear < 0)) {
      return res.status(400).json({
        success: false,
        message: 'daysPerYear must be a non-negative integer or null'
      });
    }

    const existing = await LeaveType.findOne({
      where: where(fn('LOWER', col('name')), name.toLowerCase())
    });

    if (existing && existing.is_active) {
      return res.status(409).json({
        success: false,
        message: 'Leave type already exists'
      });
    }

    if (existing && !existing.is_active) {
      await existing.update({
        abbreviation,
        days_per_year: daysPerYear,
        carry_forward: carryForward,
        encashable,
        applicable_to: applicableTo,
        is_active: true
      });

      await initializeLeaveTypeBalanceForEmployees(existing.id, existing.days_per_year);

      return res.status(200).json({
        success: true,
        message: 'Leave type restored successfully',
        data: {
          id: existing.id,
          name: existing.name,
          abbreviation: existing.abbreviation,
          daysPerYear: existing.days_per_year,
          carryForward: existing.carry_forward,
          encashable: existing.encashable,
          applicableTo: existing.applicable_to,
          isActive: existing.is_active
        }
      });
    }

    const created = await LeaveType.create({
      name,
      abbreviation,
      days_per_year: daysPerYear,
      carry_forward: carryForward,
      encashable,
      applicable_to: applicableTo,
      is_active: true
    });

    await initializeLeaveTypeBalanceForEmployees(created.id, created.days_per_year);

    return res.status(201).json({
      success: true,
      message: 'Leave type created successfully',
      data: {
        id: created.id,
        name: created.name,
        abbreviation: created.abbreviation,
        daysPerYear: created.days_per_year,
        carryForward: created.carry_forward,
        encashable: created.encashable,
        applicableTo: created.applicable_to,
        isActive: created.is_active
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create leave type',
      error: error.message
    });
  }
};
