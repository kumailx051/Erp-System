const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/connection');

const Designation = sequelize.define(
  'Designation',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'departments',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false
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
    tableName: 'designations',
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    indexes: [
      {
        unique: true,
        fields: ['department_id', 'title']
      }
    ]
  }
);

module.exports = Designation;
