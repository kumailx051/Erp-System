const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/connection');

const Candidate = sequelize.define(
  'Candidate',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    full_name: {
      type: DataTypes.STRING(160),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    current_opening_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'current_openings',
        key: 'id'
      }
    },
    experience_years: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: true
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    stage: {
      type: DataTypes.ENUM('Applied', 'Screening', 'Interview', 'Offer', 'Onboarding', 'Hired', 'Rejected'),
      allowNull: false,
      defaultValue: 'Applied'
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
    tableName: 'candidates',
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    indexes: [
      { fields: ['current_opening_id'] },
      { fields: ['stage'] },
      { fields: ['is_active'] },
      { unique: true, fields: ['email', 'current_opening_id'] }
    ]
  }
);

module.exports = Candidate;
