CREATE TABLE appointments (
    appt_id NUMBER DEFAULT appoinment_seq.NEXTVAL PRIMARY KEY,
    patient_id NUMBER NOT NULL,
    doctor_id NUMBER NOT NULL,
    dept_id NUMBER NOT NULL,
    appt_date DATE NOT NULL,
    appt_time VARCHAR2(20) NOT NULL,
    status VARCHAR2(20) DEFAULT 'Pending',
    reason VARCHAR2(500),
    notes VARCHAR2(1000),
    created_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_dept FOREIGN KEY (dept_id) REFERENCES departments(dept_id),
    CONSTRAINT chk_appt_status CHECK ( status IN ( 'Pending', 'Approved', 'Rejected', 'Scheduled', 'Completed', 'Cancelled', 'No-Show'))
);
