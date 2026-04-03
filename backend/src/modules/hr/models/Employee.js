const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/connection');

/**
 * Employee Model
 * Stores all employee information
 */
const Employee = sequelize.define(
  'Employee',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Reference to Users table for authentication'
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/gm
      }
    },
    date_of_birth: {
      type: DataTypes.DATE,
      allowNull: true
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    zip_code: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    designation: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    leave_balances: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    shift_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'shifts',
        key: 'id'
      }
    },
    manager_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Employee ID of direct manager'
    },
    join_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    employment_type: {
      type: DataTypes.ENUM('full_time', 'part_time', 'contract', 'intern'),
      allowNull: false,
      defaultValue: 'full_time'
    },
    base_salary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    employee_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    profile_image: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Avatar image path for employee profile picture'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      onUpdate: DataTypes.NOW
    }
  },
  {
    tableName: 'employees',
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
);

/**
 * EmployeeDocument Model
 * Stores document/file references for employees
 */
const EmployeeDocument = sequelize.define(
  'EmployeeDocument',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'id'
      },
      comment: 'Reference to Employee table'
    },
    document_type: {
      type: DataTypes.ENUM('resume', 'id_proof', 'address_proof', 'educational_certificate', 'other'),
      allowNull: false
    },
    document_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Original file name as uploaded'
    },
    file_path: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Path where file is stored in /uploads folder'
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'File size in bytes'
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'MIME type (e.g., application/pdf, image/jpeg)'
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Reference to User who uploaded the document'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      onUpdate: DataTypes.NOW
    }
  },
  {
    tableName: 'employee_documents',
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
);

module.exports = { Employee, EmployeeDocument };
