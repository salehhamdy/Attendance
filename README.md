# Attendance

GPS-based attendance system with a green/red/black points ledger, leave requests and owner approvals.

## Status
- Frontend (React + Vite): built in `frontend/` (11 tests passing, lint and build clean).
- Backend (FastAPI + PostgreSQL): not built yet.

## Run the frontend
```
cd frontend
npm install
npm run dev:mock   # no backend needed
npm run dev        # proxies /api to http://localhost:8000
npm test
npm run lint
npm run build
```

## Rules
Check-in windows (Africa/Cairo): 07-08 green, 08-10 normal, 10-12 red (250 EGP), after 12 black (1000 EGP).
1 green cancels 1 red; 5 green cancel 1 black; 30 green unlock a reward request.
