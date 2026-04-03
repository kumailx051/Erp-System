const { Op } = require('sequelize');
const { sequelize } = require('../../../core/database/connection');
const { Employee } = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { Shift } = require('../models/Shift');

const ALLOWED_STATUSES = new Set(['present', 'late', 'absent', 'half_day', 'on_leave']);

function resolveDate(rawDate) {
  const candidate = String(rawDate || '').trim();
  if (!candidate) {
    return new Date().toISOString().slice(0, 10);
  }

  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function resolveMonth(rawMonth) {
  const candidate = String(rawMonth || '').trim();
  const fallback = new Date().toISOString().slice(0, 7);

  if (!candidate) {
    return fallback;
  }

  if (!/^\d{4}-\d{2}$/.test(candidate)) {
    return null;
  }

  const [yearPart, monthPart] = candidate.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return candidate;
}

function toMonthBoundary(monthString) {
  const [yearPart, monthPart] = monthString.split('-');
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  const startDate = new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 10);
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0)).toISOString().slice(0, 10);

  return { startDate, endDate };
}

function toEmployeeAttendanceView(employee, attendanceRecord) {
  const workedMinutes = Number(attendanceRecord?.worked_minutes || 0);
  const overtimeMinutes = Number(attendanceRecord?.overtime_minutes || 0);

  return {
    id: employee.id,
    fullName: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
    department: employee.department,
    designation: employee.designation,
    attendanceStatus: attendanceRecord?.status || null,
    checkInTime: attendanceRecord?.check_in_time || null,
    checkOutTime: attendanceRecord?.check_out_time || null,
    workedMinutes: attendanceRecord?.worked_minutes ?? null,
    overtimeMinutes,
    overtimeHoursLabel: formatWorkedHours(overtimeMinutes),
    workedHoursLabel: workedMinutes > 0 ? formatWorkedHours(workedMinutes) : '-',
    remarks: attendanceRecord?.remarks || null
  };
}

function parseTimeToMinutes(timeValue) {
  const value = String(timeValue || '').trim();
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
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

  return (hours * 60) + minutes;
}

function minutesToTimeString(minutes) {
  const safeMinutes = Math.max(0, Number(minutes || 0));
  const hoursPart = String(Math.floor(safeMinutes / 60)).padStart(2, '0');
  const minsPart = String(safeMinutes % 60).padStart(2, '0');
  return `${hoursPart}:${minsPart}`;
}

function resolveOvertimeMinutes(checkOutMinutes, shiftEndMinutes) {
  if (checkOutMinutes === null || shiftEndMinutes === null) {
    return 0;
  }

  return checkOutMinutes > shiftEndMinutes ? (checkOutMinutes - shiftEndMinutes) : 0;
}

function formatWorkedHours(minutes) {
  const total = Number(minutes || 0);
  if (!total || total < 0) {
    return '-';
  }

  const hoursPart = Math.floor(total / 60);
  const minutesPart = total % 60;
  return `${hoursPart}h ${String(minutesPart).padStart(2, '0')}m`;
}

function formatTimeLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '-';
  }

  return raw.length >= 5 ? raw.slice(0, 5) : raw;
}

function isTodayDate(dateString) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return today === dateString;
}

function summarize(records) {
  const summary = {
    totalEmployees: records.length,
    markedEmployees: 0,
    present: 0,
    late: 0,
    absent: 0,
    halfDay: 0,
    onLeave: 0
  };

  for (const record of records) {
    if (!record.attendanceStatus) {
      continue;
    }

    summary.markedEmployees += 1;

    if (record.attendanceStatus === 'present') summary.present += 1;
    if (record.attendanceStatus === 'late') summary.late += 1;
    if (record.attendanceStatus === 'absent') summary.absent += 1;
    if (record.attendanceStatus === 'half_day') summary.halfDay += 1;
    if (record.attendanceStatus === 'on_leave') summary.onLeave += 1;
  }

  return summary;
}

