const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { createPool, getConnection, closePool } = require('../db');

async function seedVitals(conn) {
  const ptsResult = await conn.execute(`SELECT patient_id FROM patients`);
  
  for (const pt of ptsResult.rows) {
    const ptId = pt.PATIENT_ID;
    const checkVitals = await conn.execute(
      `SELECT COUNT(*) AS total FROM patient_vitals WHERE patient_id = $1`,
      [ptId]
    );
    
    if (parseInt(checkVitals.rows[0].TOTAL, 10) === 0) {
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
           VALUES ($1, CURRENT_DATE - ($2 || ' days')::interval, $3, $4, $5, $6)`,
          [
            ptId,
            rec.daysAgo,
            rec.bp,
            Math.round(rec.sugar * 10) / 10,
            Math.round(rec.weight * 10) / 10,
            rec.hr
          ]
        );
      }
      console.log(`✅ Seeded vitals for patient ${ptId}`);
    }
  }
}

async function main() {
  await createPool();
  let conn;
  try {
    conn = await getConnection();
    console.log('🚀 Running PostgreSQL schema migration & seed...');

    const schemaPath = path.resolve(__dirname, '../../sql/schema_postgres.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await conn.execute(schemaSql);
      console.log('✅ Tables and relations verified');
    }

    const seedPath = path.resolve(__dirname, '../../sql/seed_postgres.sql');
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await conn.execute(seedSql);
      console.log('✅ Base catalog & departments verified');
    }

    await seedVitals(conn);
    console.log('🎉 PostgreSQL migration completed successfully!');
  } finally {
    if (conn) await conn.close();
    await closePool();
  }
}

main().catch((error) => {
  console.error(`Migration failed: ${error.message}`);
  process.exitCode = 1;
});
