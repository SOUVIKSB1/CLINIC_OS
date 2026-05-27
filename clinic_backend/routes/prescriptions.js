const express = require('express');
const router  = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db');
const authenticate = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

// POST create a prescription
router.post('/', authenticate, authorize('ADMIN', 'DOCTOR'), async (req, res) => {
  const { appointment_id, medicines, instructions, duration } = req.body;
  if (!appointment_id || !medicines?.trim()) {
    return res.status(400).json({ error: 'appointment_id and medicines are required' });
  }

  let conn;
  try {
    conn = await getConnection();

    // 1. Get appointment details (doctor_id, patient_id, and doctor details)
    const apptResult = await conn.execute(
      `SELECT a.doctor_id, a.patient_id, d.first_name, d.last_name, d.fees
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.doctor_id
       WHERE a.appt_id = :appointment_id`,
      [appointment_id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (apptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const { DOCTOR_ID, PATIENT_ID, FIRST_NAME, LAST_NAME, FEES } = apptResult.rows[0];

    const durationVal = duration !== undefined && duration !== null && duration !== '' ? Number(duration) : 7;

    // 2. Insert the prescription
    await conn.execute(
      `INSERT INTO prescriptions (appointment_id, doctor_id, patient_id, medicines, instructions, duration)
       VALUES (:appointment_id, :doctor_id, :patient_id, :medicines, :instructions, :duration)`,
      {
        appointment_id,
        doctor_id: DOCTOR_ID,
        patient_id: PATIENT_ID,
        medicines: medicines.trim(),
        instructions: instructions ? instructions.trim() : null,
        duration: durationVal
      }
    );

    // 3. Mark appointment as Completed
    await conn.execute(
      `UPDATE appointments SET status = 'Completed' WHERE appt_id = :appointment_id`,
      [appointment_id]
    );

    // 4. Generate bill automatically if doctor has fees > 0
    if (FEES && Number(FEES) > 0) {
      const description = `Consultation Fee - Dr. ${FIRST_NAME} ${LAST_NAME}`;
      await conn.execute(
        `INSERT INTO bills (patient_id, appointment_id, description, total_amount, payment_status, due_date)
         VALUES (:patient_id, :appointment_id, :description, :total_amount, 'Pending', SYSDATE + 7)`,
        {
          patient_id: PATIENT_ID,
          appointment_id,
          description,
          total_amount: Number(FEES)
        }
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Prescription generated and marked appointment as Completed.' });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET prescription for a specific appointment
router.get('/appointment/:appt_id', authenticate, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT pr.prescription_id, pr.appointment_id, pr.medicines, pr.instructions, pr.duration,
              TO_CHAR(pr.created_at, 'YYYY-MM-DD HH:MI AM') AS created_at,
              'Dr. ' || d.first_name || ' ' || d.last_name AS doctor_name,
              d.specialization,
              p.first_name || ' ' || p.last_name AS patient_name,
              TO_CHAR(a.appt_date, 'YYYY-MM-DD') AS appt_date, a.appt_time
       FROM prescriptions pr
       JOIN appointments a ON pr.appointment_id = a.appt_id
       JOIN doctors d ON pr.doctor_id = d.doctor_id
       JOIN patients p ON pr.patient_id = p.patient_id
       WHERE pr.appointment_id = :appt_id`,
      [req.params.appt_id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET all prescriptions for a specific patient
router.get('/patient/:patient_id', authenticate, authorize('ADMIN', 'DOCTOR'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT pr.prescription_id, pr.appointment_id, pr.medicines, pr.instructions, pr.duration,
              TO_CHAR(pr.created_at, 'YYYY-MM-DD HH:MI AM') AS created_at,
              'Dr. ' || d.first_name || ' ' || d.last_name AS doctor_name,
              d.specialization,
              p.first_name || ' ' || p.last_name AS patient_name,
              TO_CHAR(a.appt_date, 'YYYY-MM-DD') AS appt_date, a.appt_time
       FROM prescriptions pr
       JOIN appointments a ON pr.appointment_id = a.appt_id
       JOIN doctors d ON pr.doctor_id = d.doctor_id
       JOIN patients p ON pr.patient_id = p.patient_id
       WHERE pr.patient_id = :patient_id
       ORDER BY a.appt_date DESC, pr.created_at DESC`,
      [req.params.patient_id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// PUT update a prescription
router.put('/:id', authenticate, authorize('ADMIN', 'DOCTOR'), async (req, res) => {
  const { medicines, instructions, duration } = req.body;
  if (!medicines?.trim()) {
    return res.status(400).json({ error: 'Medicines are required' });
  }

  let conn;
  try {
    conn = await getConnection();
    const durationVal = duration !== undefined && duration !== null && duration !== '' ? Number(duration) : 7;
    const result = await conn.execute(
      `UPDATE prescriptions 
       SET medicines = :medicines, instructions = :instructions, duration = :duration 
       WHERE prescription_id = :id`,
      {
        medicines: medicines.trim(),
        instructions: instructions ? instructions.trim() : null,
        duration: durationVal,
        id: req.params.id
      },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    res.json({ message: 'Prescription updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;

