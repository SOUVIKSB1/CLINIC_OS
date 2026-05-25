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

INSERT INTO lab_tests (test_name, description, price, preparation)
VALUES ('Complete Blood Count', 'Measures blood cell counts and overall health indicators.', 450, 'No fasting required');

INSERT INTO lab_tests (test_name, description, price, preparation)
VALUES ('Lipid Profile', 'Checks cholesterol and triglyceride levels.', 850, 'Fast for 10 to 12 hours');

INSERT INTO lab_tests (test_name, description, price, preparation)
VALUES ('Blood Glucose', 'Screens blood sugar level.', 250, 'Fasting sample preferred');

COMMIT;
