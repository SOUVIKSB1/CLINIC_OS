const express = require('express');
const router  = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db');
const authenticate = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

router.get('/', authenticate, authorize('PATIENT'), async (req, res) => {
  const patient_id = req.user.patientId;
  let conn;

  try {
    conn = await getConnection();
    const notifications = [];

    // 1. Query upcoming appointments (Approved/Scheduled)
    const appts = await conn.execute(
      `SELECT a.appt_id, 'Dr. ' || d.first_name || ' ' || d.last_name AS doctor_name,
              TO_CHAR(a.appt_date,'YYYY-MM-DD') AS appt_date, a.appt_time
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.doctor_id
       WHERE a.patient_id = :patient_id
         AND a.status IN ('Approved', 'Scheduled')
         AND a.appt_date >= TRUNC(SYSDATE)
       ORDER BY a.appt_date, a.appt_time`,
      [patient_id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    appts.rows.forEach(appt => {
      notifications.push({
        id: `appt-${appt.APPT_ID}`,
        type: 'reminder',
        title: 'Upcoming Appointment',
        message: `Reminder: You have an appointment with ${appt.DOCTOR_NAME} scheduled for ${appt.APPT_DATE} at ${appt.APPT_TIME}.`,
        date: appt.APPT_DATE
      });
    });

    // 2. Query unpaid bills
    const bills = await conn.execute(
      `SELECT bill_id, description, total_amount, TO_CHAR(due_date,'YYYY-MM-DD') AS due_date
       FROM bills
       WHERE patient_id = :patient_id AND payment_status = 'Pending'
       ORDER BY created_at DESC`,
      [patient_id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    bills.rows.forEach(bill => {
      notifications.push({
        id: `bill-${bill.BILL_ID}`,
        type: 'billing',
        title: 'Outstanding Bill',
        message: `Outstanding payment: An unpaid bill of ₹${bill.TOTAL_AMOUNT} for "${bill.DESCRIPTION}" is due on ${bill.DUE_DATE || 'receipt'}.`,
        date: bill.DUE_DATE
      });
    });

    // 3. Query completed diagnostic tests
    const tests = await conn.execute(
      `SELECT pt.booking_id, t.test_name, TO_CHAR(pt.booking_date,'YYYY-MM-DD') AS booking_date
       FROM patient_tests pt
       JOIN lab_tests t ON pt.test_id = t.test_id
       WHERE pt.patient_id = :patient_id AND pt.status = 'Completed'
       ORDER BY pt.created_at DESC`,
      [patient_id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    tests.rows.forEach(test => {
      notifications.push({
        id: `test-${test.BOOKING_ID}`,
        type: 'report',
        title: 'Test Report Ready',
        message: `Your diagnostic report for "${test.TEST_NAME}" is now ready for viewing.`,
        date: test.BOOKING_DATE
      });
    });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
