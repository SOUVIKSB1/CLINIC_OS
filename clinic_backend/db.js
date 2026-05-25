const oracledb = require('oracledb');
require('dotenv').config();

let pool;

async function createPool() {
  try {
    await oracledb.createPool({
      user:           process.env.DB_USER,
      password:       process.env.DB_PASSWORD,
      connectString:  process.env.DB_CONNECT_STRING,
      walletLocation: process.env.WALLET_LOCATION ? require('path').resolve(process.env.WALLET_LOCATION) : undefined,
      walletPassword: process.env.DB_PASSWORD,
      poolMin:        2,
      poolMax:        10,
      poolIncrement:  1,
    });
    pool = oracledb.getPool();
    console.log('✅ Oracle Cloud connection pool created');
  } catch (err) {
    console.error('❌ Failed to create Oracle pool:', err.message);
    throw err;
  }
}

async function getConnection() {
  if (!pool) throw new Error('Database connection pool is not initialized');
  return pool.getConnection();
}

async function closePool() {
  if (pool) {
    await pool.close(0);
    pool = undefined;
  }
}

module.exports = { createPool, getConnection, closePool };
