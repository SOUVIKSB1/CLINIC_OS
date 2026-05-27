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
