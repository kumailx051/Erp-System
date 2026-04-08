const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/connection');

const PayrollRule = sequelize.define(
  'PayrollRule',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    rule_key: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true
    },
    label: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM('salary', 'leave', 'overtime', 'cycle'),
      allowNull: false,
      defaultValue: 'salary'
    },
    value: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: 'payroll_rules',
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
);

module.exports = PayrollRule;
