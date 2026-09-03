-- PostgreSQL Schema for ClinicOS

-- Drop tables if needed (in reverse dependency order)
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS patient_vitals CASCADE;
-- DROP TABLE IF EXISTS report_shares CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS prescriptions CASCADE;
-- DROP TABLE IF EXISTS bills CASCADE;
-- DROP TABLE IF EXISTS patient_tests CASCADE;
-- DROP TABLE IF EXISTS lab_tests CASCADE;
-- DROP TABLE IF EXISTS appointments CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS doctors CASCADE;
-- DROP TABLE IF EXISTS departments CASCADE;
-- DROP TABLE IF EXISTS patients CASCADE;

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    dept_id SERIAL PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    specialization VARCHAR(100),
    dept_id INTEGER NOT NULL REFERENCES departments(dept_id) ON DELETE CASCADE,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    available_days VARCHAR(100),
    fees NUMERIC(10,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Patients Table
CREATE TABLE IF NOT EXISTS patients (
    patient_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('M', 'F', 'O', 'Male', 'Female', 'Other')),
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) NOT NULL,
    address VARCHAR(255),
    blood_group VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Users Table (Authentication & RBAC)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(patient_id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('PATIENT', 'ADMIN', 'DOCTOR')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    appt_id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    dept_id INTEGER NOT NULL REFERENCES departments(dept_id),
    appt_date DATE NOT NULL,
    appt_time VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending' NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Scheduled', 'Completed', 'Cancelled', 'No-Show')),
    reason VARCHAR(500),
    notes VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Lab Tests Catalog Table
CREATE TABLE IF NOT EXISTS lab_tests (
    test_id SERIAL PRIMARY KEY,
    test_name VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    price NUMERIC(10,2) NOT NULL,
    preparation VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Patient Lab Test Bookings Table
CREATE TABLE IF NOT EXISTS patient_tests (
    booking_id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    test_id INTEGER NOT NULL REFERENCES lab_tests(test_id),
    booking_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending' NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled')),
    notes VARCHAR(500),
    results VARCHAR(2000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Bills Table
CREATE TABLE IF NOT EXISTS bills (
    bill_id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(patient_id),
    appointment_id INTEGER REFERENCES appointments(appt_id),
    booking_id INTEGER REFERENCES patient_tests(booking_id),
    description VARCHAR(500) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'Pending' NOT NULL CHECK (payment_status IN ('Pending', 'Paid', 'Waived', 'Cancelled')),
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL REFERENCES appointments(appt_id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    medicines VARCHAR(1000),
    instructions VARCHAR(1000),
    duration INTEGER DEFAULT 7,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all optional/upgrade columns exist on existing databases
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 7;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS fees NUMERIC(10,2) DEFAULT 0;
ALTER TABLE patient_tests ADD COLUMN IF NOT EXISTS results VARCHAR(2000);
ALTER TABLE patient_tests ADD COLUMN IF NOT EXISTS notes VARCHAR(500);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS booking_id INTEGER;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS appointment_id INTEGER;

-- 10. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL REFERENCES bills(bill_id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(30),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_ref VARCHAR(100)
);

-- 11. Report Shares Table
CREATE TABLE IF NOT EXISTS report_shares (
    share_id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES patient_tests(booking_id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    recipient_name VARCHAR(100),
    recipient_email VARCHAR(100) NOT NULL,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Patient Vitals (Health Tracker) Table
CREATE TABLE IF NOT EXISTS patient_vitals (
    vital_id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    check_date DATE DEFAULT CURRENT_DATE,
    blood_pressure VARCHAR(20),
    blood_sugar NUMERIC(6,2),
    weight NUMERIC(6,2),
    heart_rate INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(200),
    message VARCHAR(1000),
    is_read VARCHAR(1) DEFAULT 'N' CHECK (is_read IN ('Y', 'N')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(100),
    entity_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Helpful Indexes
CREATE INDEX IF NOT EXISTS idx_doctors_dept ON doctors(dept_id);
CREATE INDEX IF NOT EXISTS idx_appts_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appts_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_vitals_patient ON patient_vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_patient ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
