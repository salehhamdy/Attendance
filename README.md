# Universal Gamified Attendance System (Modular Monolith)

A modern, gamified GPS-based attendance management system with hierarchical multi-tenant administration, multi-branch geofencing, remote check-in mode, dynamic currency and penalty economics, point-trading mechanics, leave waivers, and comprehensive owner and superadmin consoles, architected as a **Modular Monolith**.

Adaptable to **any business anywhere in the world** — from resort photography teams in Sharm El-Sheikh to tech startups in Cairo, London, Dubai, or global distributed organizations.

## Permission Hierarchy
1. **Superadmin (Platform Level — Immutable):** Highest level of organizational authority, strictly restricted to email **salehhamdy599@gmail.com** with **Email OTP (One-Time Password)** authentication. Cannot be removed, suspended, or modified by any user or administrator. Can provision business owners, assign them to workspaces, and manage owner lifecycles.
2. **Owner (Workspace / Business Admin):** Manages an organizational workspace, configures attendance policy, arrival windows, penalty rates, geofences, and manages staff rosters and payroll.
3. **Employee (Photographer / Staff Member):** Records geofenced or remote check-ins, earns green point bonuses, tracks monthly attendance on visual calendars, and exchanges points to waive deductions.

## Architecture: Modular Monolith
The codebase is structured into isolated, cohesive domain modules with explicit public APIs (`index.js`), supported by a shared kernel:

```text
frontend/src/
├── modules/                         # Bounded Business Domains
│   ├── auth/                       # Authentication & Session Management
│   │   ├── context/AuthContext.jsx
│   │   ├── screens/LoginScreen.jsx
│   │   └── index.js
│   ├── superadmin/                 # Platform Superadmin Governance (Top Hierarchy)
│   │   ├── screens/SuperadminDashboard.jsx
│   │   └── index.js
│   ├── attendance/                 # Spatial Multi-Branch & Remote Check-In
│   │   ├── components/CheckInModal.jsx
│   │   ├── services/geofence.js
│   │   └── index.js
│   ├── ledger/                     # Point Balances, Deductions, History Ledger & Calendar
│   │   ├── screens/EmployeeDashboard.jsx
│   │   └── index.js
│   ├── rewards/                    # Configurable Milestone Reward Claims
│   │   ├── components/RewardModal.jsx
│   │   └── index.js
│   ├── leave/                      # Leave Requests & Absence Waiver
│   │   ├── screens/LeaveManagement.jsx
│   │   └── index.js
│   └── owner/                      # Owner Administration, Resort Geofences, Payroll & Roster
│       ├── screens/OwnerDashboard.jsx
│       └── index.js
├── shared/                         # Domain-Agnostic Shared Kernel
│   ├── ui/                         # Atomic Design UI Kit (Card, Button, Toggle, Modal, StatCard)
│   ├── layout/                     # Application Shell, Sidebar, TopHeader & Dark Mode
│   ├── api/                        # HTTP Client, Mock Engine, Token Storage
│   └── utils/                      # Haversine Distance & Multi-Branch Nearest Detection
├── App.jsx                         # Route Configuration & Hierarchical RBAC
├── main.jsx                        # React Root Entrypoint
├── setupTests.js                   # Test Setup & Browser Mocks
└── styles.css                      # Global Tokens, Dark Theme, Superadmin & Calendar Animations
```

## System Status
- **Frontend (Modular Monolith):** Fully implemented and verified with **94 unit and integration tests across 12 suites** (100% passing), ESLint clean (zero warnings, zero errors), Vite production build verified.
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

## Domain Rules & Core Capabilities

### 1. Platform Superadmin & Immutable Authority
- **Immutable Root Superadmin:** The platform superadmin account is permanent and protected. No user, administrator, or owner can remove, suspend, or alter the superadmin account.
- **Owner Provisioning & Workspace Assignment:** Superadmins create owner accounts and bind them to distinct business workspaces (e.g., Acme Resorts Sharm, Beta Studios).
- **Cascading Suspension:** Suspending an owner **simultaneously suspends the entire team under that owner**, instantly restricting login and check-in access across all workspaces until reinstated.
- **Cascading Removal:** Permanently removing an owner cascades and **permanently purges all team members, attendance records, leaves, and rewards under that owner**.
- **Superadmin Console (`/superadmin`):** Overview stats (Total Owners, Active, Suspended, Total Team Members), live search filter, and quick action controls (Suspend, Reinstate, Remove).

### 2. Universal Business Profile & Local Currency
- **Organization Name:** Dynamic branding displayed across the portal.
- **Operating Currency:** Configurable currency code (e.g. `EGP`, `USD`, `SAR`, `AED`, `EUR`, `GBP`). Deductions, balances, and penalties automatically compute in the chosen currency.
- **Reward Milestone Threshold:** Configurable milestone target (default: 30 Green Points).
- **Reward Payout Description:** Customizable valuation (e.g., `40 USD / 2,200 EGP` or `$100 Performance Bonus`).

### 3. Multiple Resort Geofencing & Presets
- **Multi-Resort Support:** Owners can define unlimited resort locations anywhere with GPS latitude, longitude, and custom radius (meters).
- **Quick-Fill Resort Presets:** One-click presets for premier resorts including Rixos Radamis Sharm, Rixos Premium Seagate, Pickalbatros Aqua Park, Four Seasons Resort, and Steigenberger Alcazar.
- **Device GPS Integration:** "Use Current Device GPS" button to autofill accurate coordinates on-site.
- **Intelligent Spatial Validation:** Calculates real-time Haversine distance to all configured branches and evaluates against the closest geofence.
- **Worldwide Remote Check-in Toggle:** Allows staff to check in from anywhere when enabled, or enforces strict physical boundaries when disabled.