function buildDailyCounts(rows) {
  const byDate = new Map();

  for (const row of rows) {
    const dateKey = String(row.attendance_date);
    const previous = byDate.get(dateKey) || {
      present: 0,
      late: 0,
      absent: 0,
      half_day: 0,
      on_leave: 0
    };

    if (previous[row.status] !== undefined) {
      previous[row.status] += 1;
    }

    byDate.set(dateKey, previous);
  }

  return byDate;
}

function getDominantStatus(counts) {
  const statusOrder = ['present', 'late', 'half_day', 'on_leave', 'absent'];
  let maxStatus = null;
  let maxValue = 0;

  for (const status of statusOrder) {
    const value = Number(counts?.[status] || 0);
    if (value > maxValue) {
      maxValue = value;
      maxStatus = status;
    }
  }

  return maxStatus;
}

exports.getAttendanceAnalytics = async (req, res) => {
  try {
    const month = resolveMonth(req.query?.month);
    const anchorDate = resolveDate(req.query?.date);

    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Use YYYY-MM.'
      });
    }

    if (!anchorDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.'
      });
    }

    const { startDate, endDate } = toMonthBoundary(month);
    const attendanceRows = await Attendance.findAll({
      where: {
        attendance_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: ['attendance_date', 'status']
    });

    const dailyCounts = buildDailyCounts(attendanceRows);

    const [yearPart, monthPart] = month.split('-');
    const year = Number(yearPart);
    const monthIndex = Number(monthPart) - 1;
    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

    const calendar = {};
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateValue = new Date(Date.UTC(year, monthIndex, day));
      const dateKey = dateValue.toISOString().slice(0, 10);
      const counts = dailyCounts.get(dateKey);

      if (counts) {
        calendar[String(day)] = getDominantStatus(counts);
      } else {
        const dayOfWeek = dateValue.getUTCDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          calendar[String(day)] = 'weekend';
        } else {
          calendar[String(day)] = null;
        }
      }
    }

    const anchor = new Date(`${anchorDate}T00:00:00Z`);
    const dayOfWeek = anchor.getUTCDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(anchor);
    monday.setUTCDate(anchor.getUTCDate() + mondayOffset);

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const weeklyTrend = labels.map((label, index) => {
      const current = new Date(monday);
      current.setUTCDate(monday.getUTCDate() + index);
      const key = current.toISOString().slice(0, 10);
      const counts = dailyCounts.get(key) || {};

      return {
        day: label,
        present: Number(counts.present || 0) + Number(counts.late || 0) + Number(counts.half_day || 0),
        absent: Number(counts.absent || 0)
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        month,
        weeklyTrend,
        calendar
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance analytics',
      error: error.message
    });
  }
};

exports.getAttendanceEmployees = async (req, res) => {
  try {
    const attendanceDate = resolveDate(req.query?.date);
    if (!attendanceDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.'
      });
    }

    const employees = await Employee.findAll({
      where: { is_active: true },
      order: [['created_at', 'DESC']]
    });

    const attendanceRecords = await Attendance.findAll({
      where: { attendance_date: attendanceDate }
    });

    const attendanceByEmployee = new Map();
    for (const attendance of attendanceRecords) {
      attendanceByEmployee.set(attendance.employee_id, attendance);
    }

    const records = employees.map((employee) =>
      toEmployeeAttendanceView(employee, attendanceByEmployee.get(employee.id))
    );

    return res.status(200).json({
      success: true,
      data: {
        date: attendanceDate,
        employees: records,
        summary: summarize(records),
        allowedStatuses: Array.from(ALLOWED_STATUSES)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance data',
      error: error.message
    });
  }
};

