-- =================================================================
-- ClinicOS Master Seed Data for PostgreSQL
-- Indian Specialist Doctors & Market-Standard Diagnostic Tests
-- =================================================================

-- 1. DEPARTMENTS
INSERT INTO departments (dept_id, dept_name, location, phone) VALUES
(1, 'Cardiology', 'Block A, 2nd Floor', '+91 98300-11001'),
(2, 'Dermatology & Cosmetology', 'Block B, 1st Floor', '+91 98300-11002'),
(3, 'Pediatrics & Child Health', 'Block A, 1st Floor', '+91 98300-11003'),
(4, 'Neurology & Neurosurgery', 'Block C, 3rd Floor', '+91 98300-11004'),
(5, 'Orthopedics & Joint Care', 'Block B, 2nd Floor', '+91 98300-11005'),
(6, 'General Medicine & Internal Health', 'Block A, Ground Floor', '+91 98300-11006'),
(7, 'Gastroenterology & Hepatology', 'Block C, 2nd Floor', '+91 98300-11007'),
(8, 'Gynecology & Obstetrics', 'Block D, 1st Floor', '+91 98300-11008'),
(9, 'Ophthalmology (Eye Care)', 'Block B, Ground Floor', '+91 98300-11009'),
(10, 'ENT (Ear, Nose & Throat)', 'Block A, 3rd Floor', '+91 98300-11010'),
(11, 'Endocrinology & Diabetology', 'Block C, 1st Floor', '+91 98300-11011'),
(12, 'Pulmonology & Chest Medicine', 'Block D, 2nd Floor', '+91 98300-11012'),
(13, 'Oncology & Cancer Care', 'Block E, 2nd Floor', '+91 98300-11013'),
(14, 'Psychiatry & Behavioral Health', 'Block D, 3rd Floor', '+91 98300-11014'),
(15, 'Urology & Nephrology', 'Block C, 4th Floor', '+91 98300-11015')
ON CONFLICT (dept_id) DO UPDATE SET
  dept_name = EXCLUDED.dept_name,
  location = EXCLUDED.location,
  phone = EXCLUDED.phone;

SELECT setval('departments_dept_id_seq', (SELECT MAX(dept_id) FROM departments));

-- 2. 30 INDIAN SPECIALIST DOCTORS (Fees: ₹500 - ₹3000)
INSERT INTO doctors (doctor_id, first_name, last_name, specialization, dept_id, email, phone, available_days, fees) VALUES
-- Cardiology
(1, 'Rajesh', 'Sengupta', 'Senior Consultant Cardiologist', 1, 'dr.rajesh.sengupta@clinic.com', '+91 98301-10001', 'Mon, Wed, Fri', 1500.00),
(2, 'Ananya', 'Mukherjee', 'Interventional Cardiologist', 1, 'dr.ananya.mukherjee@clinic.com', '+91 98301-10002', 'Tue, Thu, Sat', 2200.00),

-- Dermatology
(3, 'Sunita', 'Banerjee', 'Consultant Dermatologist', 2, 'dr.sunita.banerjee@clinic.com', '+91 98301-10003', 'Mon, Tue, Thu', 800.00),
(4, 'Vikramaditya', 'Roy', 'Aesthetic Dermatologist & Trichologist', 2, 'dr.vikram.roy@clinic.com', '+91 98301-10004', 'Wed, Fri, Sat', 1200.00),

-- Pediatrics
(5, 'Priya', 'Sharma', 'Senior Pediatrician', 3, 'dr.priya.sharma@clinic.com', '+91 98301-10005', 'Mon, Tue, Wed, Thu, Fri', 700.00),
(6, 'Rohan', 'Verma', 'Neonatologist & Child Specialist', 3, 'dr.rohan.verma@clinic.com', '+91 98301-10006', 'Mon, Wed, Sat', 1000.00),

-- Neurology & Neurosurgery
(7, 'Arvind', 'Nambiar', 'Senior Neurologist & Stroke Specialist', 4, 'dr.arvind.nambiar@clinic.com', '+91 98301-10007', 'Tue, Thu, Fri', 2500.00),
(8, 'Meenakshi', 'Sundaram', 'Consultant Neurosurgeon', 4, 'dr.meenakshi.sundaram@clinic.com', '+91 98301-10008', 'Mon, Wed, Fri', 3000.00),

