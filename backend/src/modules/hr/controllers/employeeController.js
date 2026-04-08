const { Employee, EmployeeDocument } = require('../models/Employee');
const User = require('../../admin/models/User');
const { Shift } = require('../models/Shift');
const { sequelize } = require('../../../core/database/connection');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const DEFAULT_EMPLOYEE_TEMP_PASSWORD = '12345678';

async function getNextEmployeeCodeValue() {
  const rows = await Employee.findAll({
    attributes: ['employee_code'],
    raw: true
  });

  let maxSequence = 0;
  for (const row of rows) {
    const code = String(row.employee_code || '').trim();
    const match = code.match(/(\d+)$/);
    if (!match) {
      continue;
    }

    const numeric = Number(match[1]);
    if (Number.isInteger(numeric) && numeric > maxSequence) {
      maxSequence = numeric;
    }
  }

  const next = maxSequence + 1;
  return `Emp-${String(next).padStart(3, '0')}`;
}

exports.getNextEmployeeCode = async (req, res) => {
  try {
    const employeeCode = await getNextEmployeeCodeValue();

    return res.status(200).json({
      success: true,
      data: { employeeCode }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate employee code',
      error: error.message
    });
  }
};

/**
 * Check if an employee email already exists
 */
exports.checkEmployeeEmail = async (req, res) => {
  try {
    const { email, excludeId } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email query parameter is required'
      });
    }

    const existing = await Employee.findOne({ where: { email, is_active: true } });

    const exists = Boolean(existing && String(existing.id) !== String(excludeId || ''));

    return res.status(200).json({
      success: true,
      data: {
        exists
      }
    });
  } catch (error) {
    console.error('Error checking employee email:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking employee email',
      error: error.message
    });
  }
};

/**
 * Create a new employee
 */
