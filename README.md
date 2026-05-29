<div align="center">

<img src="./banner.png" alt="ClinicOS Logo" width="120"/>

# CLINIC_OS

### Smart Clinic Appointment System

Modern healthcare management platform built with React, Node.js & Oracle Database.

</div>

<div align="center">

![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/API-Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Oracle](https://img.shields.io/badge/Database-Oracle-F80000?style=for-the-badge&logo=oracle&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

*A comprehensive full-stack healthcare management platform connecting patients, doctors, and hospital authorities through a unified digital ecosystem.*

</div>

---

## ✨ Overview

**ClinicOS** is a modern clinic management solution designed to streamline healthcare operations. The platform provides dedicated portals for **Patients**, **Doctors**, and **Administrators**, enabling seamless appointment scheduling, health tracking, diagnostics management, billing, and clinical workflow automation.

Additionally, the system includes an **AI-powered symptom guidance module** and a **specialist directory** to help patients find the right medical department quickly.

---

## 🚀 Key Features

### 👨‍⚕️ Patient Portal

| Feature | Description |
|----------|-------------|
| 🔐 Secure Authentication | Register and log in securely using JWT-based authentication |
| 📅 Appointment Scheduling | Book, view, and cancel appointments with specialists |
| 🧪 Diagnostic Tests | Schedule lab tests and access reports online |
| 💳 Billing & Payments | View invoices and make secure mock payments |
| 📈 Health Tracker | Monitor BP, blood sugar, weight, and heart rate trends |
| 💊 Medication Management | Track prescribed medicines and dosage schedules |
| 🔔 Notifications | Receive reminders for appointments, bills, and reports |
| 🤖 Symptom Guide | AI-assisted department recommendation based on symptoms |

---

### 🏥 Authority Portal

#### 👑 Administrator Dashboard

- Manage patient records
- View complete activity timelines
- Manage doctors and departments
- Review appointment requests
- Approve diagnostic test requests
- Generate and manage bills
- Monitor payment status
- Create and manage staff accounts

#### 👨‍⚕️ Doctor Console

- Manage appointments
- View patient histories
- Access shared diagnostic reports
- Generate prescriptions
- Monitor ongoing treatments
- Update consultation records

---

## 🛠 Tech Stack

| Layer | Technologies |
|---------|-------------|
| 🎨 Frontend | React, Vite |
| ⚙ Backend | Node.js, Express.js |
| 🗄 Database | Oracle Database |
| 🔒 Authentication | JWT, bcrypt |
| 🌐 API Layer | REST APIs |
| 🛡 Security | Helmet, CORS |

---

## 📂 Project Structure

```bash
ClinicOS/
│
├── clinic-frontend/
│   └── React + Vite Application
│
├── clinic_backend/
│   └── Node.js + Express API
│
└── sql/
    └── Database Scripts & Migrations
```

---

## 📋 Prerequisites

Before getting started, ensure you have:

- Node.js
- npm
- Oracle Database
- Oracle Wallet Credentials

---

# ⚙ Backend Setup

### Navigate to Backend

```bash
cd clinic_backend
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file inside `clinic_backend`.

```env
# Oracle Database Credentials
DB_USER=your_oracle_db_user
DB_PASSWORD=your_oracle_db_password
DB_CONNECT_STRING=your_db_connect_string
WALLET_LOCATION=/path/to/your/oracle_wallet

# Application Settings
PORT=5001
JWT_SECRET=your_super_secret_jwt_key_that_is_very_long

# Initial Admin Account
ADMIN_NAME=Hospital Authority
ADMIN_EMAIL=admin@clinic.com
ADMIN_PASSWORD=your_secure_admin_password
```

---

### Database Schema Setup

#### Fresh Installation

Run the following SQL scripts in order:

```text
1. sequence.sql
2. seq.sql
3. Create_dept.sql
4. Create_Doc.sql
5. Create_pat.sql
6. Create_appt.sql
7. user.sql
8. test.sql
9. bill.sql
10. pres.sql
11. payment.sql
12. notification.sql
13. audit.sql
```

#### Existing Database Migration

```bash
npm run migrate-portal
```

---

### Create Initial Administrator

```bash
npm run create-admin
```

---

## 🎨 Frontend Setup

### Navigate to Frontend

```bash
cd clinic-frontend
```

### Install Dependencies

```bash
npm install
```

---

## ▶ Running the Application

### Start Backend Server

```bash
cd clinic_backend
npm start
```

Backend runs on:

```text
http://localhost:5001
```

---

### Start Frontend Server

```bash
cd clinic-frontend
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

API requests to `/api` are automatically proxied to the backend during development.

---

## 🔒 Security Features

- JWT Authentication
- Password Hashing using bcrypt
- Protected Routes
- Secure API Communication
- Helmet Security Middleware
- CORS Protection
- Role-Based Access Control

---

## 📊 Core Modules

```text
✔ Authentication System
✔ Patient Management
✔ Appointment Scheduling
✔ Doctor Management
✔ Department Management
✔ Diagnostic Testing
✔ Billing & Payments
✔ Notifications
✔ Health Tracking
✔ Prescription Management
✔ Audit Logging
✔ AI Symptom Assistance
```

---

## 🌟 Future Enhancements

- Telemedicine Support
- Video Consultations
- Online Payment Gateway Integration
- AI Disease Prediction
- Mobile Application
- Electronic Health Records (EHR)
- Insurance Claim Processing

---

<div align="center">

### 💙 Built to simplify healthcare operations through technology

**ClinicOS • Smart Healthcare Management Platform**

</div>
