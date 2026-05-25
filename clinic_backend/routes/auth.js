const express = require('express');
const bcrypt = require('bcrypt');
const oracledb = require('oracledb');
const { getConnection } = require('../db');
const authenticate = require('../middlewares/authMiddleware');
const { signToken } = require('../utils/jwt');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { first_name, last_name, date_of_birth, gender, email, phone, address, blood_group, password } = req.body;
  if (!first_name?.trim() || !last_name?.trim() || !date_of_birth || !gender || !email?.trim() || !phone?.trim() || !password)
    return res.status(400).json({ error: 'Name, date of birth, gender, email, phone and password are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must contain at least 6 characters' });

  let conn;
  try {
    conn = await getConnection();
    const patientResult = await conn.execute(
      `INSERT INTO patients (first_name, last_name, date_of_birth, gender, email, phone, address, blood_group)
       VALUES (:first_name, :last_name, TO_DATE(:date_of_birth,'YYYY-MM-DD'), :gender, :email, :phone, :address, :blood_group)
       RETURNING patient_id INTO :patient_id`,
      {
        first_name, last_name, date_of_birth, gender, email: email.trim().toLowerCase(), phone, address, blood_group,
        patient_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    const patientId = patientResult.outBinds.patient_id[0];
    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await conn.execute(
      `INSERT INTO users (full_name, email, password_hash, role, patient_id)
       VALUES (:full_name, :email, :password_hash, 'PATIENT', :patient_id)
       RETURNING user_id INTO :user_id`,
      {
        full_name: `${first_name.trim()} ${last_name.trim()}`,
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        patient_id: patientId,
        user_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );
    const user = { USER_ID: userResult.outBinds.user_id[0], ROLE: 'PATIENT', PATIENT_ID: patientId, FULL_NAME: `${first_name.trim()} ${last_name.trim()}`, EMAIL: email.trim().toLowerCase() };
    res.status(201).json({ message: 'Account created', token: signToken(user), user });
  } catch (err) {
    if (conn) await conn.rollback();
    if (err.errorNum === 1)
      return res.status(409).json({ error: 'An account with this email already exists' });
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT user_id, full_name, email, password_hash, role, patient_id
       FROM users WHERE LOWER(email) = LOWER(:email)`,
      [email.trim()],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.PASSWORD_HASH)))
      return res.status(401).json({ error: 'Incorrect email or password' });
    res.json({
      token: signToken(user),
      user: { USER_ID: user.USER_ID, FULL_NAME: user.FULL_NAME, EMAIL: user.EMAIL, ROLE: user.ROLE, PATIENT_ID: user.PATIENT_ID },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.get('/me', authenticate, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT u.user_id, u.full_name, u.email, u.role, u.patient_id,
              p.first_name, p.last_name, TO_CHAR(p.date_of_birth,'YYYY-MM-DD') AS date_of_birth,
              p.gender, p.phone, p.address, p.blood_group
       FROM users u LEFT JOIN patients p ON u.patient_id = p.patient_id
       WHERE u.user_id = :user_id`,
      [req.user.userId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
