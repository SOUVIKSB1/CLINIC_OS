const express = require('express');
const { getConnection } = require('../db');
const authenticate = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT b.bill_id, b.patient_id, CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
              b.appointment_id, b.booking_id, b.description, b.total_amount, b.payment_status,
              TO_CHAR(b.due_date,'YYYY-MM-DD') AS due_date, TO_CHAR(b.created_at,'YYYY-MM-DD') AS created_at
       FROM bills b JOIN patients p ON b.patient_id = p.patient_id
       ORDER BY b.created_at DESC, b.bill_id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.get('/mine', authenticate, authorize('PATIENT'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT bill_id, appointment_id, booking_id, description, total_amount, payment_status,
              TO_CHAR(due_date,'YYYY-MM-DD') AS due_date, TO_CHAR(created_at,'YYYY-MM-DD') AS created_at
       FROM bills WHERE patient_id = $1
       ORDER BY created_at DESC, bill_id DESC`,
      [Number(req.user.patientId)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { patient_id, appointment_id, booking_id, description, total_amount, due_date } = req.body;
  if (!patient_id || !description?.trim() || total_amount === undefined || Number(total_amount) <= 0)
    return res.status(400).json({ error: 'Patient, description and a valid total amount are required' });

  const cleanDueDate = (due_date && typeof due_date === 'string' && due_date.trim()) ? due_date.trim() : null;

  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO bills (patient_id, appointment_id, booking_id, description, total_amount, payment_status, due_date)
       VALUES ($1, $2, $3, $4, $5, 'Pending', $6::date)`,
      [
        Number(patient_id),
        appointment_id ? Number(appointment_id) : null,
        booking_id ? Number(booking_id) : null,
        description.trim(),
        Number(total_amount),
        cleanDueDate
      ]
    );
    res.status(201).json({ message: 'Bill sent to patient' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.put('/:id/status', authenticate, authorize('ADMIN'), async (req, res) => {
  const allowed = ['Pending', 'Paid', 'Waived', 'Cancelled'];
  if (!allowed.includes(req.body.payment_status))
    return res.status(400).json({ error: `payment_status must be one of: ${allowed.join(', ')}` });
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `UPDATE bills SET payment_status = $1 WHERE bill_id = $2`,
      [req.body.payment_status, Number(req.params.id)]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Bill not found' });
    res.json({ message: 'Bill status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// PUT pay a bill (Patient portal payment gateway mockup)
router.put('/:id/pay', authenticate, authorize('PATIENT'), async (req, res) => {
  const { payment_method, transaction_ref } = req.body;
  const patient_id = Number(req.user.patientId);
  const bill_id = Number(req.params.id);
  let conn;

  try {
    conn = await getConnection();
    await conn.execute('BEGIN');

    // 1. Verify bill exists and belongs to the patient
    const billCheck = await conn.execute(
      `SELECT total_amount, payment_status FROM bills
       WHERE bill_id = $1 AND patient_id = $2`,
      [bill_id, patient_id]
    );

    if (billCheck.rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Bill not found or does not belong to your account' });
    }

    const { TOTAL_AMOUNT, PAYMENT_STATUS } = billCheck.rows[0];

    if (PAYMENT_STATUS === 'Paid') {
      await conn.rollback();
      return res.status(400).json({ error: 'This bill has already been paid' });
    }

    // 2. Insert payment record
    await conn.execute(
      `INSERT INTO payments (bill_id, amount, payment_method, transaction_ref)
       VALUES ($1, $2, $3, $4)`,
      [
        bill_id,
        Number(TOTAL_AMOUNT),
        payment_method || 'Online Payment',
        transaction_ref || `TXN-${Date.now()}`
      ]
    );

    // 3. Update bill status to 'Paid'
    await conn.execute(
      `UPDATE bills SET payment_status = 'Paid' WHERE bill_id = $1`,
      [bill_id]
    );

    await conn.execute('COMMIT');
    res.json({ message: 'Payment successful, transaction recorded.' });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
