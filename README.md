# Sharm Photographers Attendance System

A modern, gamified GPS-based attendance management system with point-trading economics, leave waivers, and administrative oversight, architected as a **Modular Monolith**.

## Architecture: Modular Monolith
The codebase is structured into isolated, cohesive domain modules with explicit public APIs (`index.js`), supported by a shared kernel:

```text
frontend/src/
├── modules/                         # Bounded Business Domains
│   ├── auth/                       # Authentication & Session Management
│   │   ├── context/AuthContext.jsx
│   │   ├── screens/LoginScreen.jsx
│   │   └── index.js
│   ├── attendance/                 # Spatial Check-In & Geofence
│   │   ├── components/CheckInModal.jsx
│   │   ├── services/geofence.js
│   │   └── index.js
│   ├── ledger/                     # Point Balances & Deductions
│   │   ├── screens/EmployeeDashboard.jsx
│   │   └── index.js
│   ├── rewards/                    # 30-Point Milestone Claims (40 USD / 2,200 EGP)
│   │   ├── components/RewardModal.jsx
│   │   └── index.js
│   ├── leave/                      # Leave Requests & Absence Waiver
│   │   ├── screens/LeaveManagement.jsx
│   │   └── index.js
│   └── owner/                      # Owner Administration & Approval Queues
│       ├── screens/OwnerDashboard.jsx
│       └── index.js
├── shared/                         # Domain-Agnostic Shared Kernel
│   ├── ui/                         # Atomic Design UI Kit (Card, Button, Toggle, Modal, StatCard)
│   ├── layout/                     # Application Shell, Sidebar, TopHeader
│   ├── api/                        # HTTP Client, Mock Engine, Token Storage
│   └── utils/                      # Haversine Distance & Helpers
├── App.jsx                         # Route Configuration
├── main.jsx                        # React Root Entrypoint
├── setupTests.js                   # Test Setup & Browser Mocks
└── styles.css                      # Global Tokens & Animations
```

## System Status
- **Frontend (Modular Monolith):** Fully refactored and verified with **47 unit and integration tests across 10 suites** (100% passing), ESLint clean (zero warnings), Vite production build verified.
- **Backend (FastAPI + PostgreSQL):** Planned. The frontend includes a comprehensive in-memory mock system (`VITE_MOCK=1`) for standalone execution, demonstration, and automated testing.

## Quick Start (Frontend)

```bash
cd frontend
npm install

# Run with interactive mock data (standalone mode, no backend required)
npm run dev:mock

# Run against FastAPI backend (proxies /api to http://localhost:8000)
npm run dev

# Run automated test suite
npm test

# Run static analysis
npm run lint

# Production build
npm run build
```

## Domain Rules & Economics

### 1. Check-In Time Windows (Africa/Cairo)
- **07:00 – 08:00 AM:** Early arrival bonus (+1 Green Point).
- **08:00 – 10:00 AM:** On-time attendance (Normal, zero points).
- **10:00 – 12:00 PM:** Late arrival (+1 Red Penalty = 250 EGP deduction).
- **Post 12:00 PM:** Full-day absence delay (+1 Black Penalty = 1,000 EGP deduction).

### 2. Point Trading Mechanics
- **Cancel Red Penalty:** 1 Green Point cancels 1 Red Penalty (saves 250 EGP).
- **Cancel Black Penalty:** 5 Green Points cancel 1 Black Penalty (saves 1,000 EGP).
- **Green Reward Milestone:** Accumulating 30 Green Points unlocks a cash reward claim worth **40 USD / 2,200 EGP** via InstaPay or Vodafone Cash.

### 3. Geofencing
- **Designated Work Zone:** Rixos Radamis (Sharm El-Sheikh), coordinates `27.9158, 34.33`, 300-meter radius.
- **Spatial Validation:** Real-time Haversine distance calculation and boundary proximity status indicators with Leaflet interactive map.

### 4. Leave Exemption
- Photographers can submit leave requests with date validation and audit reasons.
- Once approved by the owner, absence penalties (Black Points) are waived for the specified duration.

## Test Suite
- Total Tests: **47 passing** across 10 modular test suites.
- Coverage:
  - `src/modules/auth/auth.test.jsx`: Authentication provider, session lifecycle, token parsing (3 tests).
  - `src/modules/auth/screens/LoginScreen.test.jsx`: Login credentials validation and error states (2 tests).
  - `src/shared/ui/ui.test.jsx`: Reusable UI components (Card, Button, ToggleSwitch, StatusBadge, Modal, StatCard) (10 tests).
  - `src/shared/layout/Layout.test.jsx`: Role-aware sidebar, topbar user status, and logout (3 tests).
  - `src/modules/attendance/components/CheckInModal.test.jsx`: Spatial geofence check-in, distance calculation, live boundary detection, and GPS simulation (4 tests).
  - `src/modules/rewards/components/RewardModal.test.jsx`: Reward payout selector, validation, and submission (4 tests).
  - `src/modules/ledger/screens/EmployeeDashboard.test.jsx`: Real-time stats, penalty calculations, 30-pt progress bar, and point exchange toggles (4 tests).
  - `src/modules/leave/screens/LeaveManagement.test.jsx`: Date range validation, request submission, and history table (4 tests).
  - `src/modules/owner/screens/OwnerDashboard.test.jsx`: Photographer point balances, financial deductions, point adjustment form, and approval queues (4 tests).
  - `src/shared/api/mock.test.js`: In-memory business logic verification for point trading, deductions, and geofencing (9 tests).
