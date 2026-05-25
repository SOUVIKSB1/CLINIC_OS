// routes/doctors.js
const express    = require('express');
const router     = express.Router();
const oracledb   = require('oracledb');
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
       ORDER BY d.last_name`,
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

// GET doctors by department
router.get('/department/:dept_id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT doctor_id, first_name, last_name, specialization, available_days, fees
       FROM doctors WHERE dept_id = :dept_id ORDER BY last_name`,
      [req.params.dept_id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
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
       WHERE d.doctor_id = :id`,
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
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
       VALUES (:first_name, :last_name, :specialization, :dept_id, :email, :phone, :available_days, :fees)`,
      {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        specialization: specialization || null,
        dept_id: Number(dept_id),
        email: email || null,
        phone: phone || null,
        available_days: available_days || null,
        fees: fees ? Number(fees) : 0
      },
      { autoCommit: true }
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
      `DELETE FROM doctors WHERE doctor_id = :id`,
      [req.params.id],
      { autoCommit: true }
    );
    if (result.rowsAffected === 0)
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
       SET first_name = :first_name,
           last_name = :last_name,
           specialization = :specialization,
           dept_id = :dept_id,
           email = :email,
           phone = :phone,
           available_days = :available_days,
           fees = :fees
       WHERE doctor_id = :id`,
      {
        first_name: first_name ? first_name.trim() : null,
        last_name: last_name ? last_name.trim() : null,
        specialization: specialization || null,
        dept_id: dept_id ? Number(dept_id) : null,
        email: email || null,
        phone: phone || null,
        available_days: available_days || null,
        fees: fees ? Number(fees) : 0,
        id: Number(req.params.id),
      },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
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

module.exports = router;
