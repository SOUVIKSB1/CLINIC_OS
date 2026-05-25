// routes/departments.js
const express = require('express');
const router  = express.Router();
const { getConnection } = require('../db');
const authenticate = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

// GET all departments
router.get('/', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT dept_id, dept_name, location, phone FROM departments ORDER BY dept_name`,
      [],
      { outFormat: require('oracledb').OUT_FORMAT_OBJECT }
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET single department by ID
router.get('/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT * FROM departments WHERE dept_id = :id`,
      [req.params.id],
      { outFormat: require('oracledb').OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Department not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// POST create department
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { dept_name, location, phone } = req.body;
  if (!dept_name?.trim())
    return res.status(400).json({ error: 'dept_name is required' });
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO departments (dept_name, location, phone)
       VALUES (:dept_name, :location, :phone)`,
      { dept_name, location, phone },
      { autoCommit: true }
    );
    res.status(201).json({ message: 'Department created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// DELETE department
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `DELETE FROM departments WHERE dept_id = :id`,
      [req.params.id],
      { autoCommit: true }
    );
    if (result.rowsAffected === 0)
      return res.status(404).json({ error: 'Department not found' });
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
