-- Run once on an existing ClinicOS database that already has the core four tables.
-- This enables logins, patient approval requests, tests, and billing.

CREATE SEQUENCE user_seq START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE lab_test_seq START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE test_booking_seq START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE bill_seq START WITH 1 INCREMENT BY 1 NOCACHE;

ALTER TABLE appointments DROP CONSTRAINT chk_appt_status;
ALTER TABLE appointments MODIFY status DEFAULT 'Pending';
ALTER TABLE appointments ADD CONSTRAINT chk_appt_status
CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Scheduled', 'Completed', 'Cancelled', 'No-Show'));

CREATE TABLE users (
    user_id NUMBER DEFAULT user_seq.NEXTVAL PRIMARY KEY,
    patient_id NUMBER,
    full_name VARCHAR2(100) NOT NULL,
    email VARCHAR2(100) UNIQUE NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    role VARCHAR2(20) NOT NULL,
    created_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_user_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT chk_role CHECK (role IN ('PATIENT', 'ADMIN', 'DOCTOR'))
);

CREATE TABLE lab_tests (
    test_id NUMBER DEFAULT lab_test_seq.NEXTVAL PRIMARY KEY,
    test_name VARCHAR2(120) NOT NULL,
    description VARCHAR2(500),
    price NUMBER(10,2) NOT NULL,
    preparation VARCHAR2(500),
    created_at DATE DEFAULT SYSDATE
);

CREATE TABLE patient_tests (
    booking_id NUMBER DEFAULT test_booking_seq.NEXTVAL PRIMARY KEY,
    patient_id NUMBER NOT NULL,
    test_id NUMBER NOT NULL,
    booking_date DATE NOT NULL,
    status VARCHAR2(20) DEFAULT 'Pending' NOT NULL,
    notes VARCHAR2(500),
    created_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_test_booking_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_test_booking_test FOREIGN KEY (test_id) REFERENCES lab_tests(test_id),
    CONSTRAINT chk_test_booking_status CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'))
);

CREATE TABLE bills (
    bill_id NUMBER DEFAULT bill_seq.NEXTVAL PRIMARY KEY,
    patient_id NUMBER NOT NULL,
    appointment_id NUMBER,
    booking_id NUMBER,
    description VARCHAR2(500) NOT NULL,
    total_amount NUMBER(10,2) NOT NULL,
    payment_status VARCHAR2(20) DEFAULT 'Pending' NOT NULL,
    due_date DATE,
    created_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_bill_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    CONSTRAINT fk_bill_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(appt_id),
    CONSTRAINT fk_bill_test_booking FOREIGN KEY (booking_id) REFERENCES patient_tests(booking_id),
    CONSTRAINT chk_bill_status CHECK (payment_status IN ('Pending', 'Paid', 'Waived', 'Cancelled'))
);

INSERT INTO lab_tests (test_name, description, price, preparation)
VALUES ('Complete Blood Count', 'Measures blood cell counts and overall health indicators.', 450, 'No fasting required');

INSERT INTO lab_tests (test_name, description, price, preparation)
VALUES ('Lipid Profile', 'Checks cholesterol and triglyceride levels.', 850, 'Fast for 10 to 12 hours');

INSERT INTO lab_tests (test_name, description, price, preparation)
VALUES ('Blood Glucose', 'Screens blood sugar level.', 250, 'Fasting sample preferred');

COMMIT;
