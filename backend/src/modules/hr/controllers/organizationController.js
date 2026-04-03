const { Op, fn, col, where } = require('sequelize');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const DepartmentHead = require('../models/DepartmentHead');
const { Employee } = require('../models/Employee');

exports.getOrganizationSummary = async (req, res) => {
  try {
    const departments = await Department.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']]
    });

    const designations = await Designation.findAll({
      where: { is_active: true },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name'],
          where: { is_active: true }
        }
      ],
      order: [['title', 'ASC']]
    });

    const employees = await Employee.findAll({
      where: { is_active: true },
      attributes: ['department', 'designation']
    });

    const departmentHeads = await DepartmentHead.findAll({
      where: { is_active: true },
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'department'],
          where: { is_active: true }
        }
      ]
    });

    const departmentCounts = new Map();
    const designationCounts = new Map();
    const departmentHeadMap = new Map();

    for (const head of departmentHeads) {
      if (!head.department_id || !head.employee) continue;
      departmentHeadMap.set(head.department_id, {
        id: head.employee.id,
        name: `${head.employee.first_name || ''} ${head.employee.last_name || ''}`.trim() || null
      });
    }

    for (const employee of employees) {
      const departmentName = String(employee.department || '').trim().toLowerCase();
      const designationName = String(employee.designation || '').trim().toLowerCase();

      if (departmentName) {
        departmentCounts.set(departmentName, (departmentCounts.get(departmentName) || 0) + 1);
      }

      if (departmentName && designationName) {
        const key = `${departmentName}::${designationName}`;
        designationCounts.set(key, (designationCounts.get(key) || 0) + 1);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        departments: departments.map((department) => {
          const key = String(department.name || '').trim().toLowerCase();
          const head = departmentHeadMap.get(department.id);
          return {
            id: department.id,
            name: department.name,
            description: department.description,
            parentDepartmentId: department.parent_department_id || null,
            headEmployeeId: head?.id || null,
            headName: head?.name || null,
            members: departmentCounts.get(key) || 0
          };
        }),
        designations: designations.map((designation) => {
          const departmentName = designation.department?.name || '';
          const key = `${String(departmentName).trim().toLowerCase()}::${String(designation.title || '').trim().toLowerCase()}`;
          return {
            id: designation.id,
            title: designation.title,
            departmentId: designation.department_id,
            departmentName,
            employees: designationCounts.get(key) || 0
          };
        })
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch organization summary',
      error: error.message
    });
  }
};

