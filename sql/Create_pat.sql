CREATE TABLE patients (
    patient_id NUMBER DEFAULT patient_seq.NEXTVAL PRIMARY KEY,
    first_name VARCHAR2(50) NOT NULL,
    last_name VARCHAR2(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender CHAR(1) NOT NULL,
    email VARCHAR2(100) UNIQUE,
    phone VARCHAR2(15) NOT NULL,
    address VARCHAR2(255),
    blood_group VARCHAR2(5),
    created_at DATE DEFAULT SYSDATE,
    CONSTRAINT chk_gender CHECK (gender IN ('M', 'F', 'O'))
);
