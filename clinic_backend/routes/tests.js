const express = require('express');
const oracledb = require('oracledb');
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
       FROM lab_tests ORDER BY test_name`,
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

router.post('/catalog', authenticate, authorize('ADMIN'), async (req, res) => {
  const { test_name, description, price, preparation } = req.body;
  if (!test_name?.trim() || price === undefined || Number(price) < 0)
    return res.status(400).json({ error: 'Test name and a valid price are required' });
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO lab_tests (test_name, description, price, preparation)
       VALUES (:test_name, :description, :price, :preparation)`,
      { test_name, description, price: Number(price), preparation },
      { autoCommit: true }
    );
    res.status(201).json({ message: 'Lab test added' });
  } catch (err) {
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
       ORDER BY b.booking_date DESC, b.booking_id DESC`,
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

router.get('/mine', authenticate, authorize('PATIENT'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT b.booking_id, t.test_id, t.test_name, t.description, t.price, t.preparation,
              TO_CHAR(b.booking_date,'YYYY-MM-DD') AS booking_date,
              b.status, b.notes, b.results,
              (SELECT LISTAGG(recipient_name || ' (' || recipient_email || ')', ', ') WITHIN GROUP (ORDER BY shared_at)
               FROM report_shares WHERE booking_id = b.booking_id) AS shared_with
       FROM patient_tests b
       JOIN lab_tests t ON b.test_id = t.test_id
       WHERE b.patient_id = :patient_id
       ORDER BY b.booking_date DESC, b.booking_id DESC`,
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

router.post('/requests', authenticate, authorize('PATIENT'), async (req, res) => {
  const { test_id, booking_date, notes } = req.body;
  if (!test_id || !booking_date)
    return res.status(400).json({ error: 'Test and preferred date are required' });
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO patient_tests (patient_id, test_id, booking_date, status, notes)
       VALUES (:patient_id, :test_id, TO_DATE(:booking_date,'YYYY-MM-DD'), 'Pending', :notes)`,
      { patient_id: req.user.patientId, test_id, booking_date, notes },
      { autoCommit: true }
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
      `UPDATE patient_tests SET status = :status WHERE booking_id = :id`,
      { status: req.body.status, id: req.params.id },
      { autoCommit: true }
    );
    if (result.rowsAffected === 0)
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
       WHERE booking_id = :id AND patient_id = :patient_id
         AND status IN ('Pending', 'Approved')`,
      { id: req.params.id, patient_id: req.user.patientId },
      { autoCommit: true }
    );
    if (result.rowsAffected === 0)
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

    // 1. Get test details
    const testDetails = await conn.execute(
      `SELECT pt.patient_id, t.test_name, t.price, pt.status,
              TO_CHAR(pt.booking_date,'YYYY-MM-DD') AS booking_date
       FROM patient_tests pt
       JOIN lab_tests t ON pt.test_id = t.test_id
       WHERE pt.booking_id = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (testDetails.rows.length === 0) {
      return res.status(404).json({ error: 'Diagnostic test request not found' });
    }

    const { PATIENT_ID, TEST_NAME, PRICE, BOOKING_DATE } = testDetails.rows[0];

    // 2. Update test request to 'Completed' and save results
    await conn.execute(
      `UPDATE patient_tests
       SET status = 'Completed', results = :results
       WHERE booking_id = :id`,
      { results: results.trim(), id: req.params.id }
    );

    // 3. Auto-issue a bill if not already completed/paid/billed
    const existingBill = await conn.execute(
      `SELECT COUNT(*) AS total FROM bills WHERE booking_id = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (existingBill.rows[0].TOTAL === 0 && PRICE && Number(PRICE) > 0) {
      await conn.execute(
        `INSERT INTO bills (patient_id, booking_id, description, total_amount, payment_status, due_date)
         VALUES (:patient_id, :booking_id, :description, :total_amount, 'Pending', SYSDATE + 7)`,
        {
          patient_id: PATIENT_ID,
          booking_id: req.params.id,
          description: `Diagnostic Test - ${TEST_NAME}`,
          total_amount: Number(PRICE)
        }
      );
    }

    // 4. Auto-extract vitals from test results and push to Health Tracker
    const resultText = results.trim().toLowerCase();
    const testNameLower = TEST_NAME.toLowerCase();
    let blood_sugar = null, blood_pressure = null, heart_rate = null, weight = null;

    // Extract blood sugar / glucose — find ALL glucose values and average them
    if (testNameLower.includes('glucose') || testNameLower.includes('sugar') || testNameLower.includes('hba1c') || testNameLower.includes('diabetes')) {
      const sugarValues = [];

      // Match labeled glucose lines: "FASTING BLOOD GLUCOSE: 100 mg/dL", "POST PRANDIAL GLUCOSE: 300 mg/dL", "Random Sugar: 150"
      const labeledPattern = /(?:fasting|post\s*prandial|pp|random|blood)\s*(?:blood\s*)?(?:glucose|sugar)[\s:=\-–]*(\d+(?:\.\d+)?)/gi;
      let m;
      while ((m = labeledPattern.exec(results)) !== null) {
        const val = Number(m[1]);
        if (val >= 30 && val <= 600) sugarValues.push(val); // sane glucose range
      }

      // If no labeled lines found, try standalone "glucose: 110" or "sugar: 95"
      if (sugarValues.length === 0) {
        const simplePattern = /(?:glucose|sugar|level|result|value)[\s:=\-–]*(\d+(?:\.\d+)?)/gi;
        while ((m = simplePattern.exec(results)) !== null) {
          const val = Number(m[1]);
          if (val >= 30 && val <= 600) sugarValues.push(val);
        }
      }

      // Last fallback: find "NNN mg/dL" values (but not reference ranges)
      if (sugarValues.length === 0) {
        const unitPattern = /(\d+(?:\.\d+)?)\s*mg\s*\/?\s*dl/gi;
        while ((m = unitPattern.exec(results)) !== null) {
          const val = Number(m[1]);
          // Skip reference range numbers (after "Normal:" or "<" or "-")
          const before = results.substring(Math.max(0, m.index - 20), m.index);
          if (/(?:normal|ref|range|<|>)\s*[:=]?\s*$/i.test(before)) continue;
          if (val >= 30 && val <= 600) sugarValues.push(val);
        }
      }

      // Average all found glucose values
      if (sugarValues.length > 0) {
        blood_sugar = Math.round(sugarValues.reduce((a, b) => a + b, 0) / sugarValues.length);
      }
    }

    // Extract BP from any test results (e.g. "BP: 120/80")
    const bpMatch = results.match(/(?:bp|blood\s*pressure)[\s:=\-–]*(\d{2,3}\s*\/\s*\d{2,3})/i)
      || results.match(/(\d{2,3}\s*\/\s*\d{2,3})\s*(?:mmhg|mm\s*hg)/i);
    if (bpMatch) blood_pressure = bpMatch[1].replace(/\s/g, '');

    // Extract heart rate from any test (e.g. "HR: 72 bpm")
    const hrMatch = results.match(/(?:heart\s*rate|pulse|hr)[\s:=\-–]*(\d{2,3})/i)
      || results.match(/(\d{2,3})\s*(?:bpm|beats)/i);
    if (hrMatch) heart_rate = Number(hrMatch[1]);

    // Extract weight (e.g. "Weight: 68 kg")
    const wtMatch = results.match(/(?:weight|wt|body\s*weight)[\s:=\-–]*(\d+(?:\.\d+)?)/i);
    if (wtMatch) weight = Number(wtMatch[1]);

    // Also handle CBC / Complete Blood Count — may include sugar
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

    // Insert a vitals row if we extracted anything useful
    if (blood_sugar || blood_pressure || heart_rate || weight) {
      // Fetch last vitals entry to carry forward any missing fields
      const lastVitals = await conn.execute(
        `SELECT blood_pressure, blood_sugar, weight, heart_rate
         FROM patient_vitals
         WHERE patient_id = :pid
         ORDER BY check_date DESC
         FETCH FIRST 1 ROW ONLY`,
        { pid: PATIENT_ID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const prev = lastVitals.rows.length > 0 ? lastVitals.rows[0] : {};

      await conn.execute(
        `INSERT INTO patient_vitals (patient_id, check_date, blood_pressure, blood_sugar, weight, heart_rate)
         VALUES (:patient_id, TO_DATE(:check_date,'YYYY-MM-DD'), :blood_pressure, :blood_sugar, :weight, :heart_rate)`,
        {
          patient_id: PATIENT_ID,
          check_date: BOOKING_DATE,
          blood_pressure: blood_pressure || prev.BLOOD_PRESSURE || null,
          blood_sugar: blood_sugar || prev.BLOOD_SUGAR || null,
          weight: weight || prev.WEIGHT || null,
          heart_rate: heart_rate || prev.HEART_RATE || null,
        }
      );
    }

    await conn.commit();
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
    
    // Verify the test booking belongs to the patient and is completed
    const testResult = await conn.execute(
      `SELECT patient_id, status FROM patient_tests WHERE booking_id = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
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
       VALUES (:booking_id, :patient_id, :recipient_name, :recipient_email)`,
      {
        booking_id: Number(req.params.id),
        patient_id: req.user.patientId,
        recipient_name: recipient_name?.trim() || null,
        recipient_email: recipient_email.trim()
      },
      { autoCommit: true }
    );
    
    res.status(201).json({ message: 'Report shared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
