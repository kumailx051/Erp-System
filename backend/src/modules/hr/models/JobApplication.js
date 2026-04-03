const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/connection');

const JobApplication = sequelize.define(
  'JobApplication',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    current_opening_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'current_openings',
        key: 'id'
      }
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
    cv_file_url: {
      type: DataTypes.STRING(300),
      allowNull: false
    },
    cover_letter: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    experience_years: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: true
    },
    education_entries: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    experience_entries: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('Submitted', 'Reviewed', 'Shortlisted', 'Rejected', 'Hired'),
      allowNull: false,
      defaultValue: 'Submitted'
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
    tableName: 'job_applications',
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    indexes: [
      { fields: ['current_opening_id'] },
      { fields: ['email'] },
      { fields: ['status'] },
      { fields: ['is_active'] },
      { unique: true, fields: ['email', 'current_opening_id'] }
    ]
  }
);

module.exports = JobApplication;