exports.getEmployeeAttendanceDetails = async (req, res) => {
  try {
    const employeeId = Number(req.params?.id);
    if (!employeeId || !Number.isInteger(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid employee id is required'
      });
    }

    const month = resolveMonth(req.query?.month);
    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Use YYYY-MM.'
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

    const { startDate, endDate } = toMonthBoundary(month);
    const attendanceRows = await Attendance.findAll({
      where: {
        employee_id: employeeId,
        attendance_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['attendance_date', 'ASC']]
    });

    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      onLeave: 0,
      totalDays: attendanceRows.length,
      avgHours: '-'
    };

    let workedMinutesTotal = 0;
    let workedMinutesDays = 0;

    const records = attendanceRows.map((row) => {
      const status = row.status;

      if (status === 'present') summary.present += 1;
      if (status === 'absent') summary.absent += 1;
      if (status === 'late') summary.late += 1;
      if (status === 'half_day') summary.halfDay += 1;
      if (status === 'on_leave') summary.onLeave += 1;

      const rowWorkedMinutes = Number(row.worked_minutes || 0);
      if (rowWorkedMinutes > 0) {
        workedMinutesTotal += rowWorkedMinutes;
        workedMinutesDays += 1;
      }

      const dateValue = row.attendance_date;
      const day = new Date(dateValue).toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'UTC'
      });

      return {
        date: dateValue,
        day,
        checkIn: formatTimeLabel(row.check_in_time),
        checkOut: formatTimeLabel(row.check_out_time),
        hours: row.worked_minutes ? formatWorkedHours(row.worked_minutes) : '-',
        status,
        remarks: row.remarks || null
      };
    });

    if (workedMinutesDays > 0) {
      summary.avgHours = formatWorkedHours(Math.round(workedMinutesTotal / workedMinutesDays));
    }

    return res.status(200).json({
      success: true,
      data: {
        month,
        employee: {
          id: employee.id,
          fullName: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
          department: employee.department,
          designation: employee.designation
        },
        summary,
        records
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch employee attendance details',
      error: error.message
    });
  }
};

exports.getAttendanceReport = async (req, res) => {
  try {
    const reportType = String(req.query?.type || 'monthly_summary').trim().toLowerCase();
    const month = resolveMonth(req.query?.month);

    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Use YYYY-MM.'
      });
    }

    const supportedTypes = new Set([
      'monthly_summary',
      'late_arrivals',
      'absentee_report',
      'overtime_report'
    ]);

    if (!supportedTypes.has(reportType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type'
      });
    }

    const { startDate, endDate } = toMonthBoundary(month);
    const rows = await Attendance.findAll({
      where: {
        attendance_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'department', 'designation'],
          required: true,
          where: { is_active: true }
        }
      ]
    });

    if (reportType === 'monthly_summary') {
      const counts = {
        present: 0,
        late: 0,
        absent: 0,
        half_day: 0,
        on_leave: 0
      };

      for (const row of rows) {
        if (counts[row.status] !== undefined) {
          counts[row.status] += 1;
        }
      }

      const responseRows = [
        { metric: 'Present', value: counts.present },
        { metric: 'Late', value: counts.late },
        { metric: 'Absent', value: counts.absent },
        { metric: 'Half Day', value: counts.half_day },
        { metric: 'On Leave', value: counts.on_leave },
        { metric: 'Total Marked Records', value: rows.length }
      ];

      return res.status(200).json({
        success: true,
        data: {
          reportType,
          month,
          title: 'Monthly Summary',
          note: null,
          columns: [
            { key: 'metric', label: 'Metric' },
            { key: 'value', label: 'Value' }
          ],
          rows: responseRows
        }
      });
    }

    const buildEmployeeCountRows = (targetStatus) => {
      const map = new Map();

      for (const row of rows) {
        if (row.status !== targetStatus || !row.employee) {
          continue;
        }

        const key = row.employee.id;
        const previous = map.get(key) || {
          employeeId: row.employee.id,
          employeeName: `${row.employee.first_name || ''} ${row.employee.last_name || ''}`.trim(),
          department: row.employee.department || '-',
          designation: row.employee.designation || '-',
          count: 0
        };

        previous.count += 1;
        map.set(key, previous);
      }

      return Array.from(map.values()).sort((a, b) => b.count - a.count);
    };

    if (reportType === 'late_arrivals') {
      return res.status(200).json({
        success: true,
        data: {
          reportType,
          month,
          title: 'Late Arrivals',
          note: null,
          columns: [
            { key: 'employeeName', label: 'Employee' },
            { key: 'department', label: 'Department' },
            { key: 'designation', label: 'Designation' },
            { key: 'count', label: 'Late Days' }
          ],
          rows: buildEmployeeCountRows('late')
        }
      });
    }

    if (reportType === 'absentee_report') {
      return res.status(200).json({
        success: true,
        data: {
          reportType,
          month,
          title: 'Absentee Report',
          note: null,
          columns: [
            { key: 'employeeName', label: 'Employee' },
            { key: 'department', label: 'Department' },
            { key: 'designation', label: 'Designation' },
            { key: 'count', label: 'Absent Days' }
          ],
          rows: buildEmployeeCountRows('absent')
        }
      });
    }

    const overtimeByEmployee = new Map();

    for (const row of rows) {
      const overtimeMinutes = Number(row.overtime_minutes || 0);
      if (!row.employee || overtimeMinutes <= 0) {
        continue;
      }

      const key = row.employee.id;
      const previous = overtimeByEmployee.get(key) || {
        employeeId: row.employee.id,
        employeeName: `${row.employee.first_name || ''} ${row.employee.last_name || ''}`.trim(),
        department: row.employee.department || '-',
        designation: row.employee.designation || '-',
        overtimeDays: 0,
        overtimeMinutes: 0,
        overtimeHours: '0h 00m'
      };

      previous.overtimeDays += 1;
      previous.overtimeMinutes += overtimeMinutes;
      previous.overtimeHours = formatWorkedHours(previous.overtimeMinutes);
      overtimeByEmployee.set(key, previous);
    }

    const overtimeRows = Array.from(overtimeByEmployee.values()).sort((a, b) => b.overtimeMinutes - a.overtimeMinutes);

    return res.status(200).json({
      success: true,
      data: {
        reportType,
        month,
        title: 'Overtime Report',
        note: null,
        columns: [
          { key: 'employeeName', label: 'Employee' },
          { key: 'department', label: 'Department' },
          { key: 'designation', label: 'Designation' },
          { key: 'overtimeDays', label: 'Overtime Days' },
          { key: 'overtimeHours', label: 'Overtime Hours' }
        ],
        rows: overtimeRows
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance report',
      error: error.message
    });
  }
};

