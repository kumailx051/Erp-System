const { sequelize, testConnection, syncDatabase, closeConnection } = require('./connection');

/**
 * Database Module Entry Point
 * 
 * This file will:
 * 1. Initialize database connection
 * 2. Register all models from modules
 * 3. Set up model associations
 * 4. Sync database (auto-create tables)
 */

// Import models from modules
const { Employee, EmployeeDocument } = require('../../modules/hr/models/Employee');
const Department = require('../../modules/hr/models/Department');
const Designation = require('../../modules/hr/models/Designation');
const DepartmentHead = require('../../modules/hr/models/DepartmentHead');
const Attendance = require('../../modules/hr/models/Attendance');
const { Shift } = require('../../modules/hr/models/Shift');
const LeaveType = require('../../modules/hr/models/LeaveType');
const Leave = require('../../modules/hr/models/Leave');
const ExitRequest = require('../../modules/hr/models/ExitRequest');
const CurrentOpening = require('../../modules/hr/models/CurrentOpening');
const Candidate = require('../../modules/hr/models/Candidate');
const JobApplication = require('../../modules/hr/models/JobApplication');
const RecruitmentWorkflow = require('../../modules/hr/models/RecruitmentWorkflow');
const User = require('../../modules/admin/models/User');

/**
 * Initialize Database
 * - Test connection
 * - Sync models (create/update tables)
 */
async function initializeDatabase() {
  try {
    console.log('\n🔄 Initializing database...');
    
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }
    
    // Register all models and associations
    registerModels();
    
    const shouldAlter = process.env.DB_SYNC_ALTER === 'true';
    const shouldForce = process.env.DB_SYNC_FORCE === 'true';

    // Sync database (create/update tables)
    const synced = await syncDatabase({
      alter: shouldAlter,
      force: shouldForce // Set true only if you want to reset database (CAUTION!)
    });
    
    if (!synced) {
      throw new Error('Failed to sync database');
    }
    
    console.log('✅ Database initialization complete\n');
    return true;
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

/**
 * Register all models and their associations
 * This function is called before syncing database
 */
function registerModels() {
  // Models are registered by importing them above
  // Set up associations between models
  setupAssociations();
  
  console.log('✓ Models registered (User, Employee, EmployeeDocument, Department, Designation, DepartmentHead, Attendance, Shift, LeaveType, Leave, ExitRequest, CurrentOpening, Candidate, JobApplication, RecruitmentWorkflow)');
}

/**
 * Set up associations between models
 */
function setupAssociations() {
  // Employee has many documents
  Employee.hasMany(EmployeeDocument, { foreignKey: 'employee_id', as: 'documents' });
  EmployeeDocument.belongsTo(Employee, { foreignKey: 'employee_id' });

  // Employee self-reference for manager
  Employee.belongsTo(Employee, { as: 'Manager', foreignKey: 'manager_id' });
  Employee.hasMany(Employee, { as: 'DirectReports', foreignKey: 'manager_id' });

  // Department and designation associations
  Department.hasMany(Designation, { foreignKey: 'department_id', as: 'designations' });
  Designation.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

  // Department head mapping associations
  Department.hasOne(DepartmentHead, { foreignKey: 'department_id', as: 'headMapping' });
  DepartmentHead.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
  Employee.hasMany(DepartmentHead, { foreignKey: 'employee_id', as: 'headedDepartments' });
  DepartmentHead.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

  // Attendance associations
  Employee.hasMany(Attendance, { foreignKey: 'employee_id', as: 'attendanceRecords' });
  Attendance.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
  User.hasMany(Attendance, { foreignKey: 'marked_by', as: 'markedAttendances' });
  Attendance.belongsTo(User, { foreignKey: 'marked_by', as: 'markedByUser' });

  // Shift association for direct employee assignment
  Shift.hasMany(Employee, { foreignKey: 'shift_id', as: 'employees' });
  Employee.belongsTo(Shift, { foreignKey: 'shift_id', as: 'shift' });

  // Leave associations
  Employee.hasMany(Leave, { foreignKey: 'employee_id', as: 'leaves' });
  Leave.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
  LeaveType.hasMany(Leave, { foreignKey: 'leave_type_id', as: 'leaves' });
  Leave.belongsTo(LeaveType, { foreignKey: 'leave_type_id', as: 'leaveType' });

  // Exit management associations
  Employee.hasMany(ExitRequest, { foreignKey: 'employee_id', as: 'exitRequests' });
  ExitRequest.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

  // Recruitment associations
  CurrentOpening.hasMany(Candidate, { foreignKey: 'current_opening_id', as: 'candidates' });
  Candidate.belongsTo(CurrentOpening, { foreignKey: 'current_opening_id', as: 'opening' });
  CurrentOpening.hasMany(JobApplication, { foreignKey: 'current_opening_id', as: 'applications' });
  JobApplication.belongsTo(CurrentOpening, { foreignKey: 'current_opening_id', as: 'opening' });
  Candidate.hasOne(RecruitmentWorkflow, { foreignKey: 'candidate_id', as: 'workflow' });
  RecruitmentWorkflow.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });
  JobApplication.hasOne(RecruitmentWorkflow, { foreignKey: 'job_application_id', as: 'workflow' });
  RecruitmentWorkflow.belongsTo(JobApplication, { foreignKey: 'job_application_id', as: 'application' });
  CurrentOpening.hasMany(RecruitmentWorkflow, { foreignKey: 'current_opening_id', as: 'workflowEntries' });
  RecruitmentWorkflow.belongsTo(CurrentOpening, { foreignKey: 'current_opening_id', as: 'opening' });
  
  console.log('✓ Model associations set up');
}

/**
 * Health check for database connection
 */
async function healthCheck() {
  try {
    await sequelize.authenticate();
    return { status: 'healthy', database: 'connected' };
  } catch (error) {
    return { status: 'unhealthy', database: 'disconnected', error: error.message };
  }
}

module.exports = {
  sequelize,
  initializeDatabase,
  registerModels,
  setupAssociations,
  healthCheck,
  closeConnection
};
