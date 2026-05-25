CREATE TABLE doctors (
    doctor_id       NUMBER DEFAULT doctor_seq.NEXTVAL PRIMARY KEY,
    first_name      VARCHAR2(50) NOT NULL,
    last_name       VARCHAR2(50) NOT NULL,
    specialization  VARCHAR2(100),
    dept_id         NUMBER NOT NULL,
    email           VARCHAR2(100) UNIQUE,
    phone           VARCHAR2(15),
    available_days  VARCHAR2(100),
    fees            NUMBER(10,2) DEFAULT 0 NOT NULL,
    created_at      DATE DEFAULT SYSDATE,
    CONSTRAINT fk_doctor_dept FOREIGN KEY (dept_id) REFERENCES departments(dept_id) ON DELETE CASCADE
);
