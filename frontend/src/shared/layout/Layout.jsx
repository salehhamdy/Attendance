import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../modules/auth/index.js';

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const owner = user?.role === 'owner';

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot">●</span> Sharm Attendance
        </div>
        {!owner && (
          <>
            <NavLink to="/" end>
              Dashboard
            </NavLink>
            <NavLink to="/leave">
              Leave Requests
            </NavLink>
          </>
        )}
        {owner && (
          <NavLink to="/owner">
            Owner Panel
          </NavLink>
        )}
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="user-info">
            <span>
              Signed in as <b>{user?.name || user?.username || 'User'}</b>
            </span>
            <span className={`role-pill role-${owner ? 'owner' : 'employee'}`}>
              {owner ? 'Owner' : 'Photographer'}
            </span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
            Logout
          </button>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}

export default Layout;
