# Sharm Photographers Attendance System - Project Documentation

## 1. System Overview & Architecture
The Sharm Photographers Attendance System is a location-validated, gamified attendance platform designed for professional photography teams in Sharm El-Sheikh resort properties (e.g. Rixos Radamis).

### Tech Stack
- **Frontend Architecture:** Single Page Application (SPA) built with React 18, Vite, React Router 6, and Leaflet for geospatial visualization.
- **Styling & Motion:** Clean, card-based administrative UI following section 1-3 of the reverse-engineering specification. Includes 500ms ease-out progress animations, 250ms spring/ease modal popups, and 150ms linear toggle switches.
- **Mock Layer (`VITE_MOCK=1`):** Complete stateful in-memory mock engine in `frontend/src/mock.js` supporting offline/standalone execution, check-ins, leave submissions, point trading, and owner actions.
- **Backend (Planned):** FastAPI, PostgreSQL with append-only point ledger, JWT authentication (Employee/Owner RBAC), and geospatial point-in-polygon validation.

---

## 2. Component Hierarchy (Frontend)
```text
App
├── AuthProvider (Global Session State & JWT Role Management)
├── BrowserRouter
│   ├── Login (/login)
│   └── Protected Layout (Role-aware shell with Sidebar & TopHeader)
│       ├── Employee Routes
│       │   ├── EmployeeDashboard (/)
│       │   │   ├── StatCard (Green, Red, Black variants with dynamic EGP calculations)
│       │   │   ├── Green Reward Progress Card (Animated 30-pt bar with threshold trigger)
│       │   │   ├── Monthly Attendance Deductions Card (Point cancellation toggles)
│       │   │   ├── CheckInModal (Leaflet map, geofence circle, proximity status badge)
│       │   │   └── RewardModal (InstaPay / Vodafone Cash method selector & number input)
│       │   └── LeaveManagement (/leave)
│       │       ├── RequestForm (Date range constraint validation & audit reason)
│       │       └── RequestHistoryTable (Status badges: approved, rejected, pending)
│       └── Owner Routes
│           └── OwnerDashboard (/owner)
│               ├── Overview StatCards (Total Employees, Pending Leaves, Pending Rewards)
│               ├── EmployeeList Table (Live Green/Red/Black balances & EGP deductions)
│               ├── PointAdjustmentForm (Manual green bonus or red/black penalty edits)
│               ├── LeaveApprovalList (Approve with penalty waiver / Reject)
│               └── RewardApprovalList (Approve 40 USD / 2,200 EGP disbursement)
└── Shared UI Kit (`frontend/src/components/ui.jsx`)
    ├── Card
    ├── Button (Primary, Ghost variants)
    ├── ToggleSwitch (Linear animation, accessible ARIA switch)
    ├── StatusBadge (Semantic status styling)
    ├── Modal (Accessible dialog with fade/pop animations)
    └── StatCard (Metric card with semantic border indicators)
```

---

## 3. UI/UX & Design Tokens
- **Primary Color:** Muted Indigo (`#6366f1` / `#4f46e5`) used for main interactive buttons.
- **Semantic Colors:**
  - **Green (`#16a34a`):** Positive actions, early check-in rewards (07:00 – 08:00 AM), reward milestone progress.
  - **Red (`#dc2626`):** Late arrival penalty (10:00 – 12:00 PM), active financial deductions (250 EGP).
  - **Black (`#111827`):** Severe absence delay (post 12:00 PM), full-day penalty (1,000 EGP).
- **Cards & Elevation:** 12px border radius, subtle drop shadows (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1)`).
- **Responsive Layout:** Sidebar stacks horizontally into an adaptive navigation bar on viewports under 768px; data tables enable horizontal touch-scrolling.

---

## 4. Frontend API Contract (Base: `/api`)
| Method | Endpoint | Description | Request Body / Params | Role |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Authenticate user & issue JWT | `{ username, password }` | Public |
| `GET` | `/me/summary` | Retrieve current point balances & deductions | — | Employee |
| `POST` | `/checkin` | Validate spatial coords & record attendance | `{ lat, lng }` | Employee |
| `POST` | `/points/cancel-red` | Redeem 1 Green point to cancel 1 Red penalty | — | Employee |
| `POST` | `/points/cancel-black` | Redeem 5 Green points to cancel 1 Black penalty | — | Employee |
| `POST` | `/leave` | Submit scheduled leave request | `{ start_date, end_date, reason }` | Employee |
| `GET` | `/leave` | Fetch photographer's leave request history | — | Employee |
| `POST` | `/rewards` | Submit 30-pt milestone reward claim | `{ payout_method, number }` | Employee |
| `GET` | `/owner/users` | List all photographers, points, and pending queues | — | Owner |
| `POST` | `/owner/adjust` | Manually adjust an employee's point balance | `{ user_id, color, delta, reason }` | Owner |
| `POST` | `/owner/leave/:id/approve` | Approve leave request & waive penalties | — | Owner |
| `POST` | `/owner/leave/:id/reject` | Reject leave request | — | Owner |
| `POST` | `/owner/rewards/:id/approve` | Approve milestone cash payout | — | Owner |

---

## 5. Quality Assurance & Verification Results
- **Full Suite Execution:** Vitest 2.1.9 across all 10 component and domain test suites:
  - `src/auth.test.jsx`: 3 passed
  - `src/components/ui.test.jsx`: 10 passed
  - `src/components/CheckInModal.test.jsx`: 4 passed
  - `src/components/RewardModal.test.jsx`: 4 passed
  - `src/components/Layout.test.jsx`: 3 passed
  - `src/screens/Login.test.jsx`: 2 passed
  - `src/screens/EmployeeDashboard.test.jsx`: 4 passed
  - `src/screens/LeaveManagement.test.jsx`: 4 passed
  - `src/screens/OwnerDashboard.test.jsx`: 4 passed
  - `src/mock.test.js`: 9 passed
  - **Total: 47 passed / 47 tests (100% success rate)**
- **Static Analysis:** ESLint 9.x executed on `src/` with zero warnings or errors.
- **Production Compilation:** Vite 5.4.x bundle completed cleanly in `dist/`.
