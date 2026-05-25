const oracledb = require('oracledb');
require('dotenv').config();
const { createPool, getConnection, closePool } = require('../db');

async function hasObject(conn, name, type) {
  const result = await conn.execute(
    `SELECT COUNT(*) AS total FROM user_objects WHERE object_name = :name AND object_type = :type`,
    { name: name.toUpperCase(), type },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return result.rows[0].TOTAL > 0;
}

async function hasColumn(conn, table, column) {
  const result = await conn.execute(
    `SELECT COUNT(*) AS total FROM user_tab_columns WHERE table_name = :table_name AND column_name = :column_name`,
    { table_name: table.toUpperCase(), column_name: column.toUpperCase() },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return result.rows[0].TOTAL > 0;
}

async function hasConstraint(conn, name) {
  const result = await conn.execute(
    `SELECT COUNT(*) AS total FROM user_constraints WHERE constraint_name = :name`,
    [name.toUpperCase()],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return result.rows[0].TOTAL > 0;
}

async function addColumn(conn, table, column, definition) {
  if (!(await hasColumn(conn, table, column))) {
    await conn.execute(`ALTER TABLE ${table} ADD ${column} ${definition}`);
    console.log(`Added ${table}.${column}`);
  }
}

async function ensureSequence(conn, sequence, table, idColumn) {
  const maxResult = await conn.execute(
    `SELECT NVL(MAX(${idColumn}), 0) AS maximum FROM ${table}`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const minimum = maxResult.rows[0].MAXIMUM + 1;
  if (!(await hasObject(conn, sequence, 'SEQUENCE'))) {
    await conn.execute(`CREATE SEQUENCE ${sequence} START WITH ${minimum} INCREMENT BY 1 NOCACHE`);
    console.log(`Created ${sequence} starting at ${minimum}`);
    return;
  }
  const sequenceResult = await conn.execute(
    `SELECT last_number FROM user_sequences WHERE sequence_name = :name`,
    [sequence.toUpperCase()],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const nextNumber = sequenceResult.rows[0].LAST_NUMBER;
  if (nextNumber < minimum) {
    await conn.execute(`ALTER SEQUENCE ${sequence} INCREMENT BY ${minimum - nextNumber}`);
    await conn.execute(`SELECT ${sequence}.NEXTVAL FROM dual`);
    await conn.execute(`ALTER SEQUENCE ${sequence} INCREMENT BY 1`);
    console.log(`Advanced ${sequence} beyond existing rows`);
  }
}

async function addConstraint(conn, name, statement) {
  if (!(await hasConstraint(conn, name))) {
    await conn.execute(statement);
    console.log(`Added ${name}`);
  }
}

async function seedTest(conn, name, description, price, preparation) {
  const result = await conn.execute(
    `SELECT COUNT(*) AS total FROM lab_tests WHERE LOWER(test_name) = LOWER(:name)`,
    [name],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  if (result.rows[0].TOTAL === 0) {
    await conn.execute(
      `INSERT INTO lab_tests (test_name, description, price, preparation)
       VALUES (:name, :description, :price, :preparation)`,
      { name, description, price, preparation },
      { autoCommit: false }
    );
    console.log(`Seeded ${name}`);
  }
}

async function seedVitals(conn) {
  const ptsResult = await conn.execute(
    `SELECT patient_id FROM patients`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  
  for (const pt of ptsResult.rows) {
    const ptId = pt.PATIENT_ID;
    const checkVitals = await conn.execute(
      `SELECT COUNT(*) AS total FROM patient_vitals WHERE patient_id = :ptId`,
      [ptId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (checkVitals.rows[0].TOTAL === 0) {
      const baseWeight = 65 + Math.random() * 20;
      const baseSugar = 85 + Math.random() * 40;
      
      const records = [
        { daysAgo: 28, bp: '122/80', sugar: baseSugar - 10, weight: baseWeight + 2, hr: 72 },
        { daysAgo: 21, bp: '120/82', sugar: baseSugar - 5, weight: baseWeight + 1.2, hr: 74 },
        { daysAgo: 14, bp: '118/79', sugar: baseSugar + 8, weight: baseWeight + 0.5, hr: 70 },
        { daysAgo: 7,  bp: '121/80', sugar: baseSugar - 2, weight: baseWeight, hr: 71 },
        { daysAgo: 0,  bp: '119/81', sugar: baseSugar, weight: baseWeight - 0.5, hr: 73 }
      ];
      
      for (const rec of records) {
        await conn.execute(
          `INSERT INTO patient_vitals (patient_id, check_date, blood_pressure, blood_sugar, weight, heart_rate)
           VALUES (:patient_id, SYSDATE - :daysAgo, :blood_pressure, :blood_sugar, :weight, :heart_rate)`,
          {
            patient_id: ptId,
            daysAgo: rec.daysAgo,
            blood_pressure: rec.bp,
            blood_sugar: Math.round(rec.sugar * 10) / 10,
            weight: Math.round(rec.weight * 10) / 10,
            heart_rate: rec.hr
          }
        );
      }
      console.log(`Seeded vitals for patient ${ptId}`);
    }
  }
}

async function main() {
  await createPool();
  let conn;
  try {
    conn = await getConnection();
    for (const table of ['USERS', 'LAB_TESTS', 'PATIENT_TESTS', 'BILLS']) {
      if (!(await hasObject(conn, table, 'TABLE')))
        throw new Error(`Missing ${table} table. Run the fresh-install SQL scripts first.`);
    }

    await ensureSequence(conn, 'user_seq', 'users', 'user_id');
    await ensureSequence(conn, 'lab_test_seq', 'lab_tests', 'test_id');
    await ensureSequence(conn, 'test_booking_seq', 'patient_tests', 'booking_id');
    await ensureSequence(conn, 'bill_seq', 'bills', 'bill_id');

    await addColumn(conn, 'users', 'patient_id', 'NUMBER');
    await addColumn(conn, 'lab_tests', 'preparation', 'VARCHAR2(500)');
    await addColumn(conn, 'lab_tests', 'created_at', 'DATE DEFAULT SYSDATE');
    await addColumn(conn, 'patient_tests', 'notes', 'VARCHAR2(500)');
    await addColumn(conn, 'patient_tests', 'created_at', 'DATE DEFAULT SYSDATE');
    await addColumn(conn, 'bills', 'booking_id', 'NUMBER');
    await addColumn(conn, 'bills', 'description', 'VARCHAR2(500)');
    await addColumn(conn, 'bills', 'due_date', 'DATE');
    await addColumn(conn, 'doctors', 'fees', 'NUMBER(10,2) DEFAULT 0');
    await addColumn(conn, 'patient_tests', 'results', 'VARCHAR2(2000)');

    if (!(await hasObject(conn, 'prescription_seq', 'SEQUENCE'))) {
      await conn.execute(`CREATE SEQUENCE prescription_seq START WITH 1 INCREMENT BY 1 NOCACHE`);
      console.log('Created prescription_seq');
    }

    if (!(await hasObject(conn, 'prescription_seq', 'SEQUENCE'))) {
      await conn.execute(`CREATE SEQUENCE prescription_seq START WITH 1 INCREMENT BY 1 NOCACHE`);
      console.log('Created prescription_seq');
    }

    if (!(await hasObject(conn, 'payment_seq', 'SEQUENCE'))) {
      await conn.execute(`CREATE SEQUENCE payment_seq START WITH 1 INCREMENT BY 1 NOCACHE`);
      console.log('Created payment_seq');
    }

    if (!(await hasObject(conn, 'prescriptions', 'TABLE'))) {
      await conn.execute(`
        CREATE TABLE prescriptions (
          prescription_id NUMBER DEFAULT prescription_seq.NEXTVAL PRIMARY KEY,
          appointment_id NUMBER NOT NULL,
          doctor_id NUMBER NOT NULL,
          patient_id NUMBER NOT NULL,
          medicines VARCHAR2(1000),
          instructions VARCHAR2(1000),
          created_at DATE DEFAULT SYSDATE,
          CONSTRAINT fk_pres_appt FOREIGN KEY (appointment_id) REFERENCES appointments(appt_id) ON DELETE CASCADE,
          CONSTRAINT fk_pres_doc FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
          CONSTRAINT fk_pres_pat FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
        )
      `);
      console.log('Created prescriptions table');
    }

    if (!(await hasObject(conn, 'payments', 'TABLE'))) {
      await conn.execute(`
        CREATE TABLE payments (
          payment_id NUMBER DEFAULT payment_seq.NEXTVAL PRIMARY KEY,
          bill_id NUMBER NOT NULL,
          amount NUMBER(10,2) NOT NULL,
          payment_method VARCHAR2(30),
          payment_date DATE DEFAULT SYSDATE,
          transaction_ref VARCHAR2(100),
          CONSTRAINT fk_payment_bill FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE
        )
      `);
      console.log('Created payments table');
    }

    if (!(await hasObject(conn, 'report_share_seq', 'SEQUENCE'))) {
      await conn.execute(`CREATE SEQUENCE report_share_seq START WITH 1 INCREMENT BY 1 NOCACHE`);
      console.log('Created report_share_seq');
    }

    if (!(await hasObject(conn, 'report_shares', 'TABLE'))) {
      await conn.execute(`
        CREATE TABLE report_shares (
          share_id NUMBER DEFAULT report_share_seq.NEXTVAL PRIMARY KEY,
          booking_id NUMBER NOT NULL,
          patient_id NUMBER NOT NULL,
          recipient_name VARCHAR2(100),
          recipient_email VARCHAR2(100) NOT NULL,
          shared_at DATE DEFAULT SYSDATE,
          CONSTRAINT fk_share_booking FOREIGN KEY (booking_id) REFERENCES patient_tests(booking_id) ON DELETE CASCADE,
          CONSTRAINT fk_share_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
        )
      `);
      console.log('Created report_shares table');
    }

    if (!(await hasObject(conn, 'vital_seq', 'SEQUENCE'))) {
      await conn.execute(`CREATE SEQUENCE vital_seq START WITH 1 INCREMENT BY 1 NOCACHE`);
      console.log('Created vital_seq');
    }

    if (!(await hasObject(conn, 'patient_vitals', 'TABLE'))) {
      await conn.execute(`
        CREATE TABLE patient_vitals (
          vital_id NUMBER DEFAULT vital_seq.NEXTVAL PRIMARY KEY,
          patient_id NUMBER NOT NULL,
          check_date DATE DEFAULT SYSDATE,
          blood_pressure VARCHAR2(20),
          blood_sugar NUMBER(5,2),
          weight NUMBER(5,2),
          heart_rate NUMBER(3),
          CONSTRAINT fk_vitals_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
        )
      `);
      console.log('Created patient_vitals table');
    }

    await conn.execute(`ALTER TABLE users MODIFY user_id DEFAULT user_seq.NEXTVAL`);
    await conn.execute(`ALTER TABLE lab_tests MODIFY test_id DEFAULT lab_test_seq.NEXTVAL`);
    await conn.execute(`ALTER TABLE patient_tests MODIFY booking_id DEFAULT test_booking_seq.NEXTVAL`);
    await conn.execute(`ALTER TABLE patient_tests MODIFY status DEFAULT 'Pending'`);
    await conn.execute(`ALTER TABLE bills MODIFY bill_id DEFAULT bill_seq.NEXTVAL`);
    await conn.execute(`ALTER TABLE bills MODIFY payment_status DEFAULT 'Pending'`);
    await conn.execute(`ALTER TABLE appointments MODIFY status DEFAULT 'Pending'`);
    await conn.execute(`ALTER TABLE prescriptions MODIFY prescription_id DEFAULT prescription_seq.NEXTVAL`);
    await conn.execute(`ALTER TABLE payments MODIFY payment_id DEFAULT payment_seq.NEXTVAL`);
    await conn.execute(`ALTER TABLE report_shares MODIFY share_id DEFAULT report_share_seq.NEXTVAL`);
    await conn.execute(`ALTER TABLE patient_vitals MODIFY vital_id DEFAULT vital_seq.NEXTVAL`);

    await addConstraint(conn, 'FK_USER_PATIENT', `ALTER TABLE users ADD CONSTRAINT fk_user_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE`);
    await addConstraint(conn, 'FK_BILL_PATIENT', `ALTER TABLE bills ADD CONSTRAINT fk_bill_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id)`);
    await addConstraint(conn, 'FK_BILL_APPOINTMENT', `ALTER TABLE bills ADD CONSTRAINT fk_bill_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(appt_id)`);
    await addConstraint(conn, 'FK_BILL_TEST_BOOKING', `ALTER TABLE bills ADD CONSTRAINT fk_bill_test_booking FOREIGN KEY (booking_id) REFERENCES patient_tests(booking_id)`);
    await addConstraint(conn, 'CHK_TEST_BOOKING_STATUS', `ALTER TABLE patient_tests ADD CONSTRAINT chk_test_booking_status CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'))`);
    await addConstraint(conn, 'CHK_BILL_STATUS', `ALTER TABLE bills ADD CONSTRAINT chk_bill_status CHECK (payment_status IN ('Pending', 'Paid', 'Waived', 'Cancelled'))`);

    if (await hasConstraint(conn, 'CHK_APPT_STATUS'))
      await conn.execute(`ALTER TABLE appointments DROP CONSTRAINT chk_appt_status`);
    await conn.execute(`ALTER TABLE appointments ADD CONSTRAINT chk_appt_status CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Scheduled', 'Completed', 'Cancelled', 'No-Show'))`);

    await seedTest(conn, 'Complete Blood Count', 'Measures blood cell counts and overall health indicators.', 450, 'No fasting required');
    await seedTest(conn, 'Lipid Profile', 'Checks cholesterol and triglyceride levels.', 850, 'Fast for 10 to 12 hours');
    await seedTest(conn, 'Blood Glucose', 'Screens blood sugar level.', 250, 'Fasting sample preferred');
    await seedVitals(conn);
    await conn.commit();
    console.log('Portal migration completed');
  } finally {
    if (conn) await conn.close();
    await closePool();
  }
}

main().catch((error) => {
  console.error(`Portal migration failed: ${error.message}`);
  process.exitCode = 1;
});