### 4. Points History Ledger & Monthly Attendance Calendar
- **Points History Ledger:** Chronological audit trail of all point movements with timestamps, events (Early check-in, On-time, Late penalty, Red/Black cancellations, Owner adjustments), workplace zones, and color delta badges (`+1 Green`, `+1 Red`, `-1 Green / -1 Red`, etc.).
- **Monthly Attendance Calendar:** Visual calendar grid showing daily attendance status (Early, On-Time, Late, Absent, Leave, Day Off), arrival times, and monthly summary counters.

### 5. Payroll & Compensation Export (CSV / Excel)
- **Payroll Table:** Owner panel summary of employee green points, penalty deductions in active currency, approved cash rewards, and net payroll adjustment.
- **One-Click CSV Export:** Generates formatted `payroll-report-<company>.csv` files ready for Microsoft Excel, Google Sheets, and accounting payroll processing.

### 6. Dark Mode for Dim Photography Studios
- High-contrast, slate-neutral dark theme engineered specifically for photographers editing photos in dimly lit environments.
- Instant toggle in the top bar with persistence in `localStorage` and full CSS custom property integration (`[data-theme="dark"]`).

### 7. Direct Password Reset
- Owners can reset photographer/employee passwords directly from the user management roster with a single click.
- Instant modal dialog with customizable temporary passwords.

### 8. Configurable Check-In Shift Windows
- **Early Window (Default: 07:00 – 08:00 AM):** Early arrival bonus (+1 Green Point).
- **On-Time Window (Default: 08:00 – 10:00 AM):** On-time attendance (Normal, zero points).
- **Late Window (Default: 10:00 – 12:00 PM):** Late arrival (+1 Red Penalty = Configured penalty amount).
- **Absence Cutoff (Default: Post 12:00 PM):** Severe delay (+1 Black Penalty = Configured penalty amount).

### 9. Point Trading Mechanics
- **Cancel Red Penalty:** 1 Green Point cancels 1 Red Penalty (saves active Red Penalty amount).
- **Cancel Black Penalty:** 5 Green Points cancel 1 Black Penalty (saves active Black Penalty amount).
- **Milestone Reward Claim:** Reaching the configured Green Point milestone unlocks reward payout requests via InstaPay, Vodafone Cash, Bank Transfer, or Cash.

### 10. Leave Exemption
- Employees can submit leave requests with date range validation and audit reasons.
- Once approved by the owner, absence penalties (Black Points) are waived for the duration.

## Test Suite
- Total Tests: **94 passing** across 12 modular test suites.
- Coverage:
  - `src/App.test.jsx`: Complete integration and hierarchical RBAC suite covering unauthenticated redirection, employee journey (dashboard, calendar, leave management, route guard), owner journey (profile, branches, payroll, route guard), superadmin journey (Email OTP login, immutability, owner governance, dark mode, signout), and suspended owner access blocking (5 tests).
  - `src/modules/auth/auth.test.jsx`: Authentication provider, session lifecycle, token parsing (3 tests).
  - `src/modules/auth/screens/LoginScreen.test.jsx`: Login credentials validation, superadmin email OTP request, verification, and unauthorized email rejection (4 tests).
  - `src/shared/ui/ui.test.jsx`: Reusable UI components (Card, Button, ToggleSwitch, StatusBadge, Modal, StatCard) (10 tests).
  - `src/shared/layout/Layout.test.jsx`: Role-aware sidebar, topbar user status, dark mode toggle, superadmin navigation, and logout (5 tests).
  - `src/modules/attendance/components/CheckInModal.test.jsx`: Spatial geofence check-in, distance calculation, multi-branch boundary detection, remote mode, and GPS simulation (4 tests).
  - `src/modules/rewards/components/RewardModal.test.jsx`: Reward payout selector, validation, and submission (4 tests).
  - `src/modules/ledger/screens/EmployeeDashboard.test.jsx`: Real-time stats, dynamic currency penalty calculations, progress bar, point exchange toggles, monthly attendance calendar, and points history ledger (6 tests).
  - `src/modules/leave/screens/LeaveManagement.test.jsx`: Date range validation, request submission, and history table (4 tests).
  - `src/modules/superadmin/screens/SuperadminDashboard.test.jsx`: Stats cards, immutable superadmin protection for Saleh Hamdy (`salehhamdy599@gmail.com`), owner searching, provisioning, cascading suspension, reinstatement, cascading deletion, form validation, and error alert handling (10 tests).
  - `src/modules/owner/screens/OwnerDashboard.test.jsx`: Company profile & currency configuration, resort geofence presets, multi-branch addition/removal, direct password reset, payroll CSV export, dynamic penalty config, arrival time window adjustments, user addition/removal, form validation, and approval queues (16 tests).
  - `src/shared/api/mock.test.js`: In-memory business logic verification for point trading, deductions, multi-branch geofencing, remote check-in, password reset, payroll CSV export, points history, calendar retrieval, superadmin immutability, cascading suspension, cascading removal, and exclusive email OTP authentication for `salehhamdy599@gmail.com` (23 tests).