-- Orthopedics
(9, 'Debabrata', 'Das', 'Orthopedic & Trauma Surgeon', 5, 'dr.debabrata.das@clinic.com', '+91 98301-10009', 'Mon, Wed, Thu', 1200.00),
(10, 'Sanjay', 'Kapoor', 'Joint Replacement & Spine Specialist', 5, 'dr.sanjay.kapoor@clinic.com', '+91 98301-10010', 'Tue, Fri, Sat', 2000.00),

-- General Medicine
(11, 'Amitava', 'Ghosh', 'Senior Consultant Physician', 6, 'dr.amitava.ghosh@clinic.com', '+91 98301-10011', 'Mon, Tue, Wed, Thu, Fri, Sat', 600.00),
(12, 'Neha', 'Saxena', 'General Physician & Family Medicine', 6, 'dr.neha.saxena@clinic.com', '+91 98301-10012', 'Mon, Tue, Wed, Thu, Fri', 500.00),

-- Gastroenterology
(13, 'Pradeep', 'Pillai', 'Gastroenterologist & Endoscopist', 7, 'dr.pradeep.pillai@clinic.com', '+91 98301-10013', 'Tue, Thu, Sat', 1800.00),
(14, 'Tanushree', 'Bose', 'Hepatologist & Liver Specialist', 7, 'dr.tanushree.bose@clinic.com', '+91 98301-10014', 'Mon, Wed, Fri', 2200.00),

-- Gynecology & Obstetrics
(15, 'Kavita', 'Iyer', 'Consultant Obstetrician & Gynecologist', 8, 'dr.kavita.iyer@clinic.com', '+91 98301-10015', 'Mon, Tue, Thu, Sat', 1100.00),
(16, 'Sharmistha', 'Dutta', 'High-Risk Pregnancy & Infertility Specialist', 8, 'dr.sharmistha.dutta@clinic.com', '+91 98301-10016', 'Wed, Fri, Sun', 1600.00),

-- Ophthalmology
(17, 'Aakash', 'Singhal', 'Consultant Ophthalmologist', 9, 'dr.aakash.singhal@clinic.com', '+91 98301-10017', 'Mon, Wed, Fri', 900.00),
(18, 'Ritu', 'Agrawal', 'Cataract & Lasik Refractive Surgeon', 9, 'dr.ritu.agrawal@clinic.com', '+91 98301-10018', 'Tue, Thu, Sat', 1400.00),

-- ENT
(19, 'Harish', 'Venkatesh', 'ENT & Head-Neck Surgeon', 10, 'dr.harish.venkatesh@clinic.com', '+91 98301-10019', 'Mon, Thu, Sat', 850.00),
(20, 'Monalisa', 'Bhattacharya', 'Otolaryngologist & Allergy Specialist', 10, 'dr.monalisa.b@clinic.com', '+91 98301-10020', 'Tue, Wed, Fri', 1100.00),

-- Endocrinology
(21, 'Saurabh', 'Mishra', 'Consultant Endocrinologist', 11, 'dr.saurabh.mishra@clinic.com', '+91 98301-10021', 'Mon, Wed, Fri', 1500.00),
(22, 'Sonal', 'Chawla', 'Senior Diabetologist & Metabolic Specialist', 11, 'dr.sonal.chawla@clinic.com', '+91 98301-10022', 'Tue, Thu, Sat', 950.00),

-- Pulmonology
(23, 'Alok', 'Mukherjee', 'Pulmonologist & Sleep Medicine Specialist', 12, 'dr.alok.mukherjee@clinic.com', '+91 98301-10023', 'Mon, Tue, Thu', 1300.00),
(24, 'Deepa', 'Nair', 'Consultant Chest Physician & Allergist', 12, 'dr.deepa.nair@clinic.com', '+91 98301-10024', 'Wed, Fri, Sat', 1600.00),

-- Oncology
(25, 'Sujit', 'Chakraborty', 'Senior Medical Oncologist', 13, 'dr.sujit.chakraborty@clinic.com', '+91 98301-10025', 'Tue, Thu, Sat', 2800.00),
(26, 'Pallavi', 'Kulkarni', 'Radiation & Clinical Oncologist', 13, 'dr.pallavi.kulkarni@clinic.com', '+91 98301-10026', 'Mon, Wed, Fri', 2500.00),

