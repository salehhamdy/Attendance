import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './screens/Login.jsx';
import EmployeeDashboard from './screens/EmployeeDashboard.jsx';
import LeaveManagement from './screens/LeaveManagement.jsx';
import OwnerDashboard from './screens/OwnerDashboard.jsx';

function Protected({ owner, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (owner && user.role !== 'owner') return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user } = useAuth();
  const home = user && user.role === 'owner' ? '/owner' : '/';
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <Login />} />
      <Route path="/" element={user && user.role === 'owner' ? <Navigate to="/owner" replace /> : <Protected><EmployeeDashboard /></Protected>} />
      <Route path="/leave" element={<Protected><LeaveManagement /></Protected>} />
      <Route path="/owner" element={<Protected owner><OwnerDashboard /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
