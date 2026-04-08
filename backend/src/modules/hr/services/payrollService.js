const { Op } = require('sequelize');
const { Employee } = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const LeaveType = require('../models/LeaveType');
const SalaryComponent = require('../models/SalaryComponent');
const EmployeeSalaryStructure = require('../models/EmployeeSalaryStructure');
const PayrollRun = require('../models/PayrollRun');
const Payslip = require('../models/Payslip');
const PayslipLineItem = require('../models/PayslipLineItem');
const PayrollRule = require('../models/PayrollRule');

const PROCESSING_MAX_STEP = 5;
const OVERTIME_MULTIPLIER = 1.5;

function toMoney(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function toMonthYear(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function monthBoundaries(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth(year, month)).padStart(2, '0')}`;
  return { start, end };
}

function eachDateBetween(startDate, endDate) {
  const dates = [];
  const cursor = new Date(startDate);
  const end = new Date(endDate);

  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function attendanceWeight(status) {
  if (status === 'half_day') return 0.5;
  if (status === 'absent') return 0;
  return 1;
}

async function ensurePayrollRun(year, month, initiatedBy) {
  const [run] = await PayrollRun.findOrCreate({
    where: { year, month },
    defaults: {
      year,
      month,
      initiated_by: initiatedBy || null,
      status: 'draft',
      current_step: 1
    }
  });

  return run;
}

async function getActiveComponents() {
  return SalaryComponent.findAll({
    where: { is_active: true },
    order: [['component_type', 'ASC'], ['name', 'ASC']]
  });
}

const DEFAULT_PAYROLL_RULES = {
  salary_basis: 'fixed_30',
  paid_leave_treatment: 'paid',
  leave_deduction_rate: 1,
  overtime_multiplier: 1.5,
  proration_mode: 'daily'
};

async function getPayrollRules() {
  const records = await PayrollRule.findAll({ order: [['category', 'ASC'], ['label', 'ASC']] });

  if (records.length > 0) {
    return records.map((record) => ({
      id: record.id,
      key: record.rule_key,
      label: record.label,
      category: record.category,
      value: record.value,
      description: record.description,
      isActive: record.is_active
    }));
  }

  const seeded = [
    {
      rule_key: 'salary_basis',
      label: 'Salary Basis',
      category: 'salary',
      value: { mode: DEFAULT_PAYROLL_RULES.salary_basis, options: ['fixed_30', 'calendar_days'] },
      description: 'Choose whether monthly salary is prorated over 30 days or calendar days.'
    },
    {
      rule_key: 'paid_leave_treatment',
      label: 'Paid Leave Treatment',
      category: 'leave',
      value: { mode: DEFAULT_PAYROLL_RULES.paid_leave_treatment, options: ['paid', 'deduct'] },
      description: 'Control whether approved paid leaves are fully paid or deducted.'
    },
    {
      rule_key: 'leave_deduction_rate',
      label: 'Leave Deduction Rate',
      category: 'leave',
      value: { rate: DEFAULT_PAYROLL_RULES.leave_deduction_rate },
      description: 'Percentage of daily salary deducted for unpaid leave days.'
    },
    {
      rule_key: 'overtime_multiplier',
      label: 'Overtime Multiplier',
      category: 'overtime',
      value: { multiplier: DEFAULT_PAYROLL_RULES.overtime_multiplier },
      description: 'Multiplier applied to the hourly overtime rate.'
    },
    {
      rule_key: 'proration_mode',
      label: 'Proration Mode',
      category: 'salary',
      value: { mode: DEFAULT_PAYROLL_RULES.proration_mode, options: ['daily', 'monthly'] },
      description: 'Controls how base salary is prorated across payable days.'
    }
  ];

  const created = await PayrollRule.bulkCreate(seeded, { returning: true });
  return created.map((record) => ({
    id: record.id,
    key: record.rule_key,
    label: record.label,
    category: record.category,
    value: record.value,
    description: record.description,
    isActive: record.is_active
  }));
}

async function upsertPayrollRules(rules = []) {
  const saved = [];
  for (const rule of rules) {
    const [record] = await PayrollRule.findOrCreate({
      where: { rule_key: rule.key },
      defaults: {
        rule_key: rule.key,
        label: rule.label,
        category: rule.category,
        value: rule.value,
        description: rule.description || null,
        is_active: rule.isActive !== false
      }
    });

    await record.update({
      label: rule.label || record.label,
      category: rule.category || record.category,
      value: rule.value === undefined ? record.value : rule.value,
      description: rule.description === undefined ? record.description : rule.description,
      is_active: rule.isActive === undefined ? record.is_active : Boolean(rule.isActive)
    });

    saved.push({
      id: record.id,
      key: record.rule_key,
      label: record.label,
      category: record.category,
      value: record.value,
      description: record.description,
      isActive: record.is_active
    });
  }

  return saved;
}

async function getPayrollRuleMap() {
  const rules = await getPayrollRules();
  const ruleMap = { ...DEFAULT_PAYROLL_RULES };

  for (const rule of rules) {
    if (rule.key === 'salary_basis') {
      ruleMap.salary_basis = rule.value?.mode || ruleMap.salary_basis;
    } else if (rule.key === 'paid_leave_treatment') {
      ruleMap.paid_leave_treatment = rule.value?.mode || ruleMap.paid_leave_treatment;
    } else if (rule.key === 'leave_deduction_rate') {
      ruleMap.leave_deduction_rate = Number(rule.value?.rate ?? ruleMap.leave_deduction_rate);
    } else if (rule.key === 'overtime_multiplier') {
      ruleMap.overtime_multiplier = Number(rule.value?.multiplier ?? ruleMap.overtime_multiplier);
    } else if (rule.key === 'proration_mode') {
      ruleMap.proration_mode = rule.value?.mode || ruleMap.proration_mode;
    }
  }

  return ruleMap;
}

async function computeEmployeePayroll(employee, year, month, components) {
  const rules = await getPayrollRuleMap();
  const { start, end } = monthBoundaries(year, month);
  const totalWorkingDays = rules.salary_basis === 'calendar_days' ? daysInMonth(year, month) : 30;
  const baseSalary = Number(employee.base_salary || 0);
  const dayRate = totalWorkingDays > 0 ? (baseSalary / totalWorkingDays) : 0;

  const attendanceRows = await Attendance.findAll({
    where: {
      employee_id: employee.id,
      attendance_date: {
        [Op.between]: [start, end]
      }
    }
  });

  const approvedLeaves = await Leave.findAll({
    where: {
      employee_id: employee.id,
      status: 'approved',
      start_date: { [Op.lte]: end },
      end_date: { [Op.gte]: start }
    },
    include: [
      {
        model: LeaveType,
        as: 'leaveType',
        required: false
      }
    ]
  });

  let attendancePayableDays = 0;
  let overtimeMinutes = 0;
  const attendanceDateSet = new Set();

  for (const row of attendanceRows) {
    attendancePayableDays += attendanceWeight(row.status);
    overtimeMinutes += Number(row.overtime_minutes || 0);
    if (row.attendance_date) {
      attendanceDateSet.add(String(row.attendance_date));
    }
  }

  let approvedLeavePayableDays = 0;
  let unpaidLeaveDeduction = 0;
  for (const leave of approvedLeaves) {
    const leaveStart = new Date(leave.start_date);
    const leaveEnd = new Date(leave.end_date);
    const monthStart = new Date(start);
    const monthEnd = new Date(end);

    const effectiveStart = leaveStart > monthStart ? leaveStart : monthStart;
    const effectiveEnd = leaveEnd < monthEnd ? leaveEnd : monthEnd;
    const leaveDays = eachDateBetween(effectiveStart, effectiveEnd).length;
    const isPaidLeave = Boolean(leave?.leaveType?.encashable) || rules.paid_leave_treatment === 'paid';

    if (isPaidLeave) {
      for (const date of eachDateBetween(effectiveStart, effectiveEnd)) {
        const dateKey = date.toISOString().slice(0, 10);
        if (!attendanceDateSet.has(dateKey)) {
          approvedLeavePayableDays += 1;
        }
      }
      continue;
    }

    unpaidLeaveDeduction += toMoney(dayRate * leaveDays * Number(rules.leave_deduction_rate || 1));
  }

  let payableDays = attendancePayableDays + approvedLeavePayableDays;
  if (attendanceRows.length === 0 && approvedLeaves.length === 0) {
    // Fallback for employees with no attendance yet in the selected month.
    payableDays = totalWorkingDays;
  }
  payableDays = Math.max(0, Math.min(totalWorkingDays, payableDays));

  const proratedBase = toMoney(dayRate * payableDays);
  const overtimePay = toMoney((dayRate / 8) * (overtimeMinutes / 60) * Number(rules.overtime_multiplier || OVERTIME_MULTIPLIER));

  let extraEarnings = 0;
  let extraDeductions = 0;
  const lineItems = [
    { name: 'Prorated Basic Salary', itemType: 'earning', amount: proratedBase },
    { name: 'Overtime Pay', itemType: 'earning', amount: overtimePay }
  ];

  for (const component of components) {
    let amount = 0;

    if (component.value_type === 'fixed') {
      amount = Number(component.value || 0);
    } else if (component.percentage_of === 'gross_pay') {
      amount = ((proratedBase + overtimePay) * Number(component.value || 0)) / 100;
    } else {
      amount = (proratedBase * Number(component.value || 0)) / 100;
    }

    amount = toMoney(amount);
    if (amount <= 0) continue;

    lineItems.push({
      name: component.name,
      itemType: component.component_type,
      amount
    });

    if (component.component_type === 'earning') {
      extraEarnings += amount;
    } else {
      extraDeductions += amount;
    }
  }

  const absenceDeduction = toMoney(Math.max(0, baseSalary - proratedBase));
  if (absenceDeduction > 0) {
    lineItems.push({
      name: 'Absence Deduction',
      itemType: 'deduction',
      amount: absenceDeduction
    });
  }

  const grossPay = toMoney(proratedBase + overtimePay + extraEarnings);
  const totalDeductions = toMoney(extraDeductions + absenceDeduction + unpaidLeaveDeduction);
  const netPay = toMoney(grossPay - totalDeductions);

  return {
    baseSalary: toMoney(baseSalary),
    workingDays: totalWorkingDays,
    payableDays: toMoney(payableDays),
    overtimeMinutes,
    grossPay,
    totalDeductions,
    netPay,
    lineItems
  };
}

async function upsertPayslip(payrollRun, employee, monthYear, computedData) {
  const [payslip] = await Payslip.findOrCreate({
    where: {
      employee_id: employee.id,
      month_year: monthYear
    },
    defaults: {
      payroll_run_id: payrollRun.id,
      employee_id: employee.id,
      month_year: monthYear,
      base_salary: computedData.baseSalary,
      payable_days: computedData.payableDays,
      working_days: computedData.workingDays,
      overtime_minutes: computedData.overtimeMinutes,
      gross_pay: computedData.grossPay,
      total_deductions: computedData.totalDeductions,
      net_pay: computedData.netPay,
      status: 'generated'
    }
  });

  await payslip.update({
    payroll_run_id: payrollRun.id,
    base_salary: computedData.baseSalary,
    payable_days: computedData.payableDays,
    working_days: computedData.workingDays,
    overtime_minutes: computedData.overtimeMinutes,
    gross_pay: computedData.grossPay,
    total_deductions: computedData.totalDeductions,
    net_pay: computedData.netPay,
    status: payrollRun.status === 'published' ? 'paid' : 'generated'
  });

  await PayslipLineItem.destroy({ where: { payslip_id: payslip.id } });

  if (computedData.lineItems.length > 0) {
    await PayslipLineItem.bulkCreate(
      computedData.lineItems.map((item) => ({
        payslip_id: payslip.id,
        name: item.name,
        item_type: item.itemType,
        amount: item.amount
      }))
    );
  }

  return payslip;
}

async function generatePayroll(year, month, initiatedBy) {
  const payrollRun = await ensurePayrollRun(year, month, initiatedBy);
  const monthYear = toMonthYear(year, month);
  const employees = await Employee.findAll({ where: { is_active: true } });
  const components = await getActiveComponents();

  const generated = [];
  for (const employee of employees) {
    const computed = await computeEmployeePayroll(employee, year, month, components);
    const payslip = await upsertPayslip(payrollRun, employee, monthYear, computed);

    generated.push({
      payslipId: payslip.id,
      employeeId: employee.id,
      employeeName: `${employee.first_name} ${employee.last_name}`.trim(),
      grossPay: computed.grossPay,
      deductions: computed.totalDeductions,
      netPay: computed.netPay,
      status: payslip.status
    });
  }

  await payrollRun.update({
    status: 'processing',
    current_step: Math.max(payrollRun.current_step, 2),
    processed_at: new Date()
  });

  return {
    payrollRun,
    generated
  };
}

async function getPayrollSummary(year, month) {
  const monthYear = toMonthYear(year, month);
  const rows = await Payslip.findAll({ where: { month_year: monthYear } });

  const employeeCount = rows.length;
  const netPayroll = toMoney(rows.reduce((sum, row) => sum + Number(row.net_pay || 0), 0));
  const grossPayroll = toMoney(rows.reduce((sum, row) => sum + Number(row.gross_pay || 0), 0));
  const paidCount = rows.filter((row) => row.status === 'paid').length;
  const pendingCount = Math.max(0, employeeCount - paidCount);

  return {
    month,
    year,
    monthYear,
    employeeCount,
    paidCount,
    pendingCount,
    grossPayroll,
    netPayroll
  };
}

async function getPayrollRegister(year, month, search, status) {
  const monthYear = toMonthYear(year, month);
  const where = { month_year: monthYear };
  if (status) {
    where.status = status;
  }

  const payslips = await Payslip.findAll({
    where,
    include: [
      {
        model: Employee,
        as: 'employee',
        required: true
      }
    ],
    order: [['net_pay', 'DESC']]
  });

  const filtered = payslips.filter((row) => {
    if (!search) return true;
    const fullName = `${row.employee.first_name} ${row.employee.last_name}`.toLowerCase();
    const code = String(row.employee.employee_code || '').toLowerCase();
    const dept = String(row.employee.department || '').toLowerCase();
    const needle = String(search).toLowerCase();
    return fullName.includes(needle) || code.includes(needle) || dept.includes(needle);
  });

  return filtered.map((row) => ({
    id: row.id,
    employeeId: row.employee_id,
    employeeCode: row.employee.employee_code,
    employeeName: `${row.employee.first_name} ${row.employee.last_name}`.trim(),
    department: row.employee.department,
    baseSalary: toMoney(row.base_salary),
    grossPay: toMoney(row.gross_pay),
    deductions: toMoney(row.total_deductions),
    netPay: toMoney(row.net_pay),
    status: row.status,
    monthYear: row.month_year
  }));
}

async function getPayrollRunStatus(year, month, initiatedBy) {
  const run = await ensurePayrollRun(year, month, initiatedBy);
  const summary = await getPayrollSummary(year, month);

  return {
    id: run.id,
    month: run.month,
    year: run.year,
    status: run.status,
    currentStep: run.current_step,
    processedAt: run.processed_at,
    publishedAt: run.published_at,
    summary
  };
}

async function advancePayrollStep(year, month, initiatedBy) {
  const run = await ensurePayrollRun(year, month, initiatedBy);

  let currentStep = Math.min(PROCESSING_MAX_STEP, (run.current_step || 1) + 1);
  let status = run.status;

  if (currentStep >= 2) {
    await generatePayroll(year, month, initiatedBy);
    status = currentStep >= 4 ? 'approved' : 'processing';
  }

  await run.update({
    current_step: currentStep,
    status
  });

  return getPayrollRunStatus(year, month, initiatedBy);
}

async function publishPayroll(year, month, initiatedBy) {
  const run = await ensurePayrollRun(year, month, initiatedBy);
  await generatePayroll(year, month, initiatedBy);

  await run.update({
    status: 'published',
    current_step: PROCESSING_MAX_STEP,
    published_at: new Date()
  });

  const monthYear = toMonthYear(year, month);
  await Payslip.update(
    { status: 'paid' },
    {
      where: {
        payroll_run_id: run.id,
        month_year: monthYear
      }
    }
  );

  return getPayrollRunStatus(year, month, initiatedBy);
}

async function getEmployeeSalary(employeeId) {
  const employee = await Employee.findOne({
    where: { id: employeeId, is_active: true },
    include: [
      {
        model: EmployeeSalaryStructure,
        as: 'salaryStructure',
        required: false
      }
    ]
  });

  if (!employee) {
    return null;
  }

  const latestPayslip = await Payslip.findOne({
    where: { employee_id: employee.id },
    order: [['month_year', 'DESC']]
  });

  return {
    id: employee.id,
    employeeCode: employee.employee_code,
    fullName: `${employee.first_name} ${employee.last_name}`.trim(),
    department: employee.department,
    designation: employee.designation,
    baseSalary: toMoney(employee.base_salary),
    annualCtc: toMoney(employee.salaryStructure?.annual_ctc || (Number(employee.base_salary || 0) * 12)),
    structureNotes: employee.salaryStructure?.notes || null,
    lastNetPay: latestPayslip ? toMoney(latestPayslip.net_pay) : 0,
    latestMonth: latestPayslip ? latestPayslip.month_year : null
  };
}

async function getEmployeePayslips(employeeId, year) {
  const where = { employee_id: employeeId };
  if (year) {
    where.month_year = {
      [Op.like]: `${year}-%`
    };
  }

  const rows = await Payslip.findAll({
    where,
    include: [
      {
        model: PayslipLineItem,
        as: 'lineItems',
        required: false
      }
    ],
    order: [['month_year', 'DESC']]
  });

  return rows.map((row) => ({
    id: row.id,
    monthYear: row.month_year,
    baseSalary: toMoney(row.base_salary),
    grossPay: toMoney(row.gross_pay),
    deductions: toMoney(row.total_deductions),
    netPay: toMoney(row.net_pay),
    payableDays: toMoney(row.payable_days),
    workingDays: row.working_days,
    overtimeMinutes: row.overtime_minutes,
    status: row.status,
    lineItems: (row.lineItems || []).map((item) => ({
      name: item.name,
      type: item.item_type,
      amount: toMoney(item.amount)
    }))
  }));
}

module.exports = {
  PROCESSING_MAX_STEP,
  toMonthYear,
  monthBoundaries,
  ensurePayrollRun,
  generatePayroll,
  getPayrollSummary,
  getPayrollRegister,
  getPayrollRunStatus,
  advancePayrollStep,
  publishPayroll,
  getEmployeeSalary,
  getEmployeePayslips,
  getActiveComponents,
  getPayrollRules,
  upsertPayrollRules,
  getPayrollRuleMap
};
