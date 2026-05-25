CREATE INDEX idx_appt_patient
ON appointments(patient_id);

CREATE INDEX idx_appt_doctor
ON appointments(doctor_id);

CREATE INDEX idx_appt_date
ON appointments(appt_date);

CREATE INDEX idx_doctor_dept
ON doctors(dept_id);
