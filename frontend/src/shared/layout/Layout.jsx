import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../modules/auth/index.js';
import { useI18n } from '../i18n/index.js';

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const { lang, toggleLang } = useI18n();
  const role = user?.role || 'employee';
  const isSuperadmin = role === 'superadmin';
  const isOwner = role === 'owner';

  const [theme, setTheme] = useState(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark'
        ? 'dark'
        : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', theme);
      }
    } catch {
      // Safe fallback for testing environments
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot">●</span> Attendance Portal
        </div>
        {isSuperadmin && (
          <>
            <NavLink to="/superadmin">
              Superadmin Panel
            </NavLink>
            <NavLink to="/owner">
              Owner Panel
            </NavLink>
          </>
        )}
        {isOwner && (
          <NavLink to="/owner">
            Owner Panel
          </NavLink>
        )}
        {!isOwner && !isSuperadmin && (
          <>
            <NavLink to="/" end>
              Dashboard
            </NavLink>
            <NavLink to="/leave">
              Leave Requests
            </NavLink>
          </>
        )}
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="user-info">
            <span>
              Signed in as <b>{user?.name || user?.username || 'User'}</b>
            </span>
            <span className={`role-pill role-${role}`}>
              {isSuperadmin ? 'Superadmin' : isOwner ? 'Owner' : 'Photographer'}
            </span>
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-label="Toggle language between English and Arabic"
              onClick={toggleLang}
            >
              {lang === 'en' ? 'العربية 🌐' : 'English 🌐'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}

export default Layout;