exports.assignDepartmentHead = async (req, res) => {
  try {
    const departmentId = Number(req.params?.id);
    const employeeId = Number(req.body?.employeeId);

    if (!departmentId || !Number.isInteger(departmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid department id is required'
      });
    }

    if (!employeeId || !Number.isInteger(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid employeeId is required'
      });
    }

    const department = await Department.findOne({
      where: { id: departmentId, is_active: true }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
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

    const employeeDepartment = String(employee.department || '').trim().toLowerCase();
    const targetDepartment = String(department.name || '').trim().toLowerCase();

    if (!employeeDepartment || employeeDepartment !== targetDepartment) {
      return res.status(400).json({
        success: false,
        message: 'Employee does not belong to this department'
      });
    }

    const existingMapping = await DepartmentHead.findOne({
      where: { department_id: departmentId }
    });

    if (existingMapping) {
      await existingMapping.update({
        employee_id: employeeId,
        is_active: true
      });
    } else {
      await DepartmentHead.create({
        department_id: departmentId,
        employee_id: employeeId,
        is_active: true
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Department head assigned successfully',
      data: {
        departmentId,
        headEmployeeId: employee.id,
        headName: `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to assign department head',
      error: error.message
    });
  }
};

exports.getOrganizationOptions = async (req, res) => {
  try {
    const departments = await Department.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']]
    });

    const designations = await Designation.findAll({
      where: { is_active: true },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name'],
          where: { is_active: true }
        }
      ],
      order: [['title', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        departments: departments.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          parentDepartmentId: d.parent_department_id || null
        })),
        designations: designations.map((d) => ({
          id: d.id,
          title: d.title,
          departmentId: d.department_id,
          departmentName: d.department?.name || ''
        }))
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch departments and designations',
      error: error.message
    });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const rawParentDepartmentId = req.body?.parentDepartmentId;
    const parentDepartmentId = rawParentDepartmentId === undefined || rawParentDepartmentId === null || rawParentDepartmentId === ''
      ? null
      : Number(rawParentDepartmentId);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required'
      });
    }

    if (parentDepartmentId !== null && !Number.isInteger(parentDepartmentId)) {
      return res.status(400).json({
        success: false,
        message: 'parentDepartmentId must be null or a valid integer'
      });
    }

    const existing = await Department.findOne({
      where: where(fn('LOWER', col('name')), name.toLowerCase())
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Department already exists'
      });
    }

    if (parentDepartmentId !== null) {
      const parentDepartment = await Department.findOne({
        where: { id: parentDepartmentId, is_active: true }
      });

      if (!parentDepartment) {
        return res.status(404).json({
          success: false,
          message: 'Parent department not found'
        });
      }
    }

    const department = await Department.create({
      name,
      description: description || null,
      parent_department_id: parentDepartmentId,
      is_active: true
    });

    return res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: {
        id: department.id,
        name: department.name,
        description: department.description,
        parentDepartmentId: department.parent_department_id || null
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create department',
      error: error.message
    });
  }
};

exports.createDesignation = async (req, res) => {
  try {
    const departmentId = Number(req.body?.departmentId);
    const title = String(req.body?.title || '').trim();

    if (!departmentId || !Number.isInteger(departmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid departmentId is required'
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Designation title is required'
      });
    }

    const department = await Department.findOne({
      where: {
        id: departmentId,
        is_active: true
      }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const existing = await Designation.findOne({
      where: {
        department_id: departmentId,
        [Op.and]: [where(fn('LOWER', col('title')), title.toLowerCase())]
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Designation already exists in this department'
      });
    }

    const designation = await Designation.create({
      department_id: departmentId,
      title,
      is_active: true
    });

    return res.status(201).json({
      success: true,
      message: 'Designation created successfully',
      data: {
        id: designation.id,
        title: designation.title,
        departmentId: designation.department_id,
        departmentName: department.name
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create designation',
      error: error.message
    });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const departmentId = Number(req.params?.id);
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();

    if (!departmentId || !Number.isInteger(departmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid department id is required'
      });
    }

    const department = await Department.findOne({
      where: { id: departmentId, is_active: true }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required'
      });
    }

    const existing = await Department.findOne({
      where: {
        id: { [Op.ne]: departmentId },
        is_active: true,
        [Op.and]: [where(fn('LOWER', col('name')), name.toLowerCase())]
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Department name already exists'
      });
    }

    await department.update({
      name,
      description: description || null
    });

    return res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: {
        id: department.id,
        name: department.name,
        description: department.description
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update department',
      error: error.message
    });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const departmentId = Number(req.params?.id);

    if (!departmentId || !Number.isInteger(departmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid department id is required'
      });
    }

    const department = await Department.findOne({
      where: { id: departmentId, is_active: true }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const activeDesignationCount = await Designation.count({
      where: {
        department_id: department.id,
        is_active: true
      }
    });

    if (activeDesignationCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete department with active designations. Remove or reassign designations first.'
      });
    }

    const employeeCount = await Employee.count({
      where: {
        is_active: true,
        [Op.and]: [where(fn('LOWER', col('department')), String(department.name).toLowerCase())]
      }
    });

    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete department with active employees assigned to it.'
      });
    }

    await department.update({ is_active: false });
    await DepartmentHead.update(
      { is_active: false },
      { where: { department_id: department.id } }
    );

    return res.status(200).json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete department',
      error: error.message
    });
  }
};

exports.updateDesignation = async (req, res) => {
  try {
    const designationId = Number(req.params?.id);
    const title = String(req.body?.title || '').trim();
    const incomingDepartmentId = Number(req.body?.departmentId);

    if (!designationId || !Number.isInteger(designationId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid designation id is required'
      });
    }

    const designation = await Designation.findOne({
      where: { id: designationId, is_active: true }
    });

    if (!designation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Designation title is required'
      });
    }

    const departmentId = incomingDepartmentId && Number.isInteger(incomingDepartmentId)
      ? incomingDepartmentId
      : designation.department_id;

    const department = await Department.findOne({
      where: { id: departmentId, is_active: true }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const existing = await Designation.findOne({
      where: {
        id: { [Op.ne]: designationId },
        department_id: departmentId,
        is_active: true,
        [Op.and]: [where(fn('LOWER', col('title')), title.toLowerCase())]
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Designation already exists in this department'
      });
    }

    await designation.update({
      department_id: departmentId,
      title
    });

    return res.status(200).json({
      success: true,
      message: 'Designation updated successfully',
      data: {
        id: designation.id,
        title: designation.title,
        departmentId: designation.department_id,
        departmentName: department.name
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update designation',
      error: error.message
    });
  }
};

exports.deleteDesignation = async (req, res) => {
  try {
    const designationId = Number(req.params?.id);

    if (!designationId || !Number.isInteger(designationId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid designation id is required'
      });
    }

    const designation = await Designation.findOne({
      where: { id: designationId, is_active: true },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['name']
        }
      ]
    });

    if (!designation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }

    const departmentName = String(designation.department?.name || '').toLowerCase();
    const designationName = String(designation.title || '').toLowerCase();

    const employeeCount = await Employee.count({
      where: {
        is_active: true,
        [Op.and]: [
          where(fn('LOWER', col('department')), departmentName),
          where(fn('LOWER', col('designation')), designationName)
        ]
      }
    });

    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete designation with active employees assigned to it.'
      });
    }

    await designation.update({ is_active: false });

    return res.status(200).json({
      success: true,
      message: 'Designation deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete designation',
      error: error.message
    });
  }
};
