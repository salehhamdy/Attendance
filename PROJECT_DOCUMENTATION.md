# Universal Attendance System - Project Documentation

## 1. Modular Monolith Architecture
The frontend is architected as a **Modular Monolith**, decomposing the application into bounded business domains while preserving a single deployable artifact. This ensures high cohesion within domains, low coupling between modules, clean extensibility, and domain-driven design.

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
│   ├── attendance/                         # [Bounded Context] Multi-branch & resort check-in
│   │   ├── components/CheckInModal.jsx     # Leaflet spatial map, multi-branch circles, proximity status
│   │   ├── components/CheckInModal.test.jsx
│   │   ├── services/geofence.js            # Branch definitions & spatial Haversine algorithms
│   │   └── index.js                        # Module Public API
│   ├── ledger/                             # [Bounded Context] Points, deductions, calendar & ledger
│   │   ├── screens/EmployeeDashboard.jsx   # Metrics, milestone progress, attendance calendar, points history
│   │   ├── screens/EmployeeDashboard.test.jsx
│   │   └── index.js                        # Module Public API
│   ├── rewards/                            # [Bounded Context] Milestone cash rewards
│   │   ├── components/RewardModal.jsx      # InstaPay, Vodafone Cash, Bank & Cash payout modal
│   │   ├── components/RewardModal.test.jsx
│   │   └── index.js                        # Module Public API
│   ├── leave/                              # [Bounded Context] Absence waiver requests
│   │   ├── screens/LeaveManagement.jsx     # Leave request form & history table
│   │   ├── screens/LeaveManagement.test.jsx
│   │   └── index.js                        # Module Public API
│   └── owner/                              # [Bounded Context] Governance, resort geofences, payroll & security
│       ├── screens/OwnerDashboard.jsx      # Resort presets, payroll CSV export, password reset, policy, roster
│       ├── screens/OwnerDashboard.test.jsx
│       └── index.js                        # Module Public API
├── shared/                                 # Shared Kernel
│   ├── ui/                                 # UI Primitives (Card, Button, Toggle, Modal, Badge, StatCard)
│   ├── layout/                             # Shell Layout, Sidebar, TopHeader & Dark Mode Toggle
│   ├── api/                                # HTTP Client, Mock Engine, Token Storage
│   └── utils/                              # Shared Utilities (Haversine Distance & Nearest Branch Detection)
├── App.jsx                                 # Module Route Integration
├── main.jsx                                # Application Entry Point
├── setupTests.js                           # Test Environment Setup
└── styles.css                              # Design Tokens, Dark Theme & Calendar Animations
```

---

## 2. Module Boundaries & Responsibilities

### `modules/auth`
- **Responsibility:** Manages credentials authentication, JWT token storage, decoding sub/role claims, and session termination.
- **Exports:** `AuthProvider`, `useAuth`, `LoginScreen`.

### `modules/attendance`
- **Responsibility:** Multi-branch spatial geofence validation, distance calculations, GPS error handling, device geolocation capture, and interactive Leaflet map rendering with multi-branch overlays. Also handles remote mode bypass when enabled.
- **Exports:** `CheckInModal`, `WORK_ZONE`, `DEFAULT_ZONE`, `findNearestBranch`, `getDistanceMeters`.

### `modules/ledger`
- **Responsibility:**
  - Tracks Green Points (early rewards), Red Penalties (late arrival deduction), and Black Penalties (absence deduction).
  - Recalculates deductions dynamically based on owner penalty values and operating currency.
  - **Points History Ledger:** Chronological audit trail of point movements, penalties, cancellations, and adjustments.
  - **Monthly Attendance Calendar:** Visual daily grid displaying status badges (Early, On-Time, Late, Absent, Leave, Day Off), arrival timestamps, and monthly attendance statistics.
  - Encapsulates 1-to-1 red cancellation and 5-to-1 black cancellation logic.
- **Exports:** `EmployeeDashboard`.

### `modules/rewards`
- **Responsibility:** Handles milestone requests based on configurable reward thresholds, payout method selection (InstaPay, Vodafone Cash, Bank Transfer, Cash), and customizable financial valuation.
- **Exports:** `RewardModal`.

### `modules/leave`
- **Responsibility:** Provides scheduling for planned absences, date range constraint validation (`end_date >= start_date`), and approval status tracking to waive severe Black penalties.
- **Exports:** `LeaveManagement`.

### `modules/owner`
- **Responsibility:** Master oversight panel for business owners:
  - **Multiple Resort Geofencing & Presets:** Quick-fill presets for premier resorts (Rixos Radamis, Rixos Seagate, Pickalbatros, Four Seasons, Steigenberger) and custom GPS branch management.
  - **Payroll & Compensation Export:** Employee compensation overview and one-click formatted CSV download for Excel and accounting.
  - **Direct Password Reset:** Instant password updates for photographers and staff directly from the user roster.
  - **Universal Business Profile:** Configurable company name, currency code (`EGP`, `USD`, `SAR`, `AED`, `EUR`, `GBP`), reward threshold, and reward valuation.
  - **Remote Attendance Policy:** Toggle worldwide check-in mode.
  - **Penalty Rate Control:** Dynamically configure Red Penalty value and Black Penalty value in active currency.
  - **Arrival Time Control:** Dynamically configure early arrival window, on-time deadline, and severe delay cutoff.
  - **User Roster Management:** Add new staff/owner accounts and remove existing users.
  - **Auditing & Approvals:** Manual point adjustments with mandatory justification, leave request approvals, and reward payout authorizations.
- **Exports:** `OwnerDashboard`, `RESORT_PRESETS`.

### `shared/` (Shared Kernel)
- `shared/ui`: Reusable design system primitives following atomic UI guidelines.
- `shared/layout`: Persistent sidebar navigation, top header, dark mode toggle for dimly lit editing studios, and role-based route protection.
- `shared/api`: Centralized API client with automatic token attachment, 401 interception, and `VITE_MOCK` simulation with dynamic company profile, multi-branch geofencing, password reset, and payroll CSV generation.
- `shared/utils`: Geo-spatial calculations (`haversineDistance`, `findNearestBranch`).

---

## 3. Extended Owner & Business API Contract (Base: `/api`)
| Method | Endpoint | Description | Request Body / Params | Role |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/owner/company` | Retrieve company profile, currency, branches, and remote mode | — | Owner |
| `POST` | `/owner/company` | Update business profile, currency, reward settings, and remote mode | `{ company_name, currency, reward_threshold, reward_amount, allow_remote }` | Owner |
| `POST` | `/owner/branches` | Add a new workplace branch anywhere in the world | `{ name, lat, lng, radius }` | Owner |
| `DELETE` | `/owner/branches/:id` | Remove a workplace branch | — | Owner |
| `POST` | `/owner/users/:id/reset-password` | Reset staff member password directly | `{ new_password }` | Owner |
| `GET` | `/owner/payroll/export` | Generate and export payroll CSV report | — | Owner |
| `GET` | `/me/history` | Retrieve employee points history ledger | — | Employee / Owner |
| `GET` | `/me/calendar` | Retrieve employee monthly attendance calendar | `?year=YYYY&month=MM` | Employee / Owner |
| `GET` | `/owner/settings` | Retrieve active penalty amounts and arrival time windows | — | Owner |
| `POST` | `/owner/settings` | Update penalty amounts and arrival shift windows | `{ red_penalty_egp, black_penalty_egp, early_window_start, early_window_end, normal_window_end, late_window_end }` | Owner |
| `POST` | `/owner/users` | Add new user account | `{ name, username, role }` | Owner |
| `DELETE` | `/owner/users/:id` | Remove user account from system | — | Owner |
| `GET` | `/owner/users` | List all staff, points, and pending queues | — | Owner |
| `POST` | `/owner/adjust` | Manually adjust an employee's point balance | `{ user_id, color, delta, reason }` | Owner |
| `POST` | `/owner/leave/:id/approve` | Approve leave request & waive penalties | — | Owner |
| `POST` | `/owner/leave/:id/reject` | Reject leave request | — | Owner |
| `POST` | `/owner/rewards/:id/approve` | Approve milestone cash payout | — | Owner |

