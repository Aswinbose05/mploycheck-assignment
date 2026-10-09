# MPloyChek - Enterprise Background Verification Platform (SPA)

> Single Page Application built with **Angular 17+**, **TypeScript**, **Node.js (Express)**, **RxJS**, and a **Repository Storage Layer (XML Database with DynamoDB / NoSQL schema compatibility)**.

---

## 📋 Project Summary

This application is an end-to-end background verification and candidate credentials management portal designed to demonstrate core Angular architecture, role-based access control, asynchronous observable data streaming with simulated cloud latency, and modular full-stack engineering.

---

## 🌟 Key Features & Requirements Matrix

| Requirement | Implementation Details | Status |
| :--- | :--- | :---: |
| **Angular 12+ / TypeScript** | Built on Angular 17.3 with strict TypeScript typing, modern standalone components, and clean modular service layer. | ✅ Complete |
| **Login Page** | User ID, Password, and Role selection (`General User` vs `Admin`). Includes Form validation and Quick Fill demo presets. | ✅ Complete |
| **Role-Based Authentication** | Simulated session token management via `AuthService` and local state synchronization. | ✅ Complete |
| **Logged-In User Profile** | Displays user avatar, full name, user ID, department, active role badge, and session status indicator. | ✅ Complete |
| **Records Table with Access Levels** | Fetches candidate verification records (EPFO, degree credentials, court records, blockchain hashes). Filters and masks sensitive risk assessments dynamically based on user role. | ✅ Complete |
| **Admin User Management** | Unlocks dedicated database management panel for Admin users with full CRUD: view all XML DB users, add new user, edit user, delete user, and toggle active status. | ✅ Complete |
| **Async Latency Simulation** | Implemented backend `?delay=ms` query parameter middleware and frontend interactive latency controller (0ms, 800ms, 1500ms, 3000ms) with live RxJS in-flight millisecond counter and skeleton loading animations. | ✅ Complete |
| **Modular Code Architecture** | Clean separation of concerns: `core/models`, `core/services`, `core/guards`, `shared/components`, and `features/`. | ✅ Complete |
| **Database Persistence** | XML database (`backend/data/database.xml`) with read/write synchronization using `xml2js`, structured with Document Model attributes compatible with AWS DynamoDB / MongoDB. | ✅ Complete |

---

## 🏗️ System Architecture

```
mploycheck-assignment/
├── backend/
│   ├── data/
│   │   └── database.xml           # XML persistence layer (users & records)
│   ├── delayMiddleware.js         # Asynchronous latency simulation middleware (?delay=ms)
│   ├── storage.js                 # XML repository service (CRUD operations & role filters)
│   ├── server.js                  # Express REST API (CORS, Auth, Records, User Management)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── guards/        # auth.guard.ts (Route authorization)
│   │   │   │   ├── models/        # user.model.ts, record.model.ts, auth.model.ts
│   │   │   │   └── services/      # auth.service.ts, user.service.ts, record.service.ts, notification.service.ts
│   │   │   ├── shared/
│   │   │   │   └── components/    # navbar, toast notification system
│   │   │   ├── features/
│   │   │   │   ├── login/         # Reactive login form with role switcher & presets
│   │   │   │   └── dashboard/     # User profile, latency controller, records table, admin CRUD
│   │   │   ├── app.config.ts      # Angular application config (HttpClient, Router)
│   │   │   ├── app.routes.ts      # Client-side routing configuration
│   │   │   └── app.component.*    # Root layout component
│   │   ├── environments/          # environment.ts (API URL configuration)
│   │   └── styles.css             # Modern styling & theme tokens
│   ├── angular.json
│   └── package.json
│
├── package.json                   # Root orchestrator with unified scripts
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.x or v20.x
- **npm**: v9.x or higher

### 1. Installation
Clone the repository and install all dependencies:

```bash
# Install root, backend, and frontend dependencies
npm run install:all
```

*(Alternatively, run `npm install` inside both `backend` and `frontend` folders)*

### 2. Start Both Backend & Frontend
Run the single root command:

```bash
npm start
```

This starts:
- **Backend API**: `http://localhost:3000`
- **Angular SPA Frontend**: `http://localhost:4200`

