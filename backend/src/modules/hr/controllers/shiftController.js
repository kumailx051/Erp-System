const { Employee } = require('../models/Employee');
const { Shift } = require('../models/Shift');

function normalizeTime(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

exports.listShifts = async (req, res) => {
  try {
    const shifts = await Shift.findAll({
      where: { is_active: true },
      order: [['created_at', 'ASC']]
    });

    const employees = await Employee.findAll({
      where: { is_active: true },
      attributes: ['shift_id']
    });

    const countByShift = new Map();
    for (const row of employees) {
      const shiftId = Number(row.shift_id);
      if (!shiftId) continue;
      countByShift.set(shiftId, (countByShift.get(shiftId) || 0) + 1);
    }

    return res.status(200).json({
      success: true,
      data: {
        shifts: shifts.map((shift) => ({
          id: shift.id,
          name: shift.name,
          startTime: String(shift.start_time || '').slice(0, 5),
          endTime: String(shift.end_time || '').slice(0, 5),
          breakMinutes: shift.break_minutes,
          employees: countByShift.get(shift.id) || 0,
          isActive: shift.is_active
        }))
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch shifts',
      error: error.message
    });
  }
};

exports.createShift = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const startTime = normalizeTime(req.body?.startTime);
    const endTime = normalizeTime(req.body?.endTime);
    const breakMinutes = Number(req.body?.breakMinutes || 0);

    if (!name || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'name, startTime and endTime are required in HH:mm format'
      });
    }

    if (!Number.isInteger(breakMinutes) || breakMinutes < 0) {
      return res.status(400).json({
        success: false,
        message: 'breakMinutes must be a non-negative integer'
      });
    }

    const existing = await Shift.findOne({ where: { name } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Shift name already exists'
      });
    }

    const shift = await Shift.create({
      name,
      start_time: startTime,
      end_time: endTime,
      break_minutes: breakMinutes,
      is_active: true
    });

    return res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      data: {
        id: shift.id,
        name: shift.name,
        startTime: String(shift.start_time || '').slice(0, 5),
        endTime: String(shift.end_time || '').slice(0, 5),
        breakMinutes: shift.break_minutes,
        employees: 0,
        isActive: shift.is_active
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create shift',
      error: error.message
    });
  }
};

exports.getRoster = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      where: { is_active: true },
      attributes: ['id', 'first_name', 'last_name', 'department', 'shift_id'],
      order: [['created_at', 'DESC']]
    });

    const shiftIds = Array.from(new Set(employees
      .map((employee) => Number(employee.shift_id))
      .filter((shiftId) => Number.isInteger(shiftId) && shiftId > 0)));

    const shifts = shiftIds.length > 0
      ? await Shift.findAll({
          where: { id: shiftIds },
          attributes: ['id', 'name', 'start_time', 'end_time']
        })
      : [];

    const shiftById = new Map();
    for (const shift of shifts) {
      shiftById.set(Number(shift.id), shift);
    }

    return res.status(200).json({
      success: true,
      data: {
        roster: employees.map((employee) => {
          const assignedShiftId = Number(employee.shift_id);
          const shift = Number.isInteger(assignedShiftId) ? shiftById.get(assignedShiftId) : null;
          const isAssigned = Boolean(shift);

          return {
            employeeId: employee.id,
            employeeName: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
            department: employee.department || '-',
            shiftId: shift?.id || null,
            shiftName: shift?.name || null,
            status: isAssigned ? 'assigned' : 'unassigned'
          };
        })
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch roster',
      error: error.message
    });
  }
};

exports.assignShift = async (req, res) => {
  try {
    const employeeId = Number(req.params?.employeeId);
    const shiftId = req.body?.shiftId === null || req.body?.shiftId === ''
      ? null
      : Number(req.body?.shiftId);

    if (!employeeId || !Number.isInteger(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid employeeId is required'
      });
    }

    const employee = await Employee.findOne({
      where: { id: employeeId, is_active: true }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    let shift = null;
    if (shiftId !== null) {
      if (!Number.isInteger(shiftId)) {
        return res.status(400).json({
          success: false,
          message: 'shiftId must be null or a valid integer'
        });
      }

      shift = await Shift.findOne({ where: { id: shiftId, is_active: true } });
      if (!shift) {
        return res.status(404).json({
          success: false,
          message: 'Shift not found'
        });
      }
    }

    await employee.update({ shift_id: shift ? shift.id : null });

    return res.status(200).json({
      success: true,
      message: 'Shift assignment updated successfully',
      data: {
        employeeId,
        shiftId: shift ? shift.id : null,
        status: shift ? 'assigned' : 'unassigned'
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to assign shift',
      error: error.message
    });
  }
};
