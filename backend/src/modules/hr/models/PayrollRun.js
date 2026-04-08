const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/connection');

const PayrollRun = sequelize.define(
  'PayrollRun',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('draft', 'processing', 'approved', 'published'),
      allowNull: false,
      defaultValue: 'draft'
    },
    current_step: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    initiated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  },
  {
    tableName: 'payroll_runs',
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    indexes: [
      {
        unique: true,
        fields: ['month', 'year']
      }
    ]
  }
);

module.exports = PayrollRun;
