# ClinicOS Backend API

Express API for the ClinicOS patient portal, doctor console, and hospital authority administration, backed by PostgreSQL (compatible with free-tier cloud platforms like Neon, Supabase, Render, Railway, or local PostgreSQL).

## 🚀 Quick Setup

### 1. Configure Database Connection

Create or update `.env` in `clinic_backend/`:

```dotenv
# Option A: Cloud PostgreSQL (Recommended - e.g. Neon / Supabase / Render)
DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require

# Option B: Local PostgreSQL
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=postgres
# DB_PASSWORD=postgres
# DB_NAME=clinicos

# Server & Auth Settings
PORT=5001
JWT_SECRET=your_super_secret_jwt_key_that_is_very_long

# Initial Administrator Account
ADMIN_NAME=Hospital Authority
ADMIN_EMAIL=admin@clinic.com
ADMIN_PASSWORD=Admin@12345
```

### 2. Auto-Initialization

When you start the server, ClinicOS **automatically creates all required tables and seeds default reference data** (departments, doctors, lab tests, and administrator account) if they do not already exist!

Alternatively, you can manually run:
```bash
# Run schema migration & vitals seeding
npm run migrate-portal

# Create or reset administrator account
npm run create-admin
```

### 3. Run Server

```bash
npm install
npm start
# or development mode:
npm run dev
```

The API will be running at `http://localhost:5001`.
Health check endpoint: `GET http://localhost:5001/api/health`

### 4. Verification

```bash
npm test
```