Open your browser and navigate to:
👉 **`http://localhost:4200`**

---

## 🔑 Demo Credentials

| Role | User ID | Password | Description & Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full administrative access. Views all candidate records with confidential risk assessments and blockchain hashes. Manages system users (Add/Edit/Delete in XML DB). |
| **General User** | `aswin` | `user123` | Operational access. Views assigned candidate checks and general records; confidential risk matrices are restricted. |
| **General User** | `sarah` | `user123` | Alternative operational account. |

> 💡 **Tip**: Use the **"🚀 Quick Fill Demo"** buttons on the login page to populate these credentials with one click.

---

## ⚡ Asynchronous Processing & Latency Simulator

To showcase asynchronous observable processing on page load and data refresh:
1. Log in to the application.
2. In the **"Simulate API Latency"** toolbar at the top of the dashboard, choose a latency preset (e.g. `1500ms` or `3000ms`).
3. Click **"Execute API Call"**.
4. Observe the **live millisecond ticker** (`Observable In-Flight: Simulating non-blocking cloud latency... [X ms elapsed]`), animated skeleton placeholders, and completion toast showing total response duration.

### How it works under the hood:
1. Frontend makes an HTTP request: `GET /api/records?userId=aswin&role=General%20User&delay=1500`
2. Express `delayMiddleware.js` parses the `delay` parameter and awaits an asynchronous non-blocking timer before executing the route handler.
3. Angular's `RecordService` observes the HTTP response stream via RxJS `Observable`, demonstrating clean reactive state transitions without locking the browser UI thread.

---

## ☁️ Cloud & Database Architecture Rationale

### Local XML to Cloud Mapping (AWS DynamoDB / MongoDB)
The assignment requests storage as *"local xml or mongo d b or AWS Dynamo d b"*.

In this project, data is stored in `backend/data/database.xml` using an abstracted repository pattern (`storage.js`). The internal data structures directly mirror **AWS DynamoDB Single Table Design** or **MongoDB Document Models**:

```typescript
// Conceptual Cloud Entity (AWS DynamoDB Partition/Sort Key Structure)
{
  PK: "USER#USR-001",           // Partition Key
  SK: "METADATA#admin",         // Sort Key
  userId: "admin",
  role: "Admin",
  name: "Giri Venkataramanan",
  status: "Active"
}
```

Because all data access is decoupled behind the `storage.js` service layer, swapping the storage engine to an **AWS DynamoDB SDK (`@aws-sdk/client-dynamodb`)** or **Mongoose/MongoDB** requires changing only the internal database driver methods without altering any REST controllers or Angular frontend services.

---

## 🛡️ Role-Based Security Architecture

1. **Angular Client-Side Route Guards (`authGuard`)**:
   Prevents unauthenticated users from accessing `/dashboard`, automatically redirecting to `/login`.
2. **Conditional Admin UI Rendering**:
   Administrative tabs and user CRUD controls are rendered exclusively when `currentUser.role === 'Admin'`.
3. **Backend API Authorization Enforcement**:
   Even if a user tries to access `/api/users` directly via curl or Postman, the backend validates the `x-user-role` header/session role and rejects unauthorized requests with `403 Forbidden`.

---

## 💻 Tech Stack

- **Frontend**: Angular 17.3, TypeScript 5.4, RxJS 7.8, Reactive Forms, Pure Modern CSS (Flexbox & Grid, No Heavy CSS Framework Bloat)
- **Backend**: Node.js, Express 4.19, `xml2js` (XML Parser & Builder), CORS
- **Tooling**: Angular CLI, Concurrently, Git
