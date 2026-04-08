const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/connection');

const Payslip = sequelize.define(
  'Payslip',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    payroll_run_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'payroll_runs',
        key: 'id'
      }
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'id'
      }
    },
    month_year: {
      type: DataTypes.STRING(7),
      allowNull: false
    },
    base_salary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    payable_days: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0
    },
    working_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    overtime_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    gross_pay: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    total_deductions: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    net_pay: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('generated', 'approved', 'paid'),
      allowNull: false,
      defaultValue: 'generated'
    },
    generated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: 'payslips',
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    indexes: [
      {
        unique: true,
        fields: ['employee_id', 'month_year']
      },
      {
        fields: ['payroll_run_id']
      }
    ]
  }
);

module.exports = Payslip;
