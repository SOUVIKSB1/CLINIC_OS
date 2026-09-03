// db.js — PostgreSQL Connection Pool & Compatibility Layer
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

let pool;

/**
 * Normalizes an object's keys to UPPERCASE (and keeps originals) for 100% compatibility
 * with frontend components expecting Oracle-style uppercase keys (e.g. PATIENT_ID, USER_ID).
 */
function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key] = value;
    normalized[key.toUpperCase()] = value;
  }
  return normalized;
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeRow);
}

/**
 * Converts named parameters (:name) or legacy queries to Postgres ($1, $2, ...)
 * Safely ignores Postgres type casts like $2::date or STRING_AGG.
 */
function convertOracleQueryToPostgres(sql, params) {
  let convertedSql = sql;
  let convertedParams = [];

  // If query already uses standard Postgres $1, $2...
  if (/\$[0-9]+/.test(sql)) {
    return {
      sql: convertedSql,
      params: Array.isArray(params) ? params : (params && typeof params === 'object' ? Object.values(params) : [])
    };
  }

  // Replace legacy Oracle-specific keywords/functions
  convertedSql = convertedSql
    .replace(/\bSYSDATE\b/gi, 'CURRENT_TIMESTAMP')
    .replace(/\bTRUNC\s*\(\s*CURRENT_TIMESTAMP\s*\)/gi, 'CURRENT_DATE')
    .replace(/\bTRUNC\s*\(\s*SYSDATE\s*\)/gi, 'CURRENT_DATE')
    .replace(/\bNVL\s*\(/gi, 'COALESCE(')
    .replace(/\bVARCHAR2\b/gi, 'VARCHAR')
    .replace(/\bNUMBER\b/gi, 'NUMERIC')
    .replace(/\bFROM\s+dual\b/gi, '');

  // Remove Oracle RETURNING ... INTO ... syntax in favor of Postgres RETURNING ...
  convertedSql = convertedSql.replace(/RETURNING\s+([a-zA-Z0-9_,\s]+)\s+INTO\s+:[a-zA-Z0-9_]+/gi, 'RETURNING $1');

  if (Array.isArray(params)) {
    // Positional parameters :1, :2 or ? or array
    let paramIndex = 1;
    // Replace colons only when not part of a postgres cast (e.g. not preceded or followed by colon)
    convertedSql = convertedSql.replace(/(?<!:):([a-zA-Z0-9_]+)(?!:)|\?/g, () => {
      return `$${paramIndex++}`;
    });
    convertedParams = [...params];
  } else if (params && typeof params === 'object') {
    // Named parameters like { first_name: 'John', email: 'a@b.com' }
    let paramIndex = 1;
    convertedSql = convertedSql.replace(/(?<!:):([a-zA-Z0-9_]+)(?!:)/g, (match, paramName) => {
      const lowerName = paramName.toLowerCase();
      const matchedKey = Object.keys(params).find(k => k.toLowerCase() === lowerName);
      if (matchedKey !== undefined) {
        const val = params[matchedKey];
        if (val && typeof val === 'object' && val.dir !== undefined) {
          return match;
        }
        convertedParams.push(val);
        return `$${paramIndex++}`;
      }
      return match;
    });
  }

  // Remove TO_DATE(:var, 'YYYY-MM-DD') wrappers in Postgres as Postgres casts strings to DATE automatically
  convertedSql = convertedSql.replace(/TO_DATE\(\s*(\$[0-9]+)\s*,\s*'[^']+'\s*\)/gi, '$1::date');

  return { sql: convertedSql, params: convertedParams };
}

async function createPool() {
  try {
    const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING;
    let poolConfig = {};

    if (connectionString) {
      poolConfig = {
        connectionString,
        ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
          ? false
          : { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
    } else {
      const isLocal = !process.env.DB_HOST || process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';
      poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || process.env.PGUSER || 'postgres',
        password: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'postgres',
        database: process.env.DB_NAME || process.env.DB_DATABASE || process.env.PGDATABASE || 'clinicos',
        ssl: isLocal ? false : { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
    }

    pool = new Pool(poolConfig);

    // Test connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection pool created successfully');
    client.release();

    // Auto-initialize schema and seed data
    await initDatabase();

    return pool;
  } catch (err) {
    console.error('❌ Failed to create PostgreSQL pool:', err.message);
    throw err;
  }
}

/**
 * Initializes database tables and seed data if not already present.
 */
async function initDatabase() {
  const client = await pool.connect();
  try {
    // Check if core tables exist
    const checkRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);

    if (checkRes.rows.length === 0) {
      console.log('🔄 Initializing PostgreSQL database tables...');
      const possibleSchemaPaths = [
        path.resolve(__dirname, './sql/schema_postgres.sql'),
        path.resolve(__dirname, '../sql/schema_postgres.sql'),
        path.resolve(__dirname, '../../sql/schema_postgres.sql'),
        path.resolve(process.cwd(), 'sql/schema_postgres.sql'),
        path.resolve(process.cwd(), 'clinic_backend/sql/schema_postgres.sql')
      ];
      const schemaPath = possibleSchemaPaths.find(p => fs.existsSync(p));
      if (schemaPath) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);
        console.log(`✅ Schema initialized successfully from ${path.basename(schemaPath)}`);
      }
    }

    // Run safe column upgrades on existing tables
    try {
      await client.query(`
        ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 7;
        ALTER TABLE doctors ADD COLUMN IF NOT EXISTS fees NUMERIC(10,2) DEFAULT 0;
        ALTER TABLE patient_tests ADD COLUMN IF NOT EXISTS results VARCHAR(2000);
        ALTER TABLE patient_tests ADD COLUMN IF NOT EXISTS notes VARCHAR(500);
        ALTER TABLE bills ADD COLUMN IF NOT EXISTS due_date DATE;
        ALTER TABLE bills ADD COLUMN IF NOT EXISTS booking_id INTEGER;
        ALTER TABLE bills ADD COLUMN IF NOT EXISTS appointment_id INTEGER;
      `);
    } catch (_) {}

    // Always ensure latest departments, doctors, and lab test catalog are seeded
    const possibleSeedPaths = [
      path.resolve(__dirname, './sql/seed_postgres.sql'),
      path.resolve(__dirname, '../sql/seed_postgres.sql'),
      path.resolve(__dirname, '../../sql/seed_postgres.sql'),
      path.resolve(process.cwd(), 'sql/seed_postgres.sql'),
      path.resolve(process.cwd(), 'clinic_backend/sql/seed_postgres.sql')
    ];
    const seedPath = possibleSeedPaths.find(p => fs.existsSync(p));
    if (seedPath) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await client.query(seedSql);
      console.log(`✅ Reference catalog synced (30 Doctors & Diagnostic Tests) from ${path.basename(seedPath)}`);
    }

    // Ensure initial administrator exists if configured
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@clinic.com').toLowerCase();
    const adminUserRes = await client.query('SELECT user_id FROM users WHERE LOWER(email) = $1', [adminEmail]);
    if (adminUserRes.rows.length === 0) {
      const adminName = process.env.ADMIN_NAME || 'Hospital Authority';
      const adminPass = process.env.ADMIN_PASSWORD || 'Admin@12345';
      const hash = await bcrypt.hash(adminPass, 10);
      await client.query(
        'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        [adminName, adminEmail, hash, 'ADMIN']
      );
      console.log(`✅ Default Administrator created: ${adminEmail}`);
    }
  } catch (err) {
    console.warn('⚠️ Database auto-initialization notice:', err.message);
  } finally {
    client.release();
  }
}

/**
 * Connection wrapper maintaining full backward-compatibility with previous Oracle client methods.
 */
async function getConnection() {
  if (!pool) throw new Error('Database connection pool is not initialized');
  const client = await pool.connect();

  return {
    async execute(sql, params = [], options = {}) {
      const { sql: convertedSql, params: convertedParams } = convertOracleQueryToPostgres(sql, params);
      const res = await client.query(convertedSql, convertedParams);
      
      const normalizedRows = normalizeRows(res.rows);
      return {
        rows: normalizedRows,
        rowCount: res.rowCount,
        rowsAffected: res.rowCount,
        outBinds: res.rows && res.rows[0] ? {
          patient_id: [res.rows[0].patient_id || res.rows[0].PATIENT_ID],
          user_id: [res.rows[0].user_id || res.rows[0].USER_ID],
          appt_id: [res.rows[0].appt_id || res.rows[0].APPT_ID],
          bill_id: [res.rows[0].bill_id || res.rows[0].BILL_ID],
          booking_id: [res.rows[0].booking_id || res.rows[0].BOOKING_ID],
          prescription_id: [res.rows[0].prescription_id || res.rows[0].PRESCRIPTION_ID],
          payment_id: [res.rows[0].payment_id || res.rows[0].PAYMENT_ID],
          vital_id: [res.rows[0].vital_id || res.rows[0].VITAL_ID]
        } : {}
      };
    },
    async commit() {
      try {
        await client.query('COMMIT');
      } catch (_) {}
    },
    async rollback() {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    },
    async close() {
      client.release();
    },
    release() {
      client.release();
    }
  };
}

/**
 * Direct query helper
 */
async function query(sql, params = []) {
  const conn = await getConnection();
  try {
    return await conn.execute(sql, params);
  } finally {
    await conn.close();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = { createPool, getConnection, query, closePool, normalizeRows, normalizeRow };
