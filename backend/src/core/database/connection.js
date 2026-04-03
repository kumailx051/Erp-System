const { Sequelize } = require('sequelize');
require('dotenv').config();

/**
 * PostgreSQL Database Connection using Sequelize ORM
 * 
 * Features:
 * - Auto table creation (like Firebase)
 * - Connection pooling for performance
 * - Error handling and logging
 * - Support for transactions
 */

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    
    // Connection Pool Configuration
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 5,
      min: parseInt(process.env.DB_POOL_MIN) || 0,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000
    },
    
    // SSL Configuration
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    
    // Logging Configuration (opt-in to avoid noisy startup logs)
    logging: process.env.DB_LOG_SQL === 'true' ? console.log : false,
    
    // Timezone
    timezone: '+00:00',
    
    // Define options for all models
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: false,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✓ PostgreSQL connection established successfully');
    console.log(`✓ Connected to database: ${process.env.DB_NAME}`);
    return true;
  } catch (error) {
    console.error('✗ Unable to connect to PostgreSQL database:', error.message);
    return false;
  }
}

/**
 * Sync database (creates tables automatically)
 * 
 * Options:
 * - alter: true  → Updates existing tables (safe, recommended for development)
 * - force: true  → Drops and recreates tables (WARNING: deletes all data!)
 * - sync: false  → No automatic sync (use migrations in production)
 */
async function syncDatabase(options = {}) {
  try {
    const shouldAlter = process.env.DB_SYNC_ALTER === 'true';
    const shouldForce = process.env.DB_SYNC_FORCE === 'true';

    const syncOptions = {
      // Keep sync safe by default. Enable alter/force explicitly via env vars.
      alter: shouldAlter,
      force: shouldForce,
      ...options
    };
    
    await sequelize.sync(syncOptions);
    console.log('✓ Database synchronized successfully');
    
    if (syncOptions.alter) {
      console.log('✓ Tables updated to match models (alter mode)');
    }
    if (syncOptions.force) {
      console.warn('⚠ Tables dropped and recreated (force mode)');
    }
    
    return true;
  } catch (error) {
    console.error('✗ Database sync failed:', error.message);
    return false;
  }
}

/**
 * Close database connection gracefully
 */
async function closeConnection() {
  try {
    await sequelize.close();
    console.log('✓ Database connection closed');
  } catch (error) {
    console.error('✗ Error closing database connection:', error.message);
  }
}

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  closeConnection
};