---

## 4. Quality Assurance & Verification
- **Test Suite Execution:** 68 tests across 10 modular test suites in Vitest:
  - `src/modules/auth/auth.test.jsx`: 3 tests
  - `src/modules/auth/screens/LoginScreen.test.jsx`: 2 tests
  - `src/shared/ui/ui.test.jsx`: 10 tests
  - `src/shared/layout/Layout.test.jsx`: 4 tests (includes dark mode toggle verification)
  - `src/modules/attendance/components/CheckInModal.test.jsx`: 4 tests
  - `src/modules/rewards/components/RewardModal.test.jsx`: 4 tests
  - `src/modules/ledger/screens/EmployeeDashboard.test.jsx`: 6 tests (includes monthly attendance calendar & points history ledger)
  - `src/modules/leave/screens/LeaveManagement.test.jsx`: 4 tests
  - `src/modules/owner/screens/OwnerDashboard.test.jsx`: 13 tests (includes resort presets, payroll export, password reset, company profile, multi-branch CRUD, penalty settings, arrival windows, user addition/removal)
  - `src/shared/api/mock.test.js`: 18 tests (includes password reset, payroll CSV export, points history, calendar retrieval, multi-branch geofencing, remote check-in, dynamic penalties, user CRUD)
  - **Result: 68 passed / 68 tests (100% success rate)**
- **Static Analysis:** ESLint executed on `src/` with zero warnings and zero errors.
- **Production Build:** Vite production bundle completed cleanly in `dist/`.
