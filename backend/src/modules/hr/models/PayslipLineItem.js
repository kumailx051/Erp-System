const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/connection');

const PayslipLineItem = sequelize.define(
  'PayslipLineItem',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    payslip_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'payslips',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    item_type: {
      type: DataTypes.ENUM('earning', 'deduction'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    tableName: 'payslip_line_items',
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
);

module.exports = PayslipLineItem;
