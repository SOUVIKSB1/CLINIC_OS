// routes/patients.js
const express    = require('express');
const router     = express.Router();
const oracledb   = require('oracledb');
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
       FROM patients ORDER BY last_name`,
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

// GET own patient profile
router.get('/me', authenticate, authorize('PATIENT'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT patient_id, first_name, last_name,
              TO_CHAR(date_of_birth,'YYYY-MM-DD') AS date_of_birth,
              gender, email, phone, address, blood_group
       FROM patients WHERE patient_id = :id`,
      [req.user.patientId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
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
       WHERE patient_id = :id
       ORDER BY check_date ASC`,
      [req.user.patientId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
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
       VALUES (:patient_id, NVL(TO_DATE(:check_date,'YYYY-MM-DD'), SYSDATE), :blood_pressure, :blood_sugar, :weight, :heart_rate)`,
      {
        patient_id: req.user.patientId,
        check_date: check_date || null,
        blood_pressure: blood_pressure || null,
        blood_sugar: Number(blood_sugar),
        weight: Number(weight),
        heart_rate: Number(heart_rate)
      },
      { autoCommit: true }
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
      `DELETE FROM patient_vitals WHERE vital_id = :vitalId AND patient_id = :patientId`,
      { vitalId: req.params.vitalId, patientId: req.user.patientId },
      { autoCommit: true }
    );
    if (result.rowsAffected === 0)
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
       FROM patients WHERE patient_id = :id`,
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
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
       VALUES (:first_name, :last_name, TO_DATE(:date_of_birth,'YYYY-MM-DD'), :gender, :email, :phone, :address, :blood_group)`,
      { first_name, last_name, date_of_birth, gender, email, phone, address, blood_group },
      { autoCommit: true }
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
    const result = await conn.execute(
      `UPDATE patients
       SET first_name = :first_name, last_name = :last_name,
           date_of_birth = TO_DATE(:date_of_birth,'YYYY-MM-DD'), gender = :gender,
           phone = :phone, address = :address, email = :email, blood_group = :blood_group
       WHERE patient_id = :id`,
      { first_name, last_name, date_of_birth, gender, email, phone, address, blood_group, id: patientId },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0)
      return res.status(404).json({ error: 'Patient not found' });
    await conn.execute(
      `UPDATE users SET full_name = :full_name, email = :email WHERE patient_id = :id`,
      { full_name: `${first_name.trim()} ${last_name.trim()}`, email, id: patientId },
      { autoCommit: true }
    );
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

// DELETE patient
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const patientId = req.params.id;
  let conn;
  try {
    conn = await getConnection();

    // 1. Delete payments associated with this patient's bills
    await conn.execute(
      `DELETE FROM payments WHERE bill_id IN (SELECT bill_id FROM bills WHERE patient_id = :id)`,
      [patientId],
      { autoCommit: false }
    );

    // 2. Delete bills associated with this patient
    await conn.execute(
      `DELETE FROM bills WHERE patient_id = :id`,
      [patientId],
      { autoCommit: false }
    );

    // 3. Delete prescriptions associated with this patient
    await conn.execute(
      `DELETE FROM prescriptions WHERE patient_id = :id`,
      [patientId],
      { autoCommit: false }
    );

    // 4. Delete patient tests associated with this patient
    await conn.execute(
      `DELETE FROM patient_tests WHERE patient_id = :id`,
      [patientId],
      { autoCommit: false }
    );

    // 5. Delete appointments associated with this patient
    await conn.execute(
      `DELETE FROM appointments WHERE patient_id = :id`,
      [patientId],
      { autoCommit: false }
    );

    // 6. Delete users associated with this patient
    await conn.execute(
      `DELETE FROM users WHERE patient_id = :id`,
      [patientId],
      { autoCommit: false }
    );

    // 7. Finally, delete the patient record
    const result = await conn.execute(
      `DELETE FROM patients WHERE patient_id = :id`,
      [patientId],
      { autoCommit: false }
    );

    if (result.rowsAffected === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Patient not found' });
    }

    await conn.commit();
    res.json({ message: 'Patient and all linked clinical/billing records deleted successfully.' });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackErr) {
        console.error('Rollback error:', rollbackErr);
      }
    }
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
       FROM patients WHERE patient_id = :id`,
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
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
              TO_CHAR(a.created_at,'YYYY-MM-DD HH:MI AM') AS created_at
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.doctor_id
       JOIN departments dp ON a.dept_id = dp.dept_id
       WHERE a.patient_id = :id
       ORDER BY a.appt_date DESC`,
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // 3. Fetch Test Requests History
    const testsResult = await conn.execute(
      `SELECT pt.booking_id, t.test_name, t.price,
              TO_CHAR(pt.booking_date,'YYYY-MM-DD') AS booking_date,
              pt.status, pt.notes, pt.results,
              TO_CHAR(pt.created_at,'YYYY-MM-DD HH:MI AM') AS created_at
       FROM patient_tests pt
       JOIN lab_tests t ON pt.test_id = t.test_id
       WHERE pt.patient_id = :id
       ORDER BY pt.booking_date DESC`,
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // 4. Fetch Bills History
    const billsResult = await conn.execute(
      `SELECT bill_id, description, total_amount, payment_status,
              TO_CHAR(due_date,'YYYY-MM-DD') AS due_date,
              TO_CHAR(created_at,'YYYY-MM-DD HH:MI AM') AS created_at
       FROM bills
       WHERE patient_id = :id
       ORDER BY created_at DESC`,
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // 5. Fetch Payments History
    const paymentsResult = await conn.execute(
      `SELECT py.payment_id, py.bill_id, py.amount, py.payment_method, py.transaction_ref,
              TO_CHAR(py.payment_date,'YYYY-MM-DD HH:MI AM') AS payment_date,
              b.description AS bill_description
       FROM payments py
       JOIN bills b ON py.bill_id = b.bill_id
       WHERE b.patient_id = :id
       ORDER BY py.payment_date DESC`,
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
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
router.get('/:id/vitals', authenticate, authorize('ADMIN'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT vital_id, TO_CHAR(check_date, 'YYYY-MM-DD') AS check_date, blood_pressure, blood_sugar, weight, heart_rate
       FROM patient_vitals
       WHERE patient_id = :id
       ORDER BY check_date ASC`,
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// POST log vitals for a patient (Admin/Doctor)
router.post('/:id/vitals', authenticate, authorize('ADMIN'), async (req, res) => {
  const { blood_pressure, blood_sugar, weight, heart_rate } = req.body;
  if (!blood_sugar || !weight || !heart_rate) {
    return res.status(400).json({ error: 'blood_sugar, weight, and heart_rate are required' });
  }
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO patient_vitals (patient_id, blood_pressure, blood_sugar, weight, heart_rate)
       VALUES (:patient_id, :blood_pressure, :blood_sugar, :weight, :heart_rate)`,
      {
        patient_id: req.params.id,
        blood_pressure: blood_pressure || null,
        blood_sugar: Number(blood_sugar),
        weight: Number(weight),
        heart_rate: Number(heart_rate)
      },
      { autoCommit: true }
    );
    res.status(201).json({ message: 'Vitals logged successfully for patient.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
