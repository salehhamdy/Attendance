import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, LoginScreen } from './modules/auth/index.js';
import { Layout } from './shared/layout/index.js';
import { EmployeeDashboard } from './modules/ledger/index.js';
import { LeaveManagement } from './modules/leave/index.js';
import { OwnerDashboard } from './modules/owner/index.js';
import { SuperadminDashboard } from './modules/superadmin/index.js';

function Protected({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'superadmin' && user.role !== 'superadmin') {
    return <Navigate to={user.role === 'owner' ? '/owner' : '/'} replace />;
  }
  if (role === 'owner' && user.role !== 'owner' && user.role !== 'superadmin') {
    return <Navigate to="/" replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user } = useAuth();
  const home =
    user?.role === 'superadmin'
      ? '/superadmin'
      : user?.role === 'owner'
        ? '/owner'
        : '/';

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <LoginScreen />} />
      <Route
        path="/"
        element={
          user?.role === 'superadmin' ? (
            <Navigate to="/superadmin" replace />
          ) : user?.role === 'owner' ? (
            <Navigate to="/owner" replace />
          ) : (
            <Protected>
              <EmployeeDashboard />
            </Protected>
          )
        }
      />
      <Route
        path="/leave"
        element={
          <Protected>
            <LeaveManagement />
          </Protected>
        }
      />
      <Route
        path="/owner"
        element={
          <Protected role="owner">
            <OwnerDashboard />
          </Protected>
        }
      />
      <Route
        path="/superadmin"
        element={
          <Protected role="superadmin">
            <SuperadminDashboard />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}
