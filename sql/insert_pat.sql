INSERT INTO patients (
    first_name,
    last_name,
    date_of_birth,
    gender,
    email,
    phone,
    address,
    blood_group
)
VALUES (
    'Ravi',
    'Kumar',
    TO_DATE('1990-05-14','YYYY-MM-DD'),
    'M',
    'ravi.k@gmail.com',
    '90000-11111',
    'Park Street, Kolkata',
    'B+'
);

COMMIT;
