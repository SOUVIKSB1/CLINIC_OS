const express = require('express');
const bcrypt = require('bcrypt');
const oracledb = require('oracledb');
const { getConnection } = require('../db');
const authenticate = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');
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

    let doctorId = null;
    if (user.ROLE === 'DOCTOR') {
      const docRes = await conn.execute(
        `SELECT doctor_id FROM doctors WHERE LOWER(email) = LOWER(:email)`,
        [user.EMAIL],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (docRes.rows.length > 0) {
        doctorId = docRes.rows[0].DOCTOR_ID;
      }
    }

    const tokenUser = {
      USER_ID: user.USER_ID,
      FULL_NAME: user.FULL_NAME,
      EMAIL: user.EMAIL,
      ROLE: user.ROLE,
      PATIENT_ID: user.PATIENT_ID,
      DOCTOR_ID: doctorId
    };

    res.json({
      token: signToken(tokenUser),
      user: tokenUser,
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
    
    const user = result.rows[0];
    let doctorId = null;
    if (user.ROLE === 'DOCTOR') {
      const docRes = await conn.execute(
        `SELECT doctor_id FROM doctors WHERE LOWER(email) = LOWER(:email)`,
        [user.EMAIL],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (docRes.rows.length > 0) {
        doctorId = docRes.rows[0].DOCTOR_ID;
      }
    }

    res.json({
      USER_ID: user.USER_ID,
      FULL_NAME: user.FULL_NAME,
      EMAIL: user.EMAIL,
      ROLE: user.ROLE,
      PATIENT_ID: user.PATIENT_ID,
      DOCTOR_ID: doctorId,
      FIRST_NAME: user.FIRST_NAME,
      LAST_NAME: user.LAST_NAME,
      DATE_OF_BIRTH: user.DATE_OF_BIRTH,
      GENDER: user.GENDER,
      PHONE: user.PHONE,
      ADDRESS: user.ADDRESS,
      BLOOD_GROUP: user.BLOOD_GROUP
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Admin-only route to create a new ADMIN or DOCTOR account
router.post('/create-staff', authenticate, authorize('ADMIN'), async (req, res) => {
  const { full_name, email, password, role, first_name, last_name, specialization, dept_id, phone, available_days, fees } = req.body;
  if (!full_name?.trim() || !email?.trim() || !password || !role) {
    return res.status(400).json({ error: 'Full name, email, password and role are required' });
  }
  if (!['ADMIN', 'DOCTOR'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be ADMIN or DOCTOR' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must contain at least 6 characters' });
  }

  let conn;
  try {
    conn = await getConnection();
    const passwordHash = await bcrypt.hash(password, 10);

    let doctorId = null;
    if (role === 'DOCTOR') {
      if (!dept_id) {
        return res.status(400).json({ error: 'Department is required for doctors' });
      }
      
      const docResult = await conn.execute(
        `INSERT INTO doctors (first_name, last_name, specialization, dept_id, email, phone, available_days, fees)
         VALUES (:first_name, :last_name, :specialization, :dept_id, :email, :phone, :available_days, :fees)
         RETURNING doctor_id INTO :doctor_id`,
        {
          first_name: first_name || full_name.split(' ')[0],
          last_name: last_name || full_name.split(' ').slice(1).join(' ') || 'Doctor',
          specialization: specialization || null,
          dept_id: Number(dept_id),
          email: email.trim().toLowerCase(),
          phone: phone || null,
          available_days: available_days || 'Mon-Fri',
          fees: fees ? Number(fees) : 0,
          doctor_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        }
      );
      doctorId = docResult.outBinds.doctor_id[0];
    }

    await conn.execute(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES (:full_name, :email, :password_hash, :role)`,
      {
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        role: role
      },
      { autoCommit: true }
    );

    res.status(201).json({ message: `${role} account created successfully` });
  } catch (err) {
    if (conn) await conn.rollback();
    if (err.errorNum === 1)
      return res.status(409).json({ error: 'An account or doctor with this email already exists' });
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Admin-only route to list all ADMIN and DOCTOR users
router.get('/staff', authenticate, authorize('ADMIN'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT user_id, full_name, email, role, TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at FROM users WHERE role IN ('ADMIN', 'DOCTOR') ORDER BY role, full_name`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Admin-only route to delete an ADMIN or DOCTOR user
router.delete('/staff/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    
    // First, find the user's email and role
    const userResult = await conn.execute(
      `SELECT email, role FROM users WHERE user_id = :id`,
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Delete from users table
    await conn.execute(
      `DELETE FROM users WHERE user_id = :id`,
      [req.params.id]
    );
    
    // If they were a doctor, delete from doctors table too
    if (user.ROLE === 'DOCTOR') {
      await conn.execute(
        `DELETE FROM doctors WHERE LOWER(email) = LOWER(:email)`,
        [user.EMAIL]
      );
    }
    
    await conn.commit();
    res.json({ message: 'Staff member account deleted successfully' });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
