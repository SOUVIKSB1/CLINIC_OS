SELECT 'DEPARTMENTS' AS tbl, COUNT(*) AS total_rows FROM departments  UNION ALL
SELECT 'DOCTORS',            COUNT(*)               FROM doctors      UNION ALL
SELECT 'PATIENTS',           COUNT(*)               FROM patients     UNION ALL
SELECT 'APPOINTMENTS',       COUNT(*)               FROM appointments;
SELECT
    a.appt_id,
    p.first_name || ' ' || p.last_name  AS patient_name,
    d.first_name || ' ' || d.last_name  AS doctor_name,
    dp.dept_name,
    a.appt_date,
    a.appt_time,
    a.status,
    a.reason
FROM appointments a
JOIN patients    p  ON a.patient_id = p.patient_id
JOIN doctors     d  ON a.doctor_id  = d.doctor_id
JOIN departments dp ON a.dept_id    = dp.dept_id
ORDER BY a.appt_date;
