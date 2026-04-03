const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/connection');

const LeaveType = sequelize.define(
  'LeaveType',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true
    },
    abbreviation: {
      type: DataTypes.STRING(12),
      allowNull: false
    },
    days_per_year: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    carry_forward: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    encashable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    applicable_to: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: 'All Employees'
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
    tableName: 'leave_types',
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
);

module.exports = LeaveType;
