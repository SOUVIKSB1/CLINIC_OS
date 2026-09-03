// routes/patients.js
const express    = require('express');
const router     = express.Router();
const { getConnection } = require('../db');
const authenticate = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

// GET all patients
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT patient_id, first_name, last_name,
              TO_CHAR(date_of_birth,'YYYY-MM-DD') AS date_of_birth,
              gender, email, phone, address, blood_group
       FROM patients ORDER BY last_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET own patient profile
router.get('/me', authenticate, authorize('PATIENT'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT patient_id, first_name, last_name,
              TO_CHAR(date_of_birth,'YYYY-MM-DD') AS date_of_birth,
              gender, email, phone, address, blood_group
       FROM patients WHERE patient_id = $1`,
      [req.user.patientId]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'Patient profile not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET own vitals history
router.get('/me/vitals', authenticate, authorize('PATIENT'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT vital_id, TO_CHAR(check_date, 'YYYY-MM-DD') AS check_date, blood_pressure, blood_sugar, weight, heart_rate
       FROM patient_vitals
       WHERE patient_id = $1
       ORDER BY check_date ASC`,
      [req.user.patientId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// POST log own vitals
router.post('/me/vitals', authenticate, authorize('PATIENT'), async (req, res) => {
  const { blood_pressure, blood_sugar, weight, heart_rate, check_date } = req.body;
  if (!blood_sugar || !weight || !heart_rate) {
    return res.status(400).json({ error: 'blood_sugar, weight, and heart_rate are required' });
  }
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO patient_vitals (patient_id, check_date, blood_pressure, blood_sugar, weight, heart_rate)
       VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5, $6)`,
      [
        req.user.patientId,
        check_date || null,
        blood_pressure || null,
        Number(blood_sugar),
        Number(weight),
        Number(heart_rate)
      ]
    );
    res.status(201).json({ message: 'Vitals logged successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// DELETE own vitals entry
router.delete('/me/vitals/:vitalId', authenticate, authorize('PATIENT'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `DELETE FROM patient_vitals WHERE vital_id = $1 AND patient_id = $2`,
      [req.params.vitalId, req.user.patientId]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Vitals entry not found' });
    res.json({ message: 'Vitals entry deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET single patient
router.get('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT patient_id, first_name, last_name,
              TO_CHAR(date_of_birth,'YYYY-MM-DD') AS date_of_birth,
              gender, email, phone, address, blood_group
       FROM patients WHERE patient_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// POST register new patient
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { first_name, last_name, date_of_birth, gender, email, phone, address, blood_group } = req.body;
  if (!first_name?.trim() || !last_name?.trim() || !date_of_birth || !gender || !phone?.trim())
    return res.status(400).json({ error: 'first_name, last_name, date_of_birth, gender and phone are required' });
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO patients (first_name, last_name, date_of_birth, gender, email, phone, address, blood_group)
       VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8)`,
      [first_name.trim(), last_name.trim(), date_of_birth, gender, email || null, phone.trim(), address || null, blood_group || null]
    );
    res.status(201).json({ message: 'Patient registered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

async function updatePatient(req, res, patientId) {
  const { first_name, last_name, date_of_birth, gender, email, phone, address, blood_group } = req.body;
  if (!first_name?.trim() || !last_name?.trim() || !date_of_birth || !gender || !phone?.trim())
    return res.status(400).json({ error: 'first_name, last_name, date_of_birth, gender and phone are required' });
  let conn;
  try {
    conn = await getConnection();
    await conn.execute('BEGIN');

    const result = await conn.execute(
      `UPDATE patients
       SET first_name = $1, last_name = $2,
           date_of_birth = $3::date, gender = $4,
           phone = $5, address = $6, email = $7, blood_group = $8
       WHERE patient_id = $9`,
      [first_name.trim(), last_name.trim(), date_of_birth, gender, phone.trim(), address, email, blood_group, patientId]
    );
    if (result.rowCount === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Patient not found' });
    }

    await conn.execute(
      `UPDATE users SET full_name = $1, email = $2 WHERE patient_id = $3`,
      [`${first_name.trim()} ${last_name.trim()}`, email, patientId]
    );

    await conn.execute('COMMIT');
    res.json({ message: 'Patient updated' });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
}

// Patients can update their own profile; authority can maintain any profile.
router.put('/me', authenticate, authorize('PATIENT'), (req, res) => updatePatient(req, res, req.user.patientId));
router.put('/:id', authenticate, authorize('ADMIN'), (req, res) => updatePatient(req, res, req.params.id));

// DELETE patient (and linked records)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const patientId = req.params.id;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute('BEGIN');

    // Due to ON DELETE CASCADE on foreign keys, deleting patient cascades to appointments, tests, users, vitals, etc.
    const result = await conn.execute(
      `DELETE FROM patients WHERE patient_id = $1`,
      [patientId]
    );

    if (result.rowCount === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Patient not found' });
    }

    await conn.execute('COMMIT');
    res.json({ message: 'Patient and all linked clinical/billing records deleted successfully.' });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET comprehensive patient activity log (Admin only)
router.get('/:id/activity', authenticate, authorize('ADMIN'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    // 1. Fetch Patient Info
    const patientResult = await conn.execute(
      `SELECT patient_id, first_name, last_name, TO_CHAR(date_of_birth,'YYYY-MM-DD') AS date_of_birth,
              gender, email, phone, address, blood_group
       FROM patients WHERE patient_id = $1`,
      [req.params.id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = patientResult.rows[0];

    // 2. Fetch Appointments History
    const appointmentsResult = await conn.execute(
      `SELECT a.appt_id, 'Dr. ' || d.first_name || ' ' || d.last_name AS doctor_name,
              d.specialization, dp.dept_name,
              TO_CHAR(a.appt_date,'YYYY-MM-DD') AS appt_date,
              a.appt_time, a.status, a.reason, a.notes,
              TO_CHAR(a.created_at,'YYYY-MM-DD HH12:MI AM') AS created_at
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.doctor_id
       JOIN departments dp ON a.dept_id = dp.dept_id
       WHERE a.patient_id = $1
       ORDER BY a.appt_date DESC`,
      [req.params.id]
    );

    // 3. Fetch Test Requests History
    const testsResult = await conn.execute(
      `SELECT pt.booking_id, t.test_name, t.price,
              TO_CHAR(pt.booking_date,'YYYY-MM-DD') AS booking_date,
              pt.status, pt.notes, pt.results,
              TO_CHAR(pt.created_at,'YYYY-MM-DD HH12:MI AM') AS created_at
       FROM patient_tests pt
       JOIN lab_tests t ON pt.test_id = t.test_id
       WHERE pt.patient_id = $1
       ORDER BY pt.booking_date DESC`,
      [req.params.id]
    );

    // 4. Fetch Bills History
    const billsResult = await conn.execute(
      `SELECT bill_id, description, total_amount, payment_status,
              TO_CHAR(due_date,'YYYY-MM-DD') AS due_date,
              TO_CHAR(created_at,'YYYY-MM-DD HH12:MI AM') AS created_at
       FROM bills
       WHERE patient_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    // 5. Fetch Payments History
    const paymentsResult = await conn.execute(
      `SELECT py.payment_id, py.bill_id, py.amount, py.payment_method, py.transaction_ref,
              TO_CHAR(py.payment_date,'YYYY-MM-DD HH12:MI AM') AS payment_date,
              b.description AS bill_description
       FROM payments py
       JOIN bills b ON py.bill_id = b.bill_id
       WHERE b.patient_id = $1
       ORDER BY py.payment_date DESC`,
      [req.params.id]
    );

    res.json({
      patient,
      appointments: appointmentsResult.rows,
      tests: testsResult.rows,
      bills: billsResult.rows,
      payments: paymentsResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET single patient's vitals (Admin/Doctor check)
router.get('/:id/vitals', authenticate, authorize('ADMIN', 'DOCTOR'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT vital_id, TO_CHAR(check_date, 'YYYY-MM-DD') AS check_date, blood_pressure, blood_sugar, weight, heart_rate
       FROM patient_vitals
       WHERE patient_id = $1
       ORDER BY check_date ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// POST log vitals for a patient (Admin/Doctor)
router.post('/:id/vitals', authenticate, authorize('ADMIN', 'DOCTOR'), async (req, res) => {
  const { blood_pressure, blood_sugar, weight, heart_rate } = req.body;
  if (!blood_sugar || !weight || !heart_rate) {
    return res.status(400).json({ error: 'blood_sugar, weight, and heart_rate are required' });
  }
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO patient_vitals (patient_id, blood_pressure, blood_sugar, weight, heart_rate)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.params.id,
        blood_pressure || null,
        Number(blood_sugar),
        Number(weight),
        Number(heart_rate)
      ]
    );
    res.status(201).json({ message: 'Vitals logged successfully for patient.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
