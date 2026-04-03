const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/connection');

const CurrentOpening = sequelize.define(
  'CurrentOpening',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    role: {
      type: DataTypes.STRING(160),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    department: {
      type: DataTypes.STRING(120),
      allowNull: true  // Made optional since you're removing from form
    },
    location: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    role_type: {
      type: DataTypes.ENUM('Internship', 'Full-time Job', 'Part-time Job', 'Contract'),
      allowNull: false
    },
    salary_type: {
      type: DataTypes.ENUM('Paid', 'Unpaid'),
      allowNull: false
    },
    no_of_positions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    requirements: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    experience_required: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    skills: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    date_published: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isAfterNow(value) {
          if (value && new Date(value) <= new Date()) {
            throw new Error('Deadline must be a future date');
          }
        }
      }
    },
    status: {
      type: DataTypes.ENUM('Open', 'Interview', 'Closed'),
      allowNull: false,
      defaultValue: 'Open'
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
    tableName: 'current_openings',
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
);

module.exports = CurrentOpening;
