// routes/appointments.js
const express    = require('express');
const router     = express.Router();
const { getConnection } = require('../db');
const authenticate = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

// GET all appointments (full joined view)
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT a.appt_id,
              p.patient_id,
              CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
              d.doctor_id,
              CONCAT('Dr. ', d.first_name, ' ', d.last_name) AS doctor_name,
              d.specialization,
              dp.dept_name,
              TO_CHAR(a.appt_date,'YYYY-MM-DD') AS appt_date,
              a.appt_time,
              a.status,
              a.reason,
              a.notes,
              pr.prescription_id
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       JOIN doctors d ON a.doctor_id = d.doctor_id
       JOIN departments dp ON a.dept_id = dp.dept_id
       LEFT JOIN prescriptions pr ON a.appt_id = pr.appointment_id
       ORDER BY a.appt_date DESC, a.appt_time`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

async function getPatientAppointments(req, res, patientId) {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT a.appt_id,
              CONCAT('Dr. ', d.first_name, ' ', d.last_name) AS doctor_name,
              d.specialization, dp.dept_name,
              TO_CHAR(a.appt_date,'YYYY-MM-DD') AS appt_date,
              a.appt_time, a.status, a.reason,
              pr.prescription_id
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.doctor_id
       JOIN departments dp ON a.dept_id = dp.dept_id
       LEFT JOIN prescriptions pr ON a.appt_id = pr.appointment_id
       WHERE a.patient_id = $1
       ORDER BY a.appt_date DESC`,
      [Number(patientId)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
}

// Patients see their own requests; authority can inspect a patient's history.
router.get('/mine', authenticate, authorize('PATIENT'), (req, res) => getPatientAppointments(req, res, req.user.patientId));
router.get('/patient/:patient_id', authenticate, authorize('ADMIN'), (req, res) => getPatientAppointments(req, res, req.params.patient_id));

// GET appointments for a specific doctor
router.get('/doctor/:doctor_id', authenticate, authorize('ADMIN'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT a.appt_id,
              CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
              p.phone,
              TO_CHAR(a.appt_date,'YYYY-MM-DD') AS appt_date,
              a.appt_time, a.status, a.reason
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       WHERE a.doctor_id = $1
       ORDER BY a.appt_date`,
      [Number(req.params.doctor_id)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// POST book a new appointment
router.post('/', authenticate, authorize('PATIENT'), async (req, res) => {
  const { doctor_id, dept_id, appt_date, appt_time, reason, notes } = req.body;
  const patient_id = req.user.patientId;
  if (!doctor_id || !dept_id || !appt_date || !appt_time)
    return res.status(400).json({ error: 'doctor_id, dept_id, appt_date and appt_time are required' });

  const cleanDate = (typeof appt_date === 'string') ? appt_date.trim() : appt_date;

  let conn;
  try {
    conn = await getConnection();
    const doctorResult = await conn.execute(
      `SELECT first_name, last_name, available_days, dept_id FROM doctors WHERE doctor_id = $1`,
      [Number(doctor_id)]
    );
    if (doctorResult.rows.length === 0)
      return res.status(404).json({ error: 'Selected doctor not found' });
      
    const doctor = doctorResult.rows[0];
    if (Number(doctor.DEPT_ID) !== Number(dept_id))
      return res.status(400).json({ error: 'The selected doctor does not belong to this department' });

    if (doctor.AVAILABLE_DAYS) {
      const raw = doctor.AVAILABLE_DAYS.toLowerCase().trim();
      if (raw !== "" && !raw.includes("daily") && !raw.includes("all")) {
        const DAY_MAP = {
          sun: "sun", sunday: "sun",
          mon: "mon", monday: "mon",
          tue: "tue", tues: "tue", tuesday: "tue",
          wed: "wed", weds: "wed", wednesday: "wed",
          thu: "thu", thur: "thu", thurs: "thu", thursday: "thu",
          fri: "fri", friday: "fri",
          sat: "sat", saturday: "sat",
        };
        const tokens = raw.split(/[\s,;/|]+/).filter(Boolean);
        const availSet = new Set();
        for (const tok of tokens) {
          const mapped = DAY_MAP[tok];
          if (mapped) availSet.add(mapped);
        }

        const [year, month, day] = String(cleanDate).split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const shortDayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayShort = shortDayNames[dateObj.getDay()];
        const dayFull = dayNames[dateObj.getDay()];

        if (!availSet.has(dayShort)) {
          return res.status(400).json({
            error: `Dr. ${doctor.FIRST_NAME} ${doctor.LAST_NAME} is not available on ${dayFull}s. Available days: ${doctor.AVAILABLE_DAYS}`
          });
        }
      }
    }

    const occupied = await conn.execute(
      `SELECT COUNT(*) AS total FROM appointments
       WHERE doctor_id = $1
         AND appt_date = $2::date
         AND appt_time = $3
         AND status IN ('Pending', 'Approved', 'Scheduled')`,
      [Number(doctor_id), cleanDate, appt_time]
    );
    if (parseInt(occupied.rows[0].TOTAL, 10) > 0)
      return res.status(409).json({ error: 'This time slot is already booked for the selected doctor' });
    
    await conn.execute(
      `INSERT INTO appointments (patient_id, doctor_id, dept_id, appt_date, appt_time, status, reason, notes)
       VALUES ($1, $2, $3, $4::date, $5, 'Pending', $6, $7)`,
      [
        Number(patient_id),
        Number(doctor_id),
        Number(dept_id),
        cleanDate,
        appt_time,
        reason || null,
        notes || null
      ]
    );
    res.status(201).json({ message: 'Appointment request sent for approval' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// PUT update appointment status
router.put('/:id/status', authenticate, authorize('ADMIN'), async (req, res) => {
  const { status } = req.body;
  const allowed = ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled', 'No-Show'];
  if (!allowed.includes(status))
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `UPDATE appointments SET status = $1 WHERE appt_id = $2`,
      [status, Number(req.params.id)]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Appointment not found' });
    res.json({ message: `Appointment marked as ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Patients can cancel their own pending or approved request.
router.put('/:id/cancel', authenticate, authorize('PATIENT'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `UPDATE appointments SET status = 'Cancelled'
       WHERE appt_id = $1 AND patient_id = $2
         AND status IN ('Pending', 'Approved', 'Scheduled')`,
      [Number(req.params.id), Number(req.user.patientId)]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Open appointment request not found' });
    res.json({ message: 'Appointment request cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Authority may permanently remove records after cancellation or rejection.
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `DELETE FROM appointments WHERE appt_id = $1`,
      [Number(req.params.id)]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Appointment not found' });
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
