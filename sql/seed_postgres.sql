-- Seed data for ClinicOS PostgreSQL

-- 1. Departments
INSERT INTO departments (dept_id, dept_name, location, phone) VALUES
(1, 'Cardiology', 'Building A, Floor 2', '+1 555-0101'),
(2, 'Dermatology', 'Building B, Floor 1', '+1 555-0102'),
(3, 'Pediatrics', 'Building A, Floor 1', '+1 555-0103'),
(4, 'Neurology', 'Building C, Floor 3', '+1 555-0104'),
(5, 'Orthopedics', 'Building B, Floor 2', '+1 555-0105'),
(6, 'General Medicine', 'Building A, Ground Floor', '+1 555-0106')
ON CONFLICT (dept_id) DO NOTHING;

-- Synchronize departments sequence
SELECT setval('departments_dept_id_seq', (SELECT MAX(dept_id) FROM departments));

-- 2. Doctors
INSERT INTO doctors (doctor_id, first_name, last_name, specialization, dept_id, email, phone, available_days, fees) VALUES
(1, 'Sarah', 'Jenkins', 'Cardiologist', 1, 'sarah.jenkins@clinic.com', '+1 555-1001', 'Mon, Wed, Fri', 150.00),
(2, 'David', 'Chen', 'Dermatologist', 2, 'david.chen@clinic.com', '+1 555-1002', 'Tue, Thu, Sat', 120.00),
(3, 'Emily', 'Rodriguez', 'Pediatrician', 3, 'emily.rodriguez@clinic.com', '+1 555-1003', 'Mon, Tue, Wed, Thu', 100.00),
(4, 'Michael', 'Chang', 'Neurologist', 4, 'michael.chang@clinic.com', '+1 555-1004', 'Wed, Fri', 200.00),
(5, 'Jessica', 'Taylor', 'Orthopedic Surgeon', 5, 'jessica.taylor@clinic.com', '+1 555-1005', 'Mon, Thu', 180.00),
(6, 'Robert', 'Miller', 'General Physician', 6, 'robert.miller@clinic.com', '+1 555-1006', 'Mon, Tue, Wed, Thu, Fri', 80.00)
ON CONFLICT (doctor_id) DO NOTHING;

-- Synchronize doctors sequence
SELECT setval('doctors_doctor_id_seq', (SELECT MAX(doctor_id) FROM doctors));

-- 3. Lab Tests
INSERT INTO lab_tests (test_id, test_name, description, price, preparation) VALUES
(1, 'Complete Blood Count (CBC)', 'Measures red and white blood cells, hemoglobin, and platelets.', 45.00, 'No fasting required'),
(2, 'Lipid Profile', 'Evaluates cardiac risk by analyzing cholesterol and triglyceride levels.', 85.00, 'Fasting required for 10-12 hours'),
(3, 'Fasting Blood Glucose', 'Screens for prediabetes and diabetes mellitus.', 25.00, 'Fast for at least 8 hours prior to test'),
(4, 'Thyroid Stimulating Hormone (TSH)', 'Assesses thyroid gland function.', 55.00, 'No special preparation needed'),
(5, 'Liver Function Test (LFT)', 'Measures proteins, liver enzymes, and bilirubin in blood.', 70.00, 'Fasting for 8 hours recommended'),
(6, 'Kidney Function Test (KFT / RFT)', 'Evaluates renal health measuring creatinine and urea.', 65.00, 'Stay adequately hydrated before sample collection')
ON CONFLICT (test_id) DO NOTHING;

-- Synchronize lab_tests sequence
SELECT setval('lab_tests_test_id_seq', (SELECT MAX(test_id) FROM lab_tests));
