const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/connection');

const RecruitmentWorkflow = sequelize.define(
  'RecruitmentWorkflow',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    candidate_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'candidates',
        key: 'id'
      }
    },
    job_application_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'job_applications',
        key: 'id'
      }
    },
    current_opening_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'current_openings',
        key: 'id'
      }
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: false
    },
    interview_slots: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    selected_slot_index: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    selected_interview_slot: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    offer_letter_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    onboarding_package_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    onboarding_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    hr_rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    candidate_rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    offer_decision: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    onboarding_decision: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    ats_breakdown: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
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
    tableName: 'recruitment_workflows',
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    indexes: [
      { fields: ['candidate_id'] },
      { fields: ['job_application_id'] },
      { fields: ['current_opening_id'] },
      { fields: ['email'] }
    ]
  }
);

module.exports = RecruitmentWorkflow;
