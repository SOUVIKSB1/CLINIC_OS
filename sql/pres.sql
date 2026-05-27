CREATE TABLE prescriptions (
    prescription_id NUMBER PRIMARY KEY,
    appointment_id NUMBER NOT NULL,
    doctor_id NUMBER NOT NULL,
    patient_id NUMBER NOT NULL,
    medicines VARCHAR2(1000),
    instructions VARCHAR2(1000),
    created_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_prescription_appt
    FOREIGN KEY (appointment_id)
    REFERENCES appointments(appt_id),
    CONSTRAINT fk_prescription_doctor
    FOREIGN KEY (doctor_id)
    REFERENCES doctors(doctor_id),
    CONSTRAINT fk_prescription_patient
    FOREIGN KEY (patient_id)
    REFERENCES patients(patient_id)
);
