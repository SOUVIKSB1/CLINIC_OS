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