exports.createEmployee = async (req, res) => {
  try {
    const {
      firstName, lastName, phone, dob, gender,
      address, city, state, zipCode,
      department, designation, managerId, joinDate,
      employmentType, baseSalary, shiftId
    } = req.body;
    let email = String(req.body?.email || '').trim().toLowerCase();

    if (req.user?.role === 'employee') {
      const authEmail = String(req.user?.email || '').trim().toLowerCase();
      if (!authEmail) {
        return res.status(400).json({
          success: false,
          message: 'Authenticated employee email is missing'
        });
      }

      email = authEmail;

      const existingSelfProfile = await Employee.findOne({
        where: { email: authEmail, is_active: true }
      });

      if (existingSelfProfile) {
        return res.status(409).json({
          success: false,
          message: 'Your employee profile already exists'
        });
      }
    }

    const normalizedShiftId = shiftId === undefined || shiftId === null || shiftId === ''
      ? null
      : Number(shiftId);

    const generatedEmployeeCode = await getNextEmployeeCodeValue();

    const fullName = `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim();

    // Validate required fields
    if (!firstName || !lastName || !email || !department || !designation || !joinDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName, email, department, designation, joinDate'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate phone format if provided
    if (phone) {
      const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone format'
        });
      }
    }

    // Check if employee code already exists
    const existingEmployee = await Employee.findOne({ where: { employee_code: generatedEmployeeCode, is_active: true } });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Could not allocate a unique employee code. Please retry.'
      });
    }

    // Check if email already exists in employee records
    const existingEmail = await Employee.findOne({ where: { email, is_active: true } });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    if (normalizedShiftId !== null) {
      if (!Number.isInteger(normalizedShiftId)) {
        return res.status(400).json({
          success: false,
          message: 'shiftId must be a valid integer'
        });
      }

      const shift = await Shift.findOne({ where: { id: normalizedShiftId, is_active: true } });
      if (!shift) {
        return res.status(400).json({
          success: false,
          message: 'Selected shift was not found'
        });
      }
    }

    const isEmployeeSelfCreate = req.user?.role === 'employee';
    const transaction = await sequelize.transaction();
    let employee;

    try {
      let linkedUserId = req.user?.sub;

      if (!isEmployeeSelfCreate) {
        const existingUser = await User.findOne({
          where: { email },
          transaction
        });

        if (existingUser && !existingUser.is_active) {
          throw new Error('A disabled user account exists for this email. Please contact admin.');
        }

        if (existingUser && existingUser.role !== 'employee') {
          throw new Error('This email is already used by another account type.');
        }

        if (existingUser) {
          linkedUserId = existingUser.id;
        } else {
          const passwordHash = await bcrypt.hash(DEFAULT_EMPLOYEE_TEMP_PASSWORD, 10);
          const createdUser = await User.create(
            {
              full_name: fullName,
              email,
              password_hash: passwordHash,
              temporary_password: DEFAULT_EMPLOYEE_TEMP_PASSWORD,
              role: 'employee',
              is_active: true
            },
            { transaction }
          );
          linkedUserId = createdUser.id;
        }
      }

      employee = await Employee.create(
        {
          user_id: linkedUserId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone: phone || null,
          date_of_birth: dob || null,
          gender: gender || null,
          address: address || null,
          city: city || null,
          state: state || null,
          zip_code: zipCode || null,
          department,
          designation,
          shift_id: normalizedShiftId,
          manager_id: managerId || null,
          join_date: joinDate,
          employment_type: employmentType || 'full_time',
          base_salary: baseSalary || null,
          employee_code: generatedEmployeeCode,
          is_active: true
        },
        { transaction }
      );

      // Handle document uploads if files are attached
      if (req.files && req.files.length > 0) {
        const documents = [];
        for (const file of req.files) {
          const doc = await EmployeeDocument.create(
            {
              employee_id: employee.id,
              document_type: req.body[`documentType_${file.fieldname}`] || 'other',
              document_name: file.originalname,
              file_path: `/uploads/${file.filename}`,
              file_size: file.size,
              mime_type: file.mimetype,
              uploaded_by: req.user.sub
            },
            { transaction }
          );
          documents.push(doc);
        }
        employee.documents = documents;
      }

      await transaction.commit();
    } catch (creationError) {
      await transaction.rollback();
      throw creationError;
    }

    res.status(201).json({
      success: true,
      message: isEmployeeSelfCreate
        ? 'Employee profile created successfully'
        : 'Employee created successfully. Account created with temporary password 12345678.',
      data: {
        id: employee.id,
        displaySequence: employee.id,
        fullName: `${employee.first_name} ${employee.last_name}`,
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
        shiftId: employee.shift_id,
        userId: employee.user_id,
        employeeCode: employee.employee_code,
        joinDate: employee.join_date,
        temporaryPassword: isEmployeeSelfCreate ? null : DEFAULT_EMPLOYEE_TEMP_PASSWORD,
        documents: employee.documents || []
      }
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating employee',
      error: error.message
    });
  }
};

exports.getMyEmployeeProfileStatus = async (req, res) => {
  try {
    const email = String(req.user?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Authenticated email not found'
      });
    }

    const employee = await Employee.findOne({
      where: {
        email,
        is_active: true
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        completed: Boolean(employee),
        employeeId: employee?.id || null
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to check employee profile status',
      error: error.message
    });
  }
};

/**
 * Get all employees
 */
exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      where: { is_active: true },
      order: [['created_at', 'DESC']]
    });
    const usersTotal = await User.count();

    const formattedEmployees = employees.map((emp, index) => ({
      id: emp.id,
      displaySequence: index + 1,
      fullName: `${emp.first_name} ${emp.last_name}`,
      firstName: emp.first_name,
      lastName: emp.last_name,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      designation: emp.designation,
      leaveBalances: emp.leave_balances || {},
      shiftId: emp.shift_id,
      employeeCode: emp.employee_code,
      profileImage: emp.profile_image,
      joinDate: emp.join_date,
      isActive: emp.is_active,
      baseSalary: emp.base_salary,
      createdAt: emp.created_at
    }));

    res.json({
      success: true,
      data: {
        total: formattedEmployees.length,
        employeeTotal: formattedEmployees.length,
        usersTotal,
        combinedTotal: formattedEmployees.length + usersTotal,
        employees: formattedEmployees
      }
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employees',
      error: error.message
    });
  }
};

/**
 * Get employee by ID
 */
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id);
    if (!employee || !employee.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get associated documents
    const documents = await EmployeeDocument.findAll({
      where: { employee_id: id }
    });

    res.json({
      success: true,
      data: {
        id: employee.id,
        displaySequence: employee.id,
        firstName: employee.first_name,
        lastName: employee.last_name,
        email: employee.email,
        phone: employee.phone,
        dob: employee.date_of_birth,
        gender: employee.gender,
        address: employee.address,
        city: employee.city,
        state: employee.state,
        zipCode: employee.zip_code,
        department: employee.department,
        designation: employee.designation,
        leaveBalances: employee.leave_balances || {},
        shiftId: employee.shift_id,
        managerId: employee.manager_id,
        joinDate: employee.join_date,
        employmentType: employee.employment_type,
        baseSalary: employee.base_salary,
        employeeCode: employee.employee_code,
        profileImage: employee.profile_image,
        isActive: employee.is_active,
        documents: documents.map(doc => ({
          id: doc.id,
          type: doc.document_type,
          name: doc.document_name,
          path: doc.file_path,
          size: doc.file_size,
          mimeType: doc.mime_type
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee',
      error: error.message
    });
  }
};

/**
 * Update employee
 */
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName, lastName, email, phone, dob, gender,
      address, city, state, zipCode,
      department, designation, managerId, joinDate,
      employmentType, baseSalary, employeeCode, shiftId
    } = req.body;

    const normalizedShiftId = shiftId === undefined || shiftId === null || shiftId === ''
      ? null
      : Number(shiftId);

    const pickValue = (incoming, currentValue) => {
      if (incoming === undefined || incoming === null || incoming === '') {
        return currentValue;
      }
      return incoming;
    };

    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const isEmployeeSelfUpdate = req.user?.role === 'employee';
    const normalizeComparable = (value) => {
      if (value === undefined || value === null || value === '') return null;
      return String(value).trim().toLowerCase();
    };

    if (isEmployeeSelfUpdate) {
      const protectedComparisons = [
        { key: 'department', incoming: department, current: employee.department },
        { key: 'designation', incoming: designation, current: employee.designation },
        { key: 'joinDate', incoming: joinDate, current: employee.join_date },
        { key: 'employmentType', incoming: employmentType, current: employee.employment_type },
        { key: 'baseSalary', incoming: baseSalary, current: employee.base_salary },
        { key: 'shiftId', incoming: shiftId, current: employee.shift_id },
        { key: 'managerId', incoming: managerId, current: employee.manager_id }
      ];

      const attemptedProtectedFieldEdit = protectedComparisons.some(({ incoming, current }) => {
        if (incoming === undefined) return false;
        return normalizeComparable(incoming) !== normalizeComparable(current);
      });

      if (attemptedProtectedFieldEdit) {
        return res.status(403).json({
          success: false,
          message: 'Department, designation, employment, joining and salary fields are managed by HR'
        });
      }
    }

    // Check if email is changed and if new email already exists
    if (email && email !== employee.email) {
      const existingEmail = await Employee.findOne({ where: { email, is_active: true } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    if (employeeCode && employeeCode !== employee.employee_code) {
      return res.status(400).json({
        success: false,
        message: 'Employee code cannot be updated'
      });
    }

    if (normalizedShiftId !== null) {
      if (!Number.isInteger(normalizedShiftId)) {
        return res.status(400).json({
          success: false,
          message: 'shiftId must be a valid integer'
        });
      }

      const shift = await Shift.findOne({ where: { id: normalizedShiftId, is_active: true } });
      if (!shift) {
        return res.status(400).json({
          success: false,
          message: 'Selected shift was not found'
        });
      }
    }

    const allowedEmploymentTypes = new Set(['full_time', 'part_time', 'contract', 'intern']);
    const nextEmploymentType = pickValue(employmentType, employee.employment_type);
    if (nextEmploymentType && !allowedEmploymentTypes.has(String(nextEmploymentType))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employment type'
      });
    }

    const nextBaseSalary = (baseSalary === undefined || baseSalary === null || baseSalary === '')
      ? employee.base_salary
      : Number(baseSalary);

    if (nextBaseSalary !== null && Number.isNaN(nextBaseSalary)) {
      return res.status(400).json({
        success: false,
        message: 'baseSalary must be a valid number'
      });
    }

    // Update employee
    await employee.update({
      first_name: pickValue(firstName, employee.first_name),
      last_name: pickValue(lastName, employee.last_name),
      email: pickValue(email, employee.email),
      phone: pickValue(phone, employee.phone),
      date_of_birth: pickValue(dob, employee.date_of_birth),
      gender: pickValue(gender, employee.gender),
      address: pickValue(address, employee.address),
      city: pickValue(city, employee.city),
      state: pickValue(state, employee.state),
      zip_code: pickValue(zipCode, employee.zip_code),
      department: isEmployeeSelfUpdate ? employee.department : pickValue(department, employee.department),
      designation: isEmployeeSelfUpdate ? employee.designation : pickValue(designation, employee.designation),
      shift_id: isEmployeeSelfUpdate ? employee.shift_id : normalizedShiftId,
      manager_id: isEmployeeSelfUpdate ? employee.manager_id : pickValue(managerId, employee.manager_id),
      join_date: isEmployeeSelfUpdate ? employee.join_date : pickValue(joinDate, employee.join_date),
      employment_type: isEmployeeSelfUpdate ? employee.employment_type : nextEmploymentType,
      base_salary: isEmployeeSelfUpdate ? employee.base_salary : nextBaseSalary,
      employee_code: employee.employee_code
    });

    // Handle new document uploads if files are attached
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await EmployeeDocument.create({
          employee_id: employee.id,
          document_type: req.body[`documentType_${file.fieldname}`] || 'other',
          document_name: file.originalname,
          file_path: `/uploads/${file.filename}`,
          file_size: file.size,
          mime_type: file.mimetype,
          uploaded_by: req.user.sub
        });
      }
    }

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: {
        id: employee.id,
        displaySequence: employee.id,
        fullName: `${employee.first_name} ${employee.last_name}`,
        email: employee.email
      }
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating employee',
      error: error.message
    });
  }
};

/**
 * Delete employee (soft delete - set is_active to false)
 */
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    await employee.update({ is_active: false });

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting employee',
      error: error.message
    });
  }
};

/**
 * Upload document for employee
 */
exports.uploadDocument = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { documentType } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const document = await EmployeeDocument.create({
      employee_id: employeeId,
      document_type: documentType || 'other',
      document_name: req.file.originalname,
      file_path: `/uploads/${req.file.filename}`,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      uploaded_by: req.user.sub
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        id: document.id,
        type: document.document_type,
        name: document.document_name,
        path: document.file_path,
        size: document.file_size
      }
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading document',
      error: error.message
    });
  }
};

/**
 * Delete document
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await EmployeeDocument.findByPk(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete file from uploads folder
    const filePath = document.file_path.startsWith('/') 
      ? path.join(__dirname, '../../..', document.file_path) 
      : path.join(__dirname, '../../..', 'uploads', path.basename(document.file_path));

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete document record
    await document.destroy();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting document',
      error: error.message
    });
  }
};

/**
 * Upload/replace employee profile avatar
 */
exports.uploadProfileImage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No avatar file uploaded'
      });
    }

    if (!String(req.file.mimetype || '').startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed for avatar'
      });
    }

    const employee = await Employee.findByPk(id);
    if (!employee || !employee.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Remove previous avatar file if exists.
    if (employee.profile_image) {
      const oldAvatarPath = employee.profile_image.startsWith('/')
        ? path.join(__dirname, '../../..', employee.profile_image)
        : path.join(__dirname, '../../..', 'uploads', path.basename(employee.profile_image));

      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    const avatarPath = `/uploads/${req.file.filename}`;
    await employee.update({ profile_image: avatarPath });

    return res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        employeeId: employee.id,
        profileImage: avatarPath
      }
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return res.status(500).json({
      success: false,
      message: 'Error uploading profile image',
      error: error.message
    });
  }
};
