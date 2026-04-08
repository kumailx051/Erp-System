const SalaryComponent = require('../models/SalaryComponent');
const PayrollRule = require('../models/PayrollRule');
const {
  PROCESSING_MAX_STEP,
  generatePayroll,
  getPayrollSummary,
  getPayrollRegister,
  getPayrollRunStatus,
  advancePayrollStep,
  publishPayroll
} = require('../services/payrollService');

function parseMonthYear(req) {
  const now = new Date();
  const month = Number(req.query.month || req.params.month || now.getMonth() + 1);
  const year = Number(req.query.year || req.params.year || now.getFullYear());

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { error: 'month must be between 1 and 12' };
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: 'year must be between 2000 and 2100' };
  }

  return { month, year };
}

function isHrOrAdmin(user) {
  return user?.role === 'admin' || user?.role === 'hr';
}

exports.getPayrollSummary = async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'HR or admin access required' });
    }

    const parsed = parseMonthYear(req);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const data = await getPayrollSummary(parsed.year, parsed.month);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch payroll summary', error: error.message });
  }
};

exports.getPayrollRegister = async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'HR or admin access required' });
    }

    const parsed = parseMonthYear(req);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const rows = await getPayrollRegister(parsed.year, parsed.month, req.query.search, req.query.status);
    return res.status(200).json({
      success: true,
      data: {
        total: rows.length,
        rows
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch payroll register', error: error.message });
  }
};

exports.getPayrollProcessStatus = async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'HR or admin access required' });
    }

    const parsed = parseMonthYear(req);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const data = await getPayrollRunStatus(parsed.year, parsed.month, req.user?.sub || null);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch payroll process status', error: error.message });
  }
};

exports.advancePayrollProcess = async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'HR or admin access required' });
    }

    const parsed = parseMonthYear(req);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const data = await advancePayrollStep(parsed.year, parsed.month, req.user?.sub || null);
    return res.status(200).json({
      success: true,
      message: data.currentStep >= PROCESSING_MAX_STEP ? 'Payroll process reached final step' : 'Payroll process advanced',
      data
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to advance payroll process', error: error.message });
  }
};

exports.publishPayroll = async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'HR or admin access required' });
    }

    const parsed = parseMonthYear(req);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const data = await publishPayroll(parsed.year, parsed.month, req.user?.sub || null);
    return res.status(200).json({
      success: true,
      message: 'Payroll published successfully',
      data
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to publish payroll', error: error.message });
  }
};

exports.generatePayroll = async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'HR or admin access required' });
    }

    const parsed = parseMonthYear(req);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const data = await generatePayroll(parsed.year, parsed.month, req.user?.sub || null);
    return res.status(200).json({
      success: true,
      message: 'Payroll generated successfully',
      data: {
        payrollRunId: data.payrollRun.id,
        generatedCount: data.generated.length,
        generated: data.generated
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate payroll', error: error.message });
  }
};

exports.getSalaryComponents = async (req, res) => {
  try {
    const components = await SalaryComponent.findAll({
      where: isHrOrAdmin(req.user) ? undefined : { is_active: true },
      order: [['component_type', 'ASC'], ['name', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: components.map((component) => ({
        id: component.id,
        name: component.name,
        componentType: component.component_type,
        valueType: component.value_type,
        value: Number(component.value || 0),
        percentageOf: component.percentage_of,
        isTaxable: component.is_taxable,
        isActive: component.is_active
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch salary components', error: error.message });
  }
};

exports.createSalaryComponent = async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'HR or admin access required' });
    }

    const {
      name,
      componentType,
      valueType,
      value,
      percentageOf,
      isTaxable,
      isActive
    } = req.body;

    if (!name || !componentType) {
      return res.status(400).json({ success: false, message: 'name and componentType are required' });
    }

    const component = await SalaryComponent.create({
      name: String(name).trim(),
      component_type: componentType,
      value_type: valueType || 'fixed',
      value: Number(value || 0),
      percentage_of: percentageOf || 'base_salary',
      is_taxable: Boolean(isTaxable),
      is_active: isActive === undefined ? true : Boolean(isActive),
      created_by: req.user?.sub || null
    });

    return res.status(201).json({
      success: true,
      message: 'Salary component created',
      data: {
        id: component.id,
        name: component.name,
        componentType: component.component_type,
        valueType: component.value_type,
        value: Number(component.value || 0),
        percentageOf: component.percentage_of,
        isTaxable: component.is_taxable,
        isActive: component.is_active
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create salary component', error: error.message });
  }
};

exports.updateSalaryComponent = async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'HR or admin access required' });
    }

    const component = await SalaryComponent.findByPk(req.params.id);
    if (!component) {
      return res.status(404).json({ success: false, message: 'Salary component not found' });
    }

    const {
      name,
      componentType,
      valueType,
      value,
      percentageOf,
      isTaxable,
      isActive
    } = req.body;

    await component.update({
      name: name === undefined ? component.name : String(name).trim(),
      component_type: componentType || component.component_type,
      value_type: valueType || component.value_type,
      value: value === undefined ? component.value : Number(value),
      percentage_of: percentageOf || component.percentage_of,
      is_taxable: isTaxable === undefined ? component.is_taxable : Boolean(isTaxable),
      is_active: isActive === undefined ? component.is_active : Boolean(isActive)
    });

    return res.status(200).json({
      success: true,
      message: 'Salary component updated',
      data: {
        id: component.id,
        name: component.name,
        componentType: component.component_type,
        valueType: component.value_type,
        value: Number(component.value || 0),
        percentageOf: component.percentage_of,
        isTaxable: component.is_taxable,
        isActive: component.is_active
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update salary component', error: error.message });
  }
};

exports.deleteSalaryComponent = async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'HR or admin access required' });
    }

    const component = await SalaryComponent.findByPk(req.params.id);
    if (!component) {
      return res.status(404).json({ success: false, message: 'Salary component not found' });
    }

    await component.destroy();

    return res.status(200).json({
      success: true,
      message: 'Salary component deleted'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete salary component', error: error.message });
  }
};

exports.getPayrollRules = async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'HR or admin access required' });
    }

    const rules = await PayrollRule.findAll({ order: [['category', 'ASC'], ['label', 'ASC']] });

    if (rules.length === 0) {
      const seeded = await require('../services/payrollService').getPayrollRules();
      return res.status(200).json({ success: true, data: seeded });
    }

    return res.status(200).json({
      success: true,
      data: rules.map((rule) => ({
        id: rule.id,
        key: rule.rule_key,
        label: rule.label,
        category: rule.category,
        value: rule.value,
        description: rule.description,
        isActive: rule.is_active
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch payroll rules', error: error.message });
  }
};

exports.updatePayrollRules = async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'HR or admin access required' });
    }

    const rules = Array.isArray(req.body?.rules) ? req.body.rules : [];
    if (rules.length === 0) {
      return res.status(400).json({ success: false, message: 'rules array is required' });
    }

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

    return res.status(200).json({ success: true, message: 'Payroll rules saved', data: saved });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update payroll rules', error: error.message });
  }
};
