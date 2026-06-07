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



// Start server after DB pool is ready
createPool()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
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
