const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/connection');

const SalaryComponent = sequelize.define(
  'SalaryComponent',
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
    component_type: {
      type: DataTypes.ENUM('earning', 'deduction'),
      allowNull: false
    },
    value_type: {
      type: DataTypes.ENUM('fixed', 'percentage'),
      allowNull: false,
      defaultValue: 'fixed'
    },
    value: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    percentage_of: {
      type: DataTypes.ENUM('base_salary', 'gross_pay'),
      allowNull: false,
      defaultValue: 'base_salary'
    },
    is_taxable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  },
  {
    tableName: 'salary_components',
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
);

module.exports = SalaryComponent;
