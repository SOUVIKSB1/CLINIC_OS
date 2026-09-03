const bcrypt = require('bcrypt');
require('dotenv').config();
const { createPool, getConnection, closePool } = require('../db');

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@clinic.com').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const fullName = process.env.ADMIN_NAME?.trim() || 'Hospital Authority';

  if (!email || !password || password.length < 6)
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 6 characters) before running this command');

  await createPool();
  let conn;
  try {
    conn = await getConnection();
    const existing = await conn.execute(
      `SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    const passwordHash = await bcrypt.hash(password, 10);
    if (existing.rows.length > 0) {
      await conn.execute(
        `UPDATE users SET full_name = $1, password_hash = $2, role = 'ADMIN'
         WHERE user_id = $3`,
        [fullName, passwordHash, existing.rows[0].USER_ID]
      );
      console.log(`✅ Authority credentials updated for ${email}`);
    } else {
      await conn.execute(
        `INSERT INTO users (full_name, email, password_hash, role)
         VALUES ($1, $2, $3, 'ADMIN')`,
        [fullName, email, passwordHash]
      );
      console.log(`✅ Authority account created for ${email}`);
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
