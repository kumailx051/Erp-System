const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/connection');

const ExitRequest = sequelize.define(
  'ExitRequest',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    exit_code: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'id'
      }
    },
    exit_type: {
      type: DataTypes.ENUM('resignation', 'termination'),
      allowNull: false,
      defaultValue: 'resignation'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    attachment_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    last_working_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'withdrawn'),
      allowNull: false,
      defaultValue: 'pending'
    },
    workflow_stage: {
      type: DataTypes.ENUM('resignations', 'approvals', 'clearance', 'f_and_f', 'exit_interviews', 'completed'),
      allowNull: false,
      defaultValue: 'resignations'
    },
    clearance_status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    fnf_status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    interview_status: {
      type: DataTypes.ENUM('pending', 'scheduled', 'done', 'waived'),
      allowNull: false,
      defaultValue: 'pending'
    },
    decision_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    hr_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewed_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: 'exit_requests',
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
);

module.exports = ExitRequest;
