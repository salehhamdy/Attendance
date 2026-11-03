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
│   ├── attendance/                         # [Bounded Context] Multi-branch & remote check-in
│   │   ├── components/CheckInModal.jsx     # Leaflet spatial map, multi-branch circles, proximity status
│   │   ├── components/CheckInModal.test.jsx
│   │   ├── services/geofence.js            # Branch definitions & spatial Haversine algorithms
│   │   └── index.js                        # Module Public API
│   ├── ledger/                             # [Bounded Context] Attendance points, penalties & currency
│   │   ├── screens/EmployeeDashboard.jsx   # Metrics, milestone progress bar, dynamic currency deductions
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
│   └── owner/                              # [Bounded Context] Administrative governance, branches & policy
│       ├── screens/OwnerDashboard.jsx      # Company profile, branch management, policy, roster, approvals
│       ├── screens/OwnerDashboard.test.jsx
│       └── index.js                        # Module Public API
├── shared/                                 # Shared Kernel
│   ├── ui/                                 # UI Primitives (Card, Button, Toggle, Modal, Badge, StatCard)
│   ├── layout/                             # Shell Layout, Sidebar, TopHeader
│   ├── api/                                # HTTP Client, Mock Engine, Token Storage
│   └── utils/                              # Shared Utilities (Haversine Distance & Nearest Branch Detection)
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
- **Responsibility:** Multi-branch spatial geofence validation, distance calculations, GPS error handling, device geolocation capture, and interactive Leaflet map rendering with multi-branch overlays. Also handles remote mode bypass when enabled.
- **Exports:** `CheckInModal`, `WORK_ZONE`, `DEFAULT_ZONE`, `findNearestBranch`, `getDistanceMeters`.

### `modules/ledger`
- **Responsibility:** Tracks Green Points (early rewards), Red Penalties (late arrival deduction), and Black Penalties (absence deduction). Recalculates deductions dynamically based on owner penalty values and operating currency. Encapsulates 1-to-1 red cancellation and 5-to-1 black cancellation logic.
- **Exports:** `EmployeeDashboard`.

### `modules/rewards`
- **Responsibility:** Handles milestone requests based on configurable reward thresholds, payout method selection (InstaPay, Vodafone Cash, Bank Transfer, Cash), and customizable financial valuation.
- **Exports:** `RewardModal`.

### `modules/leave`
- **Responsibility:** Provides scheduling for planned absences, date range constraint validation (`end_date >= start_date`), and approval status tracking to waive severe Black penalties.
- **Exports:** `LeaveManagement`.

### `modules/owner`
- **Responsibility:** Master oversight panel for business owners:
  - **Universal Business Profile:** Configurable company name, currency code (`EGP`, `USD`, `SAR`, `AED`, `EUR`, `GBP`), reward threshold, and reward valuation.
  - **Multi-Branch Management:** Add physical branches anywhere in the world with latitude, longitude, and radius (with device GPS auto-location), and delete existing branches.
  - **Remote Attendance Policy:** Toggle worldwide check-in mode.
  - **Penalty Rate Control:** Dynamically configure Red Penalty value and Black Penalty value in active currency.
  - **Arrival Time Control:** Dynamically configure early arrival window, on-time deadline, and severe delay cutoff.
  - **User Roster Management:** Add new staff/owner accounts and remove existing users.
  - **Auditing & Approvals:** Manual point adjustments with mandatory justification, leave request approvals, and reward payout authorizations.
- **Exports:** `OwnerDashboard`.

### `shared/` (Shared Kernel)
- `shared/ui`: Reusable design system primitives following atomic UI guidelines.
- `shared/layout`: Persistent sidebar navigation, top header, and role-based route protection.
- `shared/api`: Centralized API client with automatic token attachment, 401 interception, and `VITE_MOCK` simulation with dynamic company profile, multi-branch geofencing, and user management.
- `shared/utils`: Geo-spatial calculations (`haversineDistance`, `findNearestBranch`).

---

## 3. Extended Owner & Business API Contract (Base: `/api`)
| Method | Endpoint | Description | Request Body / Params | Role |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/owner/company` | Retrieve company profile, currency, branches, and remote mode | — | Owner |
| `POST` | `/owner/company` | Update business profile, currency, reward settings, and remote mode | `{ company_name, currency, reward_threshold, reward_amount, allow_remote }` | Owner |
| `POST` | `/owner/branches` | Add a new workplace branch anywhere in the world | `{ name, lat, lng, radius }` | Owner |
| `DELETE` | `/owner/branches/:id` | Remove a workplace branch | — | Owner |
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
- **Test Suite Execution:** 59 tests across 10 modular test suites in Vitest:
  - `src/modules/auth/auth.test.jsx`: 3 tests
  - `src/modules/auth/screens/LoginScreen.test.jsx`: 2 tests
  - `src/shared/ui/ui.test.jsx`: 10 tests
  - `src/shared/layout/Layout.test.jsx`: 3 tests
  - `src/modules/attendance/components/CheckInModal.test.jsx`: 4 tests
  - `src/modules/rewards/components/RewardModal.test.jsx`: 4 tests
  - `src/modules/ledger/screens/EmployeeDashboard.test.jsx`: 4 tests
  - `src/modules/leave/screens/LeaveManagement.test.jsx`: 4 tests
  - `src/modules/owner/screens/OwnerDashboard.test.jsx`: 10 tests (includes company profile, currency, multi-branch CRUD, penalty settings, arrival windows, user addition, user removal)
  - `src/shared/api/mock.test.js`: 15 tests (includes dynamic company settings, multi-branch geofencing, remote check-in, dynamic penalties, window configurations, user CRUD)
  - **Result: 59 passed / 59 tests (100% success rate)**
- **Static Analysis:** ESLint executed on `src/` with zero warnings and zero errors.
- **Production Build:** Vite production bundle completed cleanly in `dist/`.