-- Psychiatry
(27, 'Abhirup', 'Ganguly', 'Consultant Neuropsychiatrist', 14, 'dr.abhirup.ganguly@clinic.com', '+91 98301-10027', 'Mon, Thu, Sat', 1500.00),
(28, 'Nandini', 'Menon', 'Child & Adolescent Psychiatrist', 14, 'dr.nandini.menon@clinic.com', '+91 98301-10028', 'Tue, Wed, Fri', 1800.00),

-- Urology & Nephrology
(29, 'Tarun', 'Balakrishnan', 'Senior Urologist & Andrologist', 15, 'dr.tarun.b@clinic.com', '+91 98301-10029', 'Mon, Wed, Fri', 2000.00),
(30, 'Indranil', 'Roy', 'Nephrologist & Renal Transplant Specialist', 15, 'dr.indranil.roy@clinic.com', '+91 98301-10030', 'Tue, Thu, Sat', 2400.00)
ON CONFLICT (doctor_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  specialization = EXCLUDED.specialization,
  dept_id = EXCLUDED.dept_id,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  available_days = EXCLUDED.available_days,
  fees = EXCLUDED.fees;

SELECT setval('doctors_doctor_id_seq', (SELECT MAX(doctor_id) FROM doctors));

-- 3. COMPREHENSIVE LATEST DIAGNOSTIC LAB TESTS (Indian Market Standard Pricing)
INSERT INTO lab_tests (test_id, test_name, description, price, preparation) VALUES
-- Routine Blood & Sugar
(1, 'Complete Blood Count (CBC) with ESR', 'Measures RBC, WBC, Hemoglobin, Platelets, MCV, MCH, and ESR for infection and anemia screening.', 350.00, 'No fasting required. Water intake allowed.'),
(2, 'Fasting Blood Sugar (FBS)', 'Measures baseline blood glucose level after overnight fasting.', 150.00, 'Strict overnight fast of 8 to 10 hours required.'),
(3, 'Post Prandial Blood Sugar (PPBS)', 'Assesses insulin response 2 hours after a standard meal.', 150.00, 'Sample collected exactly 2 hours after starting breakfast or main meal.'),
(4, 'HbA1c (Glycated Hemoglobin)', 'Evaluates average 3-month blood sugar control for diabetic management.', 550.00, 'No fasting required. Can be done any time of day.'),

-- Organ Health Panels
(5, 'Comprehensive Lipid Profile', 'Evaluates Total Cholesterol, HDL, LDL, VLDL, and Triglycerides to assess cardiovascular risk.', 850.00, 'Fast for 10 to 12 hours prior to sample collection.'),
(6, 'Liver Function Test (LFT)', 'Measures Bilirubin (Total/Direct), SGOT, SGPT, Alkaline Phosphatase, Total Protein, and Albumin.', 750.00, 'Fasting for 8 hours recommended. Avoid alcohol for 24 hours prior.'),
(7, 'Kidney Function Test (KFT / RFT with Electrolytes)', 'Evaluates Serum Creatinine, Urea, Uric Acid, Sodium, Potassium, and Chloride levels.', 800.00, 'Stay normally hydrated. No special fasting required.'),
(8, 'Thyroid Profile Total (T3, T4, TSH)', 'Comprehensive evaluation of thyroid gland activity and metabolic regulation.', 600.00, 'Early morning sample preferred. Take thyroid medicine after test if advised.'),

-- Vitamins & Minerals
(9, 'Vitamin D (25-Hydroxy)', 'Detects Vitamin D deficiency for bone strength, calcium absorption, and immunity.', 1200.00, 'No fasting required.'),
(10, 'Vitamin B12 (Cyanocobalamin)', 'Assesses nerve health, RBC formation, and cognitive performance.', 950.00, 'Overnight fasting of 8 hours preferred.'),
(11, 'Serum Iron Studies & Ferritin Panel', 'Evaluates Iron, Total Iron Binding Capacity (TIBC), and Ferritin reserves for anemia.', 900.00, 'Fast for 8 to 10 hours. Morning sample recommended.'),

-- Cardiac & Inflammation Biomarkers
(12, 'High-Sensitivity C-Reactive Protein (hs-CRP)', 'High-precision marker for systemic inflammation and cardiovascular disease risk.', 650.00, 'No fasting required.'),
(13, 'Cardiac Troponin I (High Sensitivity)', 'Gold standard emergency cardiac marker for acute myocardial infarction (heart attack).', 1400.00, 'Emergency blood test, no preparation required.'),
(14, 'D-Dimer Quantitative Assay', 'Detects deep vein thrombosis (DVT), pulmonary embolism, and clotting disorders.', 1100.00, 'No fasting required.'),

-- Urine & Stool Analysis
(15, 'Urine Routine & Microscopic Examination', 'Screens for urinary tract infection (UTI), kidney disease, protein, and glucose presence.', 250.00, 'First morning midstream clean-catch urine sample in a sterile container.'),
(16, 'Stool Routine & Occult Blood Test', 'Screens for intestinal infections, parasites, and gastrointestinal bleeding.', 300.00, 'Fresh stool sample in a clean container. Avoid red meat for 48h prior.'),

-- Radiology & Non-Invasive Cardiac
(17, 'Digital Chest X-Ray (PA View)', 'High-resolution imaging of lungs, heart contour, ribs, and thoracic cavity.', 450.00, 'Remove all metal jewelry and wear cotton gown.'),
(18, '12-Lead Electrocardiogram (ECG)', 'Records electrical rhythm and conductivity of the heart in resting state.', 350.00, 'Relax comfortably. No special preparation required.'),
(19, '2D Echocardiography with Color Doppler', 'Ultrasound imaging of heart chambers, valves, and cardiac ejection fraction.', 2200.00, 'No fasting required. Wear comfortable two-piece clothing.'),
(20, 'Treadmill Stress Test (TMT)', 'Assesses cardiac performance, ischemic ST-changes, and exercise capacity under exertion.', 1800.00, 'Wear sports shoes. Light meal 2 hours prior; avoid caffeine.'),

-- Ultrasound & Advanced Imaging
(21, 'USG Whole Abdomen & Pelvis', 'High-resolution sonography of liver, gallbladder, kidneys, spleen, pancreas, bladder.', 1500.00, 'Fasting for 6 hours; full bladder required (drink 1 litre water 1 hour prior).'),
(22, 'Color Doppler Ultrasound (Lower Limbs)', 'Assesses deep vein thrombosis (DVT), arterial insufficiency, and varicose veins.', 2800.00, 'No special preparation needed.'),
(23, 'HRCT Chest (High-Resolution CT Scan)', 'Thin-slice CT scan for pulmonary fibrosis, pneumonia, nodules, and chronic cough.', 3500.00, 'Fast for 4 hours if IV contrast is requested.'),
(24, 'MRI Brain with Contrast', 'Advanced magnetic resonance imaging for neurological disorders, stroke, and tumors.', 6500.00, 'Remove all metallic objects. Inform staff of pacemakers or metal implants.'),

-- Specialized Screenings
(25, 'DEXA Bone Mineral Densitometry (Dual Site)', 'Evaluates bone mass density for osteoporosis and fracture risk at spine and hip.', 2500.00, 'Avoid calcium supplements for 24 hours prior to scan.'),
(26, 'Pulmonary Function Test (PFT / Spirometry)', 'Measures lung capacity and airflow obstruction for asthma and COPD.', 1000.00, 'Avoid bronchodilator inhalers for 4 hours prior if advised by doctor.'),
(27, 'Pap Smear (Liquid Based Cytology - LBC)', 'Cervical cancer screening for precancerous cellular changes and HPV risk.', 900.00, 'Schedule 10 to 20 days after start of menstrual cycle.'),
(28, 'Bilateral Digital Mammography', 'Breast cancer screening for microcalcifications and palpable lumps.', 2000.00, 'Do not apply deodorants, powders, or lotions on underarms/chest before exam.'),
(29, 'Total Prostate Specific Antigen (Total PSA)', 'Blood marker screening for prostate enlargement and prostate cancer.', 800.00, 'Avoid ejaculation or heavy cycling for 48 hours prior to blood draw.'),
(30, 'Comprehensive Allergy Profile (60 Food & Inhalant Allergens)', 'Detects IgE antibodies against 60 common allergens (dust, pollen, foods, molds).', 4500.00, 'Antihistamine medications should be stopped 3 to 5 days prior under doctor advice.')
ON CONFLICT (test_id) DO UPDATE SET
  test_name = EXCLUDED.test_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  preparation = EXCLUDED.preparation;

SELECT setval('lab_tests_test_id_seq', (SELECT MAX(test_id) FROM lab_tests));
