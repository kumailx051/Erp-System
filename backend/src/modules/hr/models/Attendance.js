const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/connection');

const Attendance = sequelize.define(
  'Attendance',
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
      }
    },
    attendance_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('present', 'late', 'absent', 'half_day', 'on_leave'),
      allowNull: false
    },
    check_in_time: {
      type: DataTypes.TIME,
      allowNull: true
    },
    check_out_time: {
      type: DataTypes.TIME,
      allowNull: true
    },
    worked_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    overtime_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    marked_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
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
    tableName: 'attendance_records',
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    indexes: [
      {
        unique: true,
        fields: ['employee_id', 'attendance_date']
      },
      {
        fields: ['attendance_date']
      },
      {
        fields: ['status']
      }
    ]
  }
);

module.exports = Attendance;
