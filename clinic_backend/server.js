// server.js — Main entry point
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
require('dotenv').config();

const { createPool } = require('./db');

const departmentsRouter  = require('./routes/departments');
const doctorsRouter      = require('./routes/doctors');
const patientsRouter     = require('./routes/patients');
const appointmentsRouter = require('./routes/appointments');
const authRouter          = require('./routes/auth');
const testsRouter         = require('./routes/tests');
const billsRouter         = require('./routes/bills');
const prescriptionsRouter = require('./routes/prescriptions');
const notificationsRouter = require('./routes/notifications');

const app  = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check route
app.get('/', (req, res) => {
  res.json({ message: '🏥 Clinic API is running!' });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Clinic API' });
});

// Routes
app.use('/api/departments',  departmentsRouter);
app.use('/api/doctors',      doctorsRouter);
app.use('/api/patients',     patientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/auth',         authRouter);
app.use('/api/tests',        testsRouter);
app.use('/api/bills',        billsRouter);
app.use('/api/prescriptions', prescriptionsRouter);
app.use('/api/notifications', notificationsRouter);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// ─── Keep-alive: prevent Render free tier from spinning down ────────────────
// Render injects RENDER_EXTERNAL_URL automatically; fall back to localhost.
const KEEP_ALIVE_URL =
  (process.env.RENDER_EXTERNAL_URL
    ? `${process.env.RENDER_EXTERNAL_URL}/api/health`
    : `http://localhost:${process.env.PORT || 5001}/api/health`);

const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes (Render sleeps at 15)

function startKeepAlive() {
  const protocol = KEEP_ALIVE_URL.startsWith('https') ? require('https') : require('http');

  const ping = () => {
    const req = protocol.get(KEEP_ALIVE_URL, (res) => {
      console.log(`🏓 Keep-alive ping → ${KEEP_ALIVE_URL} [${res.statusCode}]`);
    });
    req.on('error', (err) => {
      console.warn(`⚠️  Keep-alive ping failed: ${err.message}`);
    });
    req.end();
  };

  // First ping after 1 minute, then every 14 minutes
  setTimeout(() => {
    ping();
    setInterval(ping, PING_INTERVAL_MS);
  }, 60_000);

  console.log(`🏓 Keep-alive scheduler started — pinging every ${PING_INTERVAL_MS / 60000} min`);
}
// ────────────────────────────────────────────────────────────────────────────

// Start server after DB pool is ready
createPool()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      startKeepAlive();
    });
    server.on('error', (error) => {
      console.error(`Unable to listen on port ${PORT}:`, error.message);
      process.exitCode = 1;
    });
  })
  .catch((error) => {
    console.error('Unable to start server:', error.message);
    process.exitCode = 1;
  });
