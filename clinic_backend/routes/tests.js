const express = require('express');
const { getConnection } = require('../db');
const authenticate = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/catalog', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT test_id, test_name, description, price, preparation
       FROM lab_tests ORDER BY test_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.post('/catalog', authenticate, authorize('ADMIN'), async (req, res) => {
  const { test_name, description, price, preparation } = req.body;
  if (!test_name?.trim() || price === undefined || Number(price) < 0)
    return res.status(400).json({ error: 'Test name and a valid price are required' });
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO lab_tests (test_name, description, price, preparation)
       VALUES ($1, $2, $3, $4)`,
      [test_name.trim(), description || null, Number(price), preparation || null]
    );
    res.status(201).json({ message: 'Lab test added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.put('/catalog/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const { test_name, description, price, preparation } = req.body;
  if (!test_name?.trim() || price === undefined || Number(price) < 0)
    return res.status(400).json({ error: 'Test name and a valid price are required' });
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `UPDATE lab_tests
       SET test_name = $1, description = $2, price = $3, preparation = $4
       WHERE test_id = $5`,
      [test_name.trim(), description || null, Number(price), preparation || null, Number(req.params.id)]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Lab test not found' });
    res.json({ message: 'Lab test updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.delete('/catalog/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `DELETE FROM lab_tests WHERE test_id = $1`,
      [Number(req.params.id)]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Lab test not found' });
    res.json({ message: 'Lab test deleted successfully' });
  } catch (err) {
    if (err.code === '23503' || err.message?.includes('foreign key constraint')) {
      return res.status(400).json({ error: 'Cannot delete this test because patients have already booked appointments for it.' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.get('/requests', authenticate, authorize('ADMIN'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT b.booking_id, b.patient_id,
              p.first_name || ' ' || p.last_name AS patient_name,
              t.test_id, t.test_name, t.price,
              TO_CHAR(b.booking_date,'YYYY-MM-DD') AS booking_date,
              b.status, b.notes, b.results
       FROM patient_tests b
       JOIN patients p ON b.patient_id = p.patient_id
       JOIN lab_tests t ON b.test_id = t.test_id
       ORDER BY b.booking_date DESC, b.booking_id DESC`
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
      `SELECT b.booking_id, t.test_id, t.test_name, t.description, t.price, t.preparation,
              TO_CHAR(b.booking_date,'YYYY-MM-DD') AS booking_date,
              b.status, b.notes, b.results,
              (SELECT STRING_AGG(recipient_name || ' (' || recipient_email || ')', ', ' ORDER BY shared_at)
               FROM report_shares WHERE booking_id = b.booking_id) AS shared_with
       FROM patient_tests b
       JOIN lab_tests t ON b.test_id = t.test_id
       WHERE b.patient_id = $1
       ORDER BY b.booking_date DESC, b.booking_id DESC`,
      [req.user.patientId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.post('/requests', authenticate, authorize('PATIENT'), async (req, res) => {
  const { test_id, booking_date, notes } = req.body;
  if (!test_id || !booking_date)
    return res.status(400).json({ error: 'Test and preferred date are required' });
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO patient_tests (patient_id, test_id, booking_date, status, notes)
       VALUES ($1, $2, $3::date, 'Pending', $4)`,
      [req.user.patientId, test_id, booking_date, notes || null]
    );
    res.status(201).json({ message: 'Test request sent for approval' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.put('/requests/:id/status', authenticate, authorize('ADMIN'), async (req, res) => {
  const allowed = ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'];
  if (!allowed.includes(req.body.status))
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `UPDATE patient_tests SET status = $1 WHERE booking_id = $2`,
      [req.body.status, req.params.id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Test request not found' });
    res.json({ message: `Test request marked as ${req.body.status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.put('/requests/:id/cancel', authenticate, authorize('PATIENT'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `UPDATE patient_tests SET status = 'Cancelled'
       WHERE booking_id = $1 AND patient_id = $2
         AND status IN ('Pending', 'Approved')`,
      [req.params.id, req.user.patientId]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Open test request not found' });
    res.json({ message: 'Test request cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// PUT complete test and upload report results
router.put('/requests/:id/complete', authenticate, authorize('ADMIN'), async (req, res) => {
  const { results } = req.body;
  if (!results?.trim()) {
    return res.status(400).json({ error: 'Test results/report description are required' });
  }

  let conn;
  try {
    conn = await getConnection();
    await conn.execute('BEGIN');

    // 1. Get test details
    const testDetails = await conn.execute(
      `SELECT pt.patient_id, t.test_name, t.price, pt.status,
              TO_CHAR(pt.booking_date,'YYYY-MM-DD') AS booking_date
       FROM patient_tests pt
       JOIN lab_tests t ON pt.test_id = t.test_id
       WHERE pt.booking_id = $1`,
      [req.params.id]
    );

    if (testDetails.rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Diagnostic test request not found' });
    }

    const { PATIENT_ID, TEST_NAME, PRICE, BOOKING_DATE } = testDetails.rows[0];

    // 2. Update test request to 'Completed' and save results
    await conn.execute(
      `UPDATE patient_tests
       SET status = 'Completed', results = $1
       WHERE booking_id = $2`,
      [results.trim(), req.params.id]
    );

    // 3. Auto-issue a bill if not already completed/paid/billed
    const existingBill = await conn.execute(
      `SELECT COUNT(*) AS total FROM bills WHERE booking_id = $1`,
      [req.params.id]
    );

    if (parseInt(existingBill.rows[0].TOTAL, 10) === 0 && PRICE && Number(PRICE) > 0) {
      await conn.execute(
        `INSERT INTO bills (patient_id, booking_id, description, total_amount, payment_status, due_date)
         VALUES ($1, $2, $3, $4, 'Pending', CURRENT_DATE + INTERVAL '7 days')`,
        [PATIENT_ID, req.params.id, `Diagnostic Test - ${TEST_NAME}`, Number(PRICE)]
      );
    }

    // 4. Auto-extract vitals from test results and push to Health Tracker
    const testNameLower = TEST_NAME.toLowerCase();
    let blood_sugar = null, blood_pressure = null, heart_rate = null, weight = null;

    if (testNameLower.includes('glucose') || testNameLower.includes('sugar') || testNameLower.includes('hba1c') || testNameLower.includes('diabetes')) {
      const sugarValues = [];
      const labeledPattern = /(?:fasting|post\s*prandial|pp|random|blood)\s*(?:blood\s*)?(?:glucose|sugar)[\s:=\-–]*(\d+(?:\.\d+)?)/gi;
      let m;
      while ((m = labeledPattern.exec(results)) !== null) {
        const val = Number(m[1]);
        if (val >= 30 && val <= 600) sugarValues.push(val);
      }

      if (sugarValues.length === 0) {
        const simplePattern = /(?:glucose|sugar|level|result|value)[\s:=\-–]*(\d+(?:\.\d+)?)/gi;
        while ((m = simplePattern.exec(results)) !== null) {
          const val = Number(m[1]);
          if (val >= 30 && val <= 600) sugarValues.push(val);
        }
      }

      if (sugarValues.length === 0) {
        const unitPattern = /(\d+(?:\.\d+)?)\s*mg\s*\/?\s*dl/gi;
        while ((m = unitPattern.exec(results)) !== null) {
          const val = Number(m[1]);
          const before = results.substring(Math.max(0, m.index - 20), m.index);
          if (/(?:normal|ref|range|<|>)\s*[:=]?\s*$/i.test(before)) continue;
          if (val >= 30 && val <= 600) sugarValues.push(val);
        }
      }

      if (sugarValues.length > 0) {
        blood_sugar = Math.round(sugarValues.reduce((a, b) => a + b, 0) / sugarValues.length);
      }
    }

    const bpMatch = results.match(/(?:bp|blood\s*pressure)[\s:=\-–]*(\d{2,3}\s*\/\s*\d{2,3})/i)
      || results.match(/(\d{2,3}\s*\/\s*\d{2,3})\s*(?:mmhg|mm\s*hg)/i);
    if (bpMatch) blood_pressure = bpMatch[1].replace(/\s/g, '');

    const hrMatch = results.match(/(?:heart\s*rate|pulse|hr)[\s:=\-–]*(\d{2,3})/i)
      || results.match(/(\d{2,3})\s*(?:bpm|beats)/i);
    if (hrMatch) heart_rate = Number(hrMatch[1]);

    const wtMatch = results.match(/(?:weight|wt|body\s*weight)[\s:=\-–]*(\d+(?:\.\d+)?)/i);
    if (wtMatch) weight = Number(wtMatch[1]);

    if (testNameLower.includes('blood count') || testNameLower.includes('cbc')) {
      if (!blood_sugar) {
        const cbcPattern = /(?:sugar|glucose)[\s:=\-–]*(\d+(?:\.\d+)?)/gi;
        const cbcVals = [];
        let cm;
        while ((cm = cbcPattern.exec(results)) !== null) {
          const val = Number(cm[1]);
          if (val >= 30 && val <= 600) cbcVals.push(val);
        }
        if (cbcVals.length > 0) blood_sugar = Math.round(cbcVals.reduce((a, b) => a + b, 0) / cbcVals.length);
      }
    }

    if (blood_sugar || blood_pressure || heart_rate || weight) {
      const lastVitals = await conn.execute(
        `SELECT blood_pressure, blood_sugar, weight, heart_rate
         FROM patient_vitals
         WHERE patient_id = $1
         ORDER BY check_date DESC
         LIMIT 1`,
        [PATIENT_ID]
      );
      const prev = lastVitals.rows.length > 0 ? lastVitals.rows[0] : {};

      await conn.execute(
        `INSERT INTO patient_vitals (patient_id, check_date, blood_pressure, blood_sugar, weight, heart_rate)
         VALUES ($1, $2::date, $3, $4, $5, $6)`,
        [
          PATIENT_ID,
          BOOKING_DATE,
          blood_pressure || prev.BLOOD_PRESSURE || null,
          blood_sugar || prev.BLOOD_SUGAR || null,
          weight || prev.WEIGHT || null,
          heart_rate || prev.HEART_RATE || null
        ]
      );
    }

    await conn.execute('COMMIT');
    const vitalsSynced = (blood_sugar || blood_pressure || heart_rate || weight) ? ' Vitals synced to Health Tracker.' : '';
    res.json({ message: `Diagnostic test marked as Completed. Report generated and bill issued successfully.${vitalsSynced}` });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// POST share diagnostic test report
router.post('/requests/:id/share', authenticate, authorize('PATIENT'), async (req, res) => {
  const { recipient_name, recipient_email } = req.body;
  if (!recipient_email?.trim()) {
    return res.status(400).json({ error: 'Recipient email is required' });
  }
  let conn;
  try {
    conn = await getConnection();
    
    const testResult = await conn.execute(
      `SELECT patient_id, status FROM patient_tests WHERE booking_id = $1`,
      [req.params.id]
    );
    
    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test request not found' });
    }
    
    const test = testResult.rows[0];
    if (test.PATIENT_ID !== req.user.patientId) {
      return res.status(403).json({ error: 'Unauthorized to share this report' });
    }
    if (test.STATUS !== 'Completed') {
      return res.status(400).json({ error: 'Only completed test reports can be shared' });
    }
    
    await conn.execute(
      `INSERT INTO report_shares (booking_id, patient_id, recipient_name, recipient_email)
       VALUES ($1, $2, $3, $4)`,
      [
        Number(req.params.id),
        req.user.patientId,
        recipient_name?.trim() || null,
        recipient_email.trim()
      ]
    );
    
    res.status(201).json({ message: 'Report shared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