exports.markAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userRole = String(req.user?.role || '').trim().toLowerCase();
    if (userRole !== 'employee') {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Attendance can only be marked by employees from employee portal'
      });
    }

    const authEmail = String(req.user?.email || '').trim().toLowerCase();
    if (!authEmail) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        message: 'Authenticated email not found'
      });
    }

    const loggedInEmployee = await Employee.findOne({
      where: {
        email: authEmail,
        is_active: true
      },
      transaction
    });

    if (!loggedInEmployee) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Employee profile not found for authenticated user'
      });
    }

    const attendanceDate = resolveDate(req.body?.date);
    const inputRecords = Array.isArray(req.body?.records) ? req.body.records : null;

    if (!attendanceDate) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.'
      });
    }

    if (!inputRecords || inputRecords.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'records array is required'
      });
    }

    if (inputRecords.length !== 1) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only one self attendance record is allowed'
      });
    }

    if (!isTodayDate(attendanceDate)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Employees can only mark attendance for today'
      });
    }

    const normalizedRecords = [];
    const employeeIds = [];

    for (const item of inputRecords) {
      const employeeId = Number(item?.employeeId);
      const status = String(item?.status || '').trim();
      const remarks = String(item?.remarks || '').trim();
      const checkInTime = String(item?.checkInTime || '').trim();
      const checkOutTime = String(item?.checkOutTime || '').trim();

      if (!employeeId || !Number.isInteger(employeeId)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Each record must include a valid employeeId'
        });
      }

      if (employeeId !== Number(loggedInEmployee.id)) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'You can only mark attendance for your own profile'
        });
      }

      if (!ALLOWED_STATUSES.has(status)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Each record must include a valid status'
        });
      }

      const checkInMinutes = parseTimeToMinutes(checkInTime);
      const checkOutMinutes = parseTimeToMinutes(checkOutTime);

      if (checkInTime && checkInMinutes === null) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'checkInTime must be in HH:mm format'
        });
      }

      if (checkOutTime && checkOutMinutes === null) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'checkOutTime must be in HH:mm format'
        });
      }

      if (checkOutMinutes !== null && checkInMinutes === null) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'checkInTime is required when checkOutTime is provided'
        });
      }

      if (checkInMinutes !== null && checkOutMinutes !== null && checkOutMinutes <= checkInMinutes) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'checkOutTime must be later than checkInTime'
        });
      }

      if (isTodayDate(attendanceDate)) {
        const now = new Date();
        const nowMinutes = (now.getHours() * 60) + now.getMinutes();

        if (checkInMinutes !== null && checkInMinutes > nowMinutes) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Check-in time cannot be in the future for today'
          });
        }

        if (checkOutMinutes !== null && checkOutMinutes > nowMinutes) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Check-out time cannot be in the future for today'
          });
        }
      }

      const workedMinutes = (checkInMinutes !== null && checkOutMinutes !== null)
        ? (checkOutMinutes - checkInMinutes)
        : null;

      normalizedRecords.push({
        employeeId,
        status,
        checkInTime: checkInMinutes !== null ? minutesToTimeString(checkInMinutes) : null,
        checkOutTime: checkOutMinutes !== null ? minutesToTimeString(checkOutMinutes) : null,
        checkOutMinutes,
        workedMinutes,
        overtimeMinutes: 0,
        remarks: remarks || null
      });
      employeeIds.push(employeeId);
    }

    const employees = await Employee.findAll({
      where: { id: employeeIds, is_active: true },
      transaction
    });

    if (employees.length !== new Set(employeeIds).size) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'One or more employees were not found or inactive'
      });
    }

    const markedBy = Number(req.user?.sub);
    if (!markedBy) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        message: 'Unauthorized user context'
      });
    }

    const shiftEndByEmployee = new Map();

    const shiftIds = Array.from(new Set(employees
      .map((employee) => Number(employee.shift_id))
      .filter((shiftId) => Number.isInteger(shiftId) && shiftId > 0)));

    const shifts = shiftIds.length > 0
      ? await Shift.findAll({
          where: { id: shiftIds, is_active: true },
          attributes: ['id', 'end_time'],
          transaction
        })
      : [];

    const shiftEndByShiftId = new Map();
    for (const shift of shifts) {
      const shiftEndMinutes = parseTimeToMinutes(shift?.end_time);
      if (shiftEndMinutes !== null) {
        shiftEndByShiftId.set(Number(shift.id), shiftEndMinutes);
      }
    }

    for (const employee of employees) {
      const shiftId = Number(employee.shift_id);
      if (!Number.isInteger(shiftId)) {
        continue;
      }
      if (shiftEndByShiftId.has(shiftId)) {
        shiftEndByEmployee.set(employee.id, shiftEndByShiftId.get(shiftId));
      }
    }

    for (const item of normalizedRecords) {
      const shiftEndMinutes = shiftEndByEmployee.has(item.employeeId)
        ? shiftEndByEmployee.get(item.employeeId)
        : null;
      item.overtimeMinutes = resolveOvertimeMinutes(item.checkOutMinutes, shiftEndMinutes);
    }

    for (const item of normalizedRecords) {
      await Attendance.upsert(
        {
          employee_id: item.employeeId,
          attendance_date: attendanceDate,
          status: item.status,
          check_in_time: item.checkInTime,
          check_out_time: item.checkOutTime,
          worked_minutes: item.workedMinutes,
          overtime_minutes: item.overtimeMinutes,
          remarks: item.remarks,
          marked_by: markedBy
        },
        { transaction }
      );
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Attendance saved successfully',
      data: {
        date: attendanceDate,
        savedRecords: normalizedRecords.length
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: 'Failed to save attendance',
      error: error.message
    });
  }
};
