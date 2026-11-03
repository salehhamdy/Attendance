# Sharm Photographers Attendance System - Project Documentation

## 1. Modular Monolith Architecture
The frontend is architected as a **Modular Monolith**, decomposing the application into bounded business domains while preserving a single deployable artifact. This ensures high cohesion within domains, low coupling between modules, and clean extensibility.

### Architecture Overview
```text
frontend/src/
├── modules/
│   ├── auth/                               # [Bounded Context] User identity & session
│   │   ├── context/AuthContext.jsx         # Context provider for JWT tokens & roles
│   │   ├── screens/LoginScreen.jsx         # Login screen
│   │   ├── screens/LoginScreen.test.jsx
│   │   ├── auth.test.jsx
│   │   └── index.js                        # Module Public API
│   ├── attendance/                         # [Bounded Context] Geofenced check-in
│   │   ├── components/CheckInModal.jsx     # Leaflet spatial map & proximity badge
│   │   ├── components/CheckInModal.test.jsx
│   │   ├── services/geofence.js            # Work zone definitions & spatial calculations
│   │   └── index.js                        # Module Public API
│   ├── ledger/                             # [Bounded Context] Attendance points & penalties
│   │   ├── screens/EmployeeDashboard.jsx   # Metrics, 30-pt progress bar, dynamic penalty calculations
│   │   ├── screens/EmployeeDashboard.test.jsx
│   │   └── index.js                        # Module Public API
│   ├── rewards/                            # [Bounded Context] Milestone cash rewards
│   │   ├── components/RewardModal.jsx      # InstaPay & Vodafone Cash claim modal
│   │   ├── components/RewardModal.test.jsx
│   │   └── index.js                        # Module Public API
│   ├── leave/                              # [Bounded Context] Absence waiver requests
│   │   ├── screens/LeaveManagement.jsx     # Leave request form & history table
│   │   ├── screens/LeaveManagement.test.jsx
│   │   └── index.js                        # Module Public API
│   └── owner/                              # [Bounded Context] Administrative governance & policy
│       ├── screens/OwnerDashboard.jsx      # Roster management, policy config, points adjustment, approvals
│       ├── screens/OwnerDashboard.test.jsx
│       └── index.js                        # Module Public API
├── shared/                                 # Shared Kernel
│   ├── ui/                                 # UI Primitives (Card, Button, Toggle, Modal, Badge, StatCard)
│   ├── layout/                             # Shell Layout, Sidebar, TopHeader
│   ├── api/                                # HTTP Client, Mock Engine, Token Storage
│   └── utils/                              # Shared Utilities (Haversine Distance)
├── App.jsx                                 # Module Route Integration
├── main.jsx                                # Application Entry Point
├── setupTests.js                           # Test Environment Setup
└── styles.css                              # Design Tokens & Keyframe Animations
```

---

## 2. Module Boundaries & Responsibilities

### `modules/auth`
- **Responsibility:** Manages credentials authentication, JWT token storage, decoding sub/role claims, and session termination.
- **Exports:** `AuthProvider`, `useAuth`, `LoginScreen`.

### `modules/attendance`
- **Responsibility:** Spatial geofence validation for Rixos Radamis (`27.9158, 34.33`, 300m radius), distance calculations, GPS error handling, and interactive Leaflet map rendering.
- **Exports:** `CheckInModal`, `WORK_ZONE`, `getDistanceMeters`.

### `modules/ledger`
- **Responsibility:** Tracks Green Points (early rewards), Red Penalties (late arrival deduction), and Black Penalties (absence deduction). Recalculates deductions dynamically based on owner penalty values (`red_penalty_egp`, `black_penalty_egp`). Encapsulates 1-to-1 red cancellation and 5-to-1 black cancellation logic.
- **Exports:** `EmployeeDashboard`.

### `modules/rewards`
- **Responsibility:** Handles 30-point green milestone requests, payout method selection (InstaPay or Vodafone Cash), and financial valuation (40 USD / 2,200 EGP).
- **Exports:** `RewardModal`.

### `modules/leave`
- **Responsibility:** Provides scheduling for planned absences, date range constraint validation (`end_date >= start_date`), and approval status tracking to waive severe Black penalties.
- **Exports:** `LeaveManagement`.

### `modules/owner`
- **Responsibility:** Master oversight panel for resort owners:
  - **Penalty Rate Control:** Dynamically configure Red Penalty value (EGP) and Black Penalty value (EGP).
  - **Arrival Time Control:** Dynamically configure early arrival window (`early_window_start`, `early_window_end`), on-time deadline (`normal_window_end`), and severe delay cutoff (`late_window_end`).
  - **User Roster Management:** Add new photographer/owner accounts and remove existing users.
  - **Auditing & Approvals:** Manual point adjustments with mandatory justification, leave request approvals, and reward payout authorizations.
- **Exports:** `OwnerDashboard`.

### `shared/` (Shared Kernel)
- `shared/ui`: Reusable design system primitives following atomic UI guidelines.
- `shared/layout`: Persistent sidebar navigation, top header, and role-based route protection.
- `shared/api`: Centralized API client with automatic token attachment, 401 interception, and `VITE_MOCK` simulation with dynamic settings and user management.
- `shared/utils`: Geo-spatial calculations (Haversine formula).

---

## 3. Extended Owner API Contract (Base: `/api`)
| Method | Endpoint | Description | Request Body / Params | Role |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/owner/settings` | Retrieve active penalty amounts and arrival time windows | — | Owner |
| `POST` | `/owner/settings` | Update penalty amounts (EGP) and arrival shift windows | `{ red_penalty_egp, black_penalty_egp, early_window_start, early_window_end, normal_window_end, late_window_end }` | Owner |
| `POST` | `/owner/users` | Add new user account | `{ name, username, role }` | Owner |
| `DELETE` | `/owner/users/:id` | Remove user account from system | — | Owner |
| `GET` | `/owner/users` | List all photographers, points, and pending queues | — | Owner |
| `POST` | `/owner/adjust` | Manually adjust an employee's point balance | `{ user_id, color, delta, reason }` | Owner |
| `POST` | `/owner/leave/:id/approve` | Approve leave request & waive penalties | — | Owner |
| `POST` | `/owner/leave/:id/reject` | Reject leave request | — | Owner |
| `POST` | `/owner/rewards/:id/approve` | Approve milestone cash payout | — | Owner |

---

## 4. Quality Assurance & Verification
- **Test Suite Execution:** 53 tests across 10 modular test suites in Vitest:
  - `src/modules/auth/auth.test.jsx`: 3 tests
  - `src/modules/auth/screens/LoginScreen.test.jsx`: 2 tests
  - `src/shared/ui/ui.test.jsx`: 10 tests
  - `src/shared/layout/Layout.test.jsx`: 3 tests
  - `src/modules/attendance/components/CheckInModal.test.jsx`: 4 tests
  - `src/modules/rewards/components/RewardModal.test.jsx`: 4 tests
  - `src/modules/ledger/screens/EmployeeDashboard.test.jsx`: 4 tests
  - `src/modules/leave/screens/LeaveManagement.test.jsx`: 4 tests
  - `src/modules/owner/screens/OwnerDashboard.test.jsx`: 7 tests (includes penalty settings, arrival windows, user addition, user removal)
  - `src/shared/api/mock.test.js`: 12 tests (includes dynamic penalties, window configurations, user CRUD)
  - **Result: 53 passed / 53 tests (100% success rate)**
- **Static Analysis:** ESLint 9.x executed on `src/` with zero warnings or errors.
- **Production Build:** Vite 5.4.x bundle completed cleanly in `dist/`.
