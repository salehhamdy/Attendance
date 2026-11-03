# Project Documentation

## Architecture
- **Frontend:** React 18, Vite, react-router, Leaflet. API calls live in `frontend/src/api.js`; `frontend/src/mock.js` is an in-memory mock enabled by `VITE_MOCK=1`.
- **Backend (planned):** FastAPI, PostgreSQL, append-only point ledger, JWT roles (employee/owner).

## Screens
Login, EmployeeDashboard, LeaveManagement, OwnerDashboard, CheckInModal (map + geofence), RewardModal.

## API contract used by the frontend (under /api)
POST /auth/login, GET /me/summary, POST /checkin, POST /points/cancel-red, POST /points/cancel-black, POST/GET /leave, POST /rewards, GET /owner/users, POST /owner/adjust, POST /owner/leave/{id}/approve|reject, POST /owner/rewards/{id}/approve.

## Business rules
Africa/Cairo time. Money is integer EGP. Penalties: red 250 EGP, black 1000 EGP. See README for time windows and redemption.

## Tests
Frontend: 11 tests (Vitest + React Testing Library): mock rules (5), Login (2), EmployeeDashboard (4).
Backend: none yet.

## Known gaps
Geofence zone in `CheckInModal.jsx` is a placeholder; backend not implemented.
