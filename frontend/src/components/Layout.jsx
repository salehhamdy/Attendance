import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const owner = user.role === 'owner';
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Attendance</div>
        {!owner && <NavLink to="/" end>Dashboard</NavLink>}
        {!owner && <NavLink to="/leave">Leave</NavLink>}
        {owner && <NavLink to="/owner">Owner Panel</NavLink>}
      </aside>
      <div className="main">
        <header className="topbar">
          <span>Welcome, <b>{user.name}</b></span>
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
