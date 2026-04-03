const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/connection');

const DepartmentHead = sequelize.define(
  'DepartmentHead',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'departments',
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
    tableName: 'department_heads',
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
);

module.exports = DepartmentHead;
