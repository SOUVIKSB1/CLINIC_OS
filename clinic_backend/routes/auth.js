const express = require('express');
const bcrypt = require('bcrypt');
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
    await conn.execute('BEGIN');

    const patientResult = await conn.execute(
      `INSERT INTO patients (first_name, last_name, date_of_birth, gender, email, phone, address, blood_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING patient_id`,
      [first_name.trim(), last_name.trim(), date_of_birth, gender, email.trim().toLowerCase(), phone.trim(), address, blood_group]
    );
    const patientId = patientResult.rows[0].PATIENT_ID;

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await conn.execute(
      `INSERT INTO users (full_name, email, password_hash, role, patient_id)
       VALUES ($1, $2, $3, 'PATIENT', $4)
       RETURNING user_id`,
      [`${first_name.trim()} ${last_name.trim()}`, email.trim().toLowerCase(), passwordHash, patientId]
    );
    const userId = userResult.rows[0].USER_ID;

    await conn.execute('COMMIT');

    const user = {
      USER_ID: userId,
      ROLE: 'PATIENT',
      PATIENT_ID: patientId,
      FULL_NAME: `${first_name.trim()} ${last_name.trim()}`,
      EMAIL: email.trim().toLowerCase()
    };
    res.status(201).json({ message: 'Account created', token: signToken(user), user });
  } catch (err) {
    if (conn) await conn.rollback();
    if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('unique constraint'))
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
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.PASSWORD_HASH)))
      return res.status(401).json({ error: 'Incorrect email or password' });

    let doctorId = null;
    if (user.ROLE === 'DOCTOR') {
      const docRes = await conn.execute(
        `SELECT doctor_id FROM doctors WHERE LOWER(email) = LOWER($1)`,
        [user.EMAIL]
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
              p.first_name, p.last_name, TO_CHAR(p.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
              p.gender, p.phone, p.address, p.blood_group
       FROM users u LEFT JOIN patients p ON u.patient_id = p.patient_id
       WHERE u.user_id = $1`,
      [req.user.userId]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'User not found' });
    
    const user = result.rows[0];
    let doctorId = null;
    if (user.ROLE === 'DOCTOR') {
      const docRes = await conn.execute(
        `SELECT doctor_id FROM doctors WHERE LOWER(email) = LOWER($1)`,
        [user.EMAIL]
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
  const { role, password, doctor_id, full_name, email } = req.body;
  
  if (!role || !password) {
    return res.status(400).json({ error: 'Role and password are required' });
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

    let userFullName = "";
    let userEmail = "";

    if (role === 'DOCTOR') {
      if (!doctor_id) {
        return res.status(400).json({ error: 'Doctor selection is required' });
      }
      
      const docResult = await conn.execute(
        `SELECT first_name, last_name, email FROM doctors WHERE doctor_id = $1`,
        [Number(doctor_id)]
      );
      
      if (docResult.rows.length === 0) {
        return res.status(404).json({ error: 'Selected doctor not found' });
      }
      
      const doc = docResult.rows[0];
      
      let finalEmail = email ? email.trim().toLowerCase() : (doc.EMAIL ? doc.EMAIL.trim().toLowerCase() : "");
      if (!finalEmail) {
        return res.status(400).json({ error: 'Selected doctor does not have an email configured and no email was provided' });
      }

      // Check if new email is already used by another doctor
      const checkDocEmail = await conn.execute(
        `SELECT COUNT(*) AS total FROM doctors WHERE LOWER(email) = LOWER($1) AND doctor_id != $2`,
        [finalEmail, Number(doctor_id)]
      );
      if (parseInt(checkDocEmail.rows[0].TOTAL, 10) > 0) {
        return res.status(409).json({ error: 'This email is already registered to another doctor' });
      }

      // Update doctor email if changed
      if (!doc.EMAIL || doc.EMAIL.trim().toLowerCase() !== finalEmail) {
        await conn.execute(
          `UPDATE doctors SET email = $1 WHERE doctor_id = $2`,
          [finalEmail, Number(doctor_id)]
        );
      }

      userFullName = `Dr. ${doc.FIRST_NAME} ${doc.LAST_NAME}`;
      userEmail = finalEmail;
    } else {
      if (!full_name?.trim() || !email?.trim()) {
        return res.status(400).json({ error: 'Full name and email are required for ADMIN' });
      }
      userFullName = full_name.trim();
      userEmail = email.trim().toLowerCase();
    }

    // Check if email already exists in users
    const checkUser = await conn.execute(
      `SELECT COUNT(*) AS total FROM users WHERE LOWER(email) = LOWER($1)`,
      [userEmail]
    );

    if (parseInt(checkUser.rows[0].TOTAL, 10) > 0) {
      return res.status(409).json({ error: 'A login account with this email already exists' });
    }

    await conn.execute(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      [userFullName, userEmail, passwordHash, role]
    );

    res.status(201).json({ message: `${role} account created successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Admin-only route to list registered doctors without a login account
router.get('/unregistered-doctors', authenticate, authorize('ADMIN'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT doctor_id, first_name, last_name, email
       FROM doctors
       WHERE email IS NOT NULL
         AND LOWER(email) NOT IN (SELECT LOWER(email) FROM users WHERE email IS NOT NULL)
       ORDER BY last_name, first_name`
    );
    res.json(result.rows);
  } catch (err) {
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
      `SELECT user_id, full_name, email, role, TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at FROM users WHERE role IN ('ADMIN', 'DOCTOR') ORDER BY role, full_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Admin-only route to delete an ADMIN or DOCTOR user (removes login access only)
router.delete('/staff/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    
    const userResult = await conn.execute(
      `SELECT email, role FROM users WHERE user_id = $1`,
      [req.params.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await conn.execute(
      `DELETE FROM users WHERE user_id = $1`,
      [req.params.id]
    );
    
    res.json({ message: 'Staff member account deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
