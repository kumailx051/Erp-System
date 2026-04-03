/**
 * Database Synchronization Script
 * Syncs all Sequelize models with the database
 * Creates tables if they don't exist
 * Run: node scripts/sync-database.js
 */

require('dotenv').config();
const { sequelize } = require('../src/core/database/connection');
const { Employee, EmployeeDocument } = require('../src/modules/hr/models/Employee');
const Attendance = require('../src/modules/hr/models/Attendance');
const { Shift, ShiftAssignment } = require('../src/modules/hr/models/Shift');
const User = require('../src/modules/admin/models/User');

const syncDatabase = async () => {
  try {
    console.log('🔄 Syncing database models...\n');

    // Force sync - drops and recreates tables (comment out for production)
    // await sequelize.sync({ force: true });

    // Safe sync - creates tables if they don't exist
    await sequelize.sync({ alter: true }); // alter: true will modify columns as needed

    console.log('✅ Database synchronized successfully!\n');
    console.log('📊 Tables created:');
    console.log('   - users');
    console.log('   - employees');
    console.log('   - employee_documents');
    console.log('   - attendance_records\n');
    console.log('   - shifts');
    console.log('   - shift_assignments\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing database:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  syncDatabase();
}

module.exports = syncDatabase;
