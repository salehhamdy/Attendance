# Sharm Photographers Attendance System

A modern, gamified GPS-based attendance management system with point-trading economics, leave waivers, and administrative oversight.

## System Status
- **Frontend (React 18 + Vite SPA):** Fully implemented, verified with **47 unit and integration tests across 10 suites** (100% passing), ESLint clean (zero warnings), production build verified.
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

## System Rules & Economics

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
- Total Tests: **47 passing** across 10 test suites.
- Coverage:
  - `src/auth.test.jsx`: Authentication provider, session lifecycle, token parsing, and role state (3 tests).
  - `src/components/ui.test.jsx`: Reusable UI components (Card, Button, ToggleSwitch, StatusBadge, Modal, StatCard) (10 tests).
  - `src/components/CheckInModal.test.jsx`: Spatial geofence check-in, distance calculation, live boundary detection, and GPS simulation (4 tests).
  - `src/components/RewardModal.test.jsx`: Reward payout selector, validation, and submission (4 tests).
  - `src/components/Layout.test.jsx`: Role-aware sidebar, topbar user status, and logout (3 tests).
  - `src/screens/Login.test.jsx`: Login credentials validation and error states (2 tests).
  - `src/screens/EmployeeDashboard.test.jsx`: Real-time stats, penalty calculations, 30-pt progress bar, and point exchange toggles (4 tests).
  - `src/screens/LeaveManagement.test.jsx`: Date range validation, request submission, and history table (4 tests).
  - `src/screens/OwnerDashboard.test.jsx`: Photographer point balances, financial deductions, point adjustment form, and approval queues (4 tests).
  - `src/mock.test.js`: In-memory business logic verification for point trading, deductions, and geofencing (9 tests).
