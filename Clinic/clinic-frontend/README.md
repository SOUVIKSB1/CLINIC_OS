# ClinicOS Portals

A React application with separate patient and hospital authority experiences. Patients can register, maintain their profile, request appointments and diagnostic tests, and view bills. Authority users can approve requests, manage records and directories, and issue bills.

## Run Locally

Start the Oracle-backed API first:

```bash
cd ../clinic_backend
npm install
npm start
```

The backend uses the Oracle settings in `clinic_backend/.env`, listens on port `5001` by default, and must have the portal database migration and initial authority account configured as described in its README.

Then start this Vite app:

```bash
npm install
npm run dev
```

In development, Vite proxies `/api` to `http://127.0.0.1:5001`. For a deployment where the frontend and API have different origins, set `VITE_API_URL` to the API prefix, for example `https://api.example.com/api`, before building.

## Checks

```bash
npm run lint
npm run build
```
