# ClinicOS API

Express API for the ClinicOS patient portal and hospital authority console, backed by Oracle Database.

## Configuration

Create or update `.env` with:

```dotenv
DB_USER=your_user
DB_PASSWORD=your_password
DB_CONNECT_STRING=your_connect_string
WALLET_LOCATION=/path/to/wallet
PORT=5001
JWT_SECRET=replace_with_a_long_random_secret
ADMIN_NAME=Hospital Authority
ADMIN_EMAIL=admin@clinic.com
ADMIN_PASSWORD=choose_a_secure_password
```

For a new database, create tables from the project root in this order:

1. `sequence.sql`
2. `seq.sql`
3. `Create_dept.sql`
4. `Create_Doc.sql`
5. `Create_pat.sql`
6. `Create_appt.sql`
7. `user.sql`
8. `test.sql`
9. `bill.sql`

For a database that already contains earlier ClinicOS tables, run the in-place migration. It detects existing draft account/test/bill tables, adds required portal fields and constraints, and retains existing records:

```bash
npm run migrate-portal
```

`portal_upgrade.sql` is provided for databases that have only the original four core tables and do not yet contain `USERS`, `LAB_TESTS`, `PATIENT_TESTS`, or `BILLS`.

After the account table exists, create or reset the hospital authority account credentials using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`:

```bash
npm run create-admin
```

Patient accounts are created directly from the public registration form.

## Run

```bash
npm install
npm start
```

The health endpoint is `GET /api/health`. Public routes expose departments and doctors for discovery; patient and authority actions use JWT-authenticated role permissions.

## Checks

```bash
npm test
```
