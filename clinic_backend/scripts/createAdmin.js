const bcrypt = require('bcrypt');
const oracledb = require('oracledb');
require('dotenv').config();
const { createPool, getConnection, closePool } = require('../db');

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME?.trim() || 'Hospital Authority';
  if (!email || !password || password.length < 6)
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 6 characters) in .env before running this command');

  await createPool();
  let conn;
  try {
    conn = await getConnection();
    const existing = await conn.execute(
      `SELECT user_id FROM users WHERE LOWER(email) = LOWER(:email)`,
      [email],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const passwordHash = await bcrypt.hash(password, 10);
    if (existing.rows.length) {
      await conn.execute(
        `UPDATE users SET full_name = :full_name, password_hash = :password_hash, role = 'ADMIN'
         WHERE user_id = :user_id`,
        { full_name: fullName, password_hash: passwordHash, user_id: existing.rows[0].USER_ID },
        { autoCommit: true }
      );
      console.log(`Authority credentials updated for ${email}`);
    } else {
      await conn.execute(
        `INSERT INTO users (full_name, email, password_hash, role)
         VALUES (:full_name, :email, :password_hash, 'ADMIN')`,
        { full_name: fullName, email, password_hash: passwordHash },
        { autoCommit: true }
      );
      console.log(`Authority account created for ${email}`);
    }
  } finally {
    if (conn) await conn.close();
    await closePool();
  }
}

main().catch((error) => {
  console.error(`Unable to create authority account: ${error.message}`);
  process.exitCode = 1;
});
