# Universal Gamified Attendance System (Modular Monolith)

A modern, gamified GPS-based attendance management system with multi-branch geofencing, remote check-in mode, dynamic currency and penalty economics, point-trading mechanics, leave waivers, and comprehensive owner administration, architected as a **Modular Monolith**.

Adaptable to **any business anywhere in the world** — from resort photography teams in Sharm El-Sheikh to tech startups in Cairo, London, Dubai, or remote-first global distributed organizations.

## Architecture: Modular Monolith
The codebase is structured into isolated, cohesive domain modules with explicit public APIs (`index.js`), supported by a shared kernel:

```text
frontend/src/
├── modules/                         # Bounded Business Domains
│   ├── auth/                       # Authentication & Session Management
│   │   ├── context/AuthContext.jsx
│   │   ├── screens/LoginScreen.jsx
│   │   └── index.js
│   ├── attendance/                 # Spatial Multi-Branch & Remote Check-In
│   │   ├── components/CheckInModal.jsx
│   │   ├── services/geofence.js
│   │   └── index.js
│   ├── ledger/                     # Point Balances, Deductions & Currency
│   │   ├── screens/EmployeeDashboard.jsx
│   │   └── index.js
│   ├── rewards/                    # Configurable Milestone Reward Claims
│   │   ├── components/RewardModal.jsx
│   │   └── index.js
│   ├── leave/                      # Leave Requests & Absence Waiver
│   │   ├── screens/LeaveManagement.jsx
│   │   └── index.js
│   └── owner/                      # Owner Administration, Multi-Branch & Universal Profile
│       ├── screens/OwnerDashboard.jsx
│       └── index.js
├── shared/                         # Domain-Agnostic Shared Kernel
│   ├── ui/                         # Atomic Design UI Kit (Card, Button, Toggle, Modal, StatCard)
│   ├── layout/                     # Application Shell, Sidebar, TopHeader
│   ├── api/                        # HTTP Client, Mock Engine, Token Storage
│   └── utils/                      # Haversine Distance & Multi-Branch Nearest Detection
├── App.jsx                         # Route Configuration
├── main.jsx                        # React Root Entrypoint
├── setupTests.js                   # Test Setup & Browser Mocks
└── styles.css                      # Global Tokens & Animations
```

## System Status
- **Frontend (Modular Monolith):** Fully implemented and verified with **59 unit and integration tests across 10 suites** (100% passing), ESLint clean (zero warnings, zero errors), Vite production build verified.
- **Backend (FastAPI + PostgreSQL):** Planned. The frontend includes a comprehensive in-memory mock engine (`VITE_MOCK=1`) for standalone execution, demonstration, and automated testing.

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

## Domain Rules & Universal Business Capabilities

### 1. Universal Business Profile & Local Currency
The business owner can customize the platform for any company or industry:
- **Organization Name:** Dynamic branding displayed across the portal.
- **Operating Currency:** Configurable currency code (e.g. `EGP`, `USD`, `SAR`, `AED`, `EUR`, `GBP`). Deductions, balances, and penalties automatically compute in the chosen currency.
- **Reward Milestone Threshold:** Configurable milestone target (default: 30 Green Points).
- **Reward Payout Description:** Customizable valuation (e.g., `40 USD / 2,200 EGP` or `$100 Performance Bonus`).

### 2. Multi-Branch Geofences & Remote Check-In Mode
- **Multi-Location Support:** Owners can define unlimited branches/workplaces anywhere on Earth with GPS latitude, longitude, and custom radius (meters).
- **Device GPS Integration:** One-click "Use Current Device GPS" button to autofill accurate coordinates when creating branches.
- **Intelligent Spatial Validation:** Calculates real-time Haversine distance to all configured company branches, automatically identifying the closest branch.
- **Worldwide Remote Check-in Toggle:** When enabled, staff can check in from anywhere in the world without requiring proximity to a physical branch. When disabled, strict geofence radius enforcement applies.

### 3. Configurable Check-In Time Windows
The owner can configure arrival shift windows dynamically:
- **Early Window (Default: 07:00 – 08:00 AM):** Early arrival bonus (+1 Green Point).
- **On-Time Window (Default: 08:00 – 10:00 AM):** On-time attendance (Normal, zero points).
- **Late Window (Default: 10:00 – 12:00 PM):** Late arrival (+1 Red Penalty = Configured penalty amount).
- **Absence Cutoff (Default: Post 12:00 PM):** Severe absence delay (+1 Black Penalty = Configured penalty amount).

### 4. Configurable Financial Penalty Values
The owner can dynamically set financial penalty amounts in their active currency:
- **Red Penalty Value (e.g. 250 EGP or $15 USD):** Late check-in penalty amount.
- **Black Penalty Value (e.g. 1,000 EGP or $60 USD):** Severe delay / absence penalty amount.
- **Dynamic Deductions:** Staff dashboard immediately recalculates deductions and savings.

### 5. Point Trading Mechanics
- **Cancel Red Penalty:** 1 Green Point cancels 1 Red Penalty (saves active Red Penalty amount).
- **Cancel Black Penalty:** 5 Green Points cancel 1 Black Penalty (saves active Black Penalty amount).
- **Milestone Reward Claim:** Reaching the configured Green Point milestone unlocks reward payout requests via InstaPay, Vodafone Cash, Bank Transfer, or Cash.

### 6. User Roster Management
- **Add User:** Create new employee or administrator accounts (`name`, `username`, `role`).
- **Remove User:** Delete accounts from the roster with instant balance table updates.

### 7. Leave Exemption
- Employees can submit leave requests with date range validation and audit reasons.
- Once approved by the owner, absence penalties (Black Points) are waived for the duration.

## Test Suite
- Total Tests: **59 passing** across 10 modular test suites.
- Coverage:
  - `src/modules/auth/auth.test.jsx`: Authentication provider, session lifecycle, token parsing (3 tests).
  - `src/modules/auth/screens/LoginScreen.test.jsx`: Login credentials validation and error states (2 tests).
  - `src/shared/ui/ui.test.jsx`: Reusable UI components (Card, Button, ToggleSwitch, StatusBadge, Modal, StatCard) (10 tests).
  - `src/shared/layout/Layout.test.jsx`: Role-aware sidebar, topbar user status, and logout (3 tests).
  - `src/modules/attendance/components/CheckInModal.test.jsx`: Spatial geofence check-in, distance calculation, multi-branch boundary detection, remote mode, and GPS simulation (4 tests).
  - `src/modules/rewards/components/RewardModal.test.jsx`: Reward payout selector, validation, and submission (4 tests).
  - `src/modules/ledger/screens/EmployeeDashboard.test.jsx`: Real-time stats, dynamic currency penalty calculations, progress bar, and point exchange toggles (4 tests).
  - `src/modules/leave/screens/LeaveManagement.test.jsx`: Date range validation, request submission, and history table (4 tests).
  - `src/modules/owner/screens/OwnerDashboard.test.jsx`: Company profile & currency configuration, multi-branch addition/removal, dynamic penalty config, arrival time window adjustments, user addition/removal, and approval queues (10 tests).
  - `src/shared/api/mock.test.js`: In-memory business logic verification for point trading, deductions, multi-branch geofencing, remote check-in, dynamic company settings, penalty updates, arrival windows, and user management (15 tests).
