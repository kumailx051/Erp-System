const bcrypt = require('bcrypt');
const { sequelize } = require('../../../core/database/connection');
const User = require('../models/User');

let temporaryPasswordColumnReady = false;

const departmentToRole = {
  'Human Resources': 'hr',
  Finance: 'finance',
  Sales: 'sales',
  Operations: 'operations',
  IT: 'it'
};

const roleToDepartment = {
  hr: 'Human Resources',
  finance: 'Finance',
  sales: 'Sales',
  operations: 'Operations',
  it: 'IT'
};

async function ensureTemporaryPasswordColumn() {
  if (temporaryPasswordColumnReady) {
    return;
  }

  await sequelize.query(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS temporary_password TEXT;'
  );
  temporaryPasswordColumnReady = true;
}

function toUserAccountView(user) {
  return {
    id: user.id,
    name: user.full_name,
    email: user.email,
    role: user.role,
    isActive: user.is_active,
    department: roleToDepartment[user.role] || user.role,
    temporaryPassword: user.temporary_password || null,
    createdAt: user.created_at
  };
}

async function listUsers(req, res) {
  try {
    await ensureTemporaryPasswordColumn();

    const users = await User.findAll({
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      accounts: users.map(toUserAccountView)
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch users',
      error: error.message
    });
  }
}

async function createUser(req, res) {
  try {
    await ensureTemporaryPasswordColumn();

    const { name, email, temporaryPassword, department } = req.body;

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const nextName = String(name || '').trim();
    const nextTempPassword = String(temporaryPassword || '').trim();
    const nextDepartment = String(department || '').trim();
    const nextRole = departmentToRole[nextDepartment];

    if (!nextName || !normalizedEmail || !nextTempPassword || !nextDepartment) {
      return res.status(400).json({
        message: 'Name, email, temporary password, and department are required'
      });
    }

    if (!nextRole) {
      return res.status(400).json({
        message: 'Invalid department selected'
      });
    }

    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists'
      });
    }

    const passwordHash = await bcrypt.hash(nextTempPassword, 10);

    const user = await User.create({
      full_name: nextName,
      email: normalizedEmail,
      password_hash: passwordHash,
      role: nextRole,
      is_active: true,
      temporary_password: nextTempPassword,
      created_at: new Date()
    });

    return res.status(201).json({
      message: 'User account created successfully',
      account: toUserAccountView(user)
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create user account',
      error: error.message
    });
  }
}

async function resetDatabase(req, res) {
  try {
    const confirmation = String(req.body?.confirmation || '').trim();
    if (confirmation !== 'RESET_DATABASE') {
      return res.status(400).json({
        message: 'Invalid confirmation token. Send confirmation as RESET_DATABASE.'
      });
    }

    // Get available tables from database dynamically
    const tablesResult = await sequelize.query(
      `SELECT tablename AS table_name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`,
      { raw: true, type: 'SELECT' }
    );
    const availableTables = tablesResult.map((row) => row.table_name || row.tablename);

    const requestedTables = Array.isArray(req.body?.tables)
      ? req.body.tables.map((table) => String(table || '').trim())
      : [];

    const invalidTables = requestedTables.filter((table) => !availableTables.includes(table));
    if (invalidTables.length > 0) {
      return res.status(400).json({
        message: 'One or more selected tables are invalid',
        invalidTables
      });
    }

    if (requestedTables.length === 0) {
      return res.status(400).json({
        message: 'Please select at least one table to reset'
      });
    }

    const uniqueTables = [...new Set(requestedTables)];
    const truncateSql = `TRUNCATE TABLE ${uniqueTables.join(', ')} RESTART IDENTITY CASCADE;`;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(truncateSql, { transaction });
    });

    if (uniqueTables.includes('users')) {
      temporaryPasswordColumnReady = false;
    }

    return res.status(200).json({
      message: `Selected tables reset successfully: ${uniqueTables.join(', ')}`,
      resetTables: uniqueTables
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to reset database',
      error: error.message
    });
  }
}

async function getDatabaseTables(req, res) {
  try {
    // Query PostgreSQL catalog to get all tables in the public schema
    const result = await sequelize.query(
      `SELECT tablename AS table_name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`,
      { raw: true, type: 'SELECT' }
    );

    const tables = result.map((row) => {
      const tableName = row.table_name || row.tablename;
      return {
        key: tableName,
        label: tableName
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      };
    });

    return res.status(200).json({
      success: true,
      tables
    });
  } catch (error) {
    console.error('Error fetching database tables:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch database tables',
      error: error.message
    });
  }
}

module.exports = {
  listUsers,
  createUser,
  resetDatabase,
  getDatabaseTables
};
