INSERT INTO appointments (
    patient_id,
    doctor_id,
    dept_id,
    appt_date,
    appt_time,
    status,
    reason
)
VALUES (
    1,
    1,
    1,
    TO_DATE('2026-05-30','YYYY-MM-DD'),
    '10:00 AM',
    'Scheduled',
    'Chest pain checkup'
);

COMMIT;
