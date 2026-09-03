// routes/doctors.js
const express    = require('express');
const router     = express.Router();
const { getConnection } = require('../db');
const authenticate = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

// GET all doctors (with department name)
router.get('/', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT d.doctor_id, d.dept_id, d.first_name, d.last_name, d.specialization,
              d.email, d.phone, d.available_days, d.fees,
              dp.dept_name
       FROM doctors d
       JOIN departments dp ON d.dept_id = dp.dept_id
       ORDER BY d.last_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET doctors by department
router.get('/department/:dept_id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT doctor_id, first_name, last_name, specialization, available_days, fees
       FROM doctors WHERE dept_id = $1 ORDER BY last_name`,
      [Number(req.params.dept_id)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET single doctor
router.get('/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT d.*, dp.dept_name FROM doctors d
       JOIN departments dp ON d.dept_id = dp.dept_id
       WHERE d.doctor_id = $1`,
      [Number(req.params.id)]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Doctor not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// POST create doctor
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { first_name, last_name, specialization, dept_id, email, phone, available_days, fees } = req.body;
  if (!first_name?.trim() || !last_name?.trim() || !dept_id)
    return res.status(400).json({ error: 'first_name, last_name and dept_id are required' });
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO doctors (first_name, last_name, specialization, dept_id, email, phone, available_days, fees)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        first_name.trim(),
        last_name.trim(),
        specialization || null,
        Number(dept_id),
        email || null,
        phone || null,
        available_days || null,
        fees ? Number(fees) : 0
      ]
    );
    res.status(201).json({ message: 'Doctor created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// DELETE doctor
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `DELETE FROM doctors WHERE doctor_id = $1`,
      [Number(req.params.id)]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Doctor not found' });
    res.json({ message: 'Doctor deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// UPDATE doctor
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const {
    first_name,
    last_name,
    specialization,
    dept_id,
    email,
    phone,
    available_days,
    fees,
  } = req.body;

  let conn;

  try {
    conn = await getConnection();

    const result = await conn.execute(
      `UPDATE doctors
       SET first_name = $1,
           last_name = $2,
           specialization = $3,
           dept_id = $4,
           email = $5,
           phone = $6,
           available_days = $7,
           fees = $8
       WHERE doctor_id = $9`,
      [
        first_name ? first_name.trim() : null,
        last_name ? last_name.trim() : null,
        specialization || null,
        dept_id ? Number(dept_id) : null,
        email || null,
        phone || null,
        available_days || null,
        fees ? Number(fees) : 0,
        Number(req.params.id)
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json({
      success: true,
      message: 'Doctor updated successfully',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET doctor's own appointments (for logged-in doctor)
router.get('/me/appointments', authenticate, authorize('DOCTOR'), async (req, res) => {
  if (!req.user.doctorId) {
    return res.status(400).json({ error: 'Logged-in user is not associated with any doctor profile' });
  }
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT a.appt_id, a.patient_id, a.dept_id, a.appt_time, a.status, a.reason, a.notes,
              TO_CHAR(a.appt_date, 'YYYY-MM-DD') AS appt_date,
              CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
              p.gender, TO_CHAR(p.date_of_birth, 'YYYY-MM-DD') AS dob, p.phone
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       WHERE a.doctor_id = $1
       ORDER BY a.appt_date DESC, a.appt_time DESC`,
      [Number(req.user.doctorId)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET doctor's own patients (who have booked appointments with them)
router.get('/me/patients', authenticate, authorize('DOCTOR'), async (req, res) => {
  if (!req.user.doctorId) {
    return res.status(400).json({ error: 'Logged-in user is not associated with any doctor profile' });
  }
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT DISTINCT p.patient_id, p.first_name, p.last_name, p.email, p.phone, p.gender,
                       TO_CHAR(p.date_of_birth, 'YYYY-MM-DD') AS date_of_birth, p.blood_group
       FROM patients p
       JOIN appointments a ON p.patient_id = a.patient_id
       WHERE a.doctor_id = $1
       ORDER BY p.last_name, p.first_name`,
      [Number(req.user.doctorId)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET test reports shared with the logged-in doctor
router.get('/me/shared-reports', authenticate, authorize('DOCTOR'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT rs.share_id, rs.booking_id, TO_CHAR(rs.shared_at, 'YYYY-MM-DD') AS shared_at,
              pt.results, pt.notes AS test_notes, TO_CHAR(pt.booking_date, 'YYYY-MM-DD') AS booking_date,
              lt.test_name,
              CONCAT(p.first_name, ' ', p.last_name) AS patient_name
       FROM report_shares rs
       JOIN patient_tests pt ON rs.booking_id = pt.booking_id
       JOIN lab_tests lt ON pt.test_id = lt.test_id
       JOIN patients p ON rs.patient_id = p.patient_id
       WHERE LOWER(rs.recipient_email) = LOWER($1)
       ORDER BY rs.shared_at DESC`,
      [req.user.email]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
