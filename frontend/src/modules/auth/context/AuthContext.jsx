import React, { createContext, useContext, useState } from 'react';
import { api, setToken, getToken, SUPERADMIN_EMAIL } from '../../../shared/api/index.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = getToken();
    if (!token) return null;
    const payload = parseJwt(token);
    return {
      name: localStorage.getItem('name') || payload.sub,
      role: localStorage.getItem('role') || payload.role || 'employee',
      email: localStorage.getItem('email') || payload.email || '',
    };
  });

  async function login(username, password) {
    const r = await api.login(username, password);
    const token = r.access_token || r.token;
    setToken(token);
    const payload = parseJwt(token);
    const role = r.role || (r.user && r.user.role) || payload.role || 'employee';
    const name = r.name || r.username || (r.user && (r.user.name || r.user.username)) || username;
    const email =
      r.email || (r.user && r.user.email) || payload.email || (role === 'superadmin' ? SUPERADMIN_EMAIL : '');
    localStorage.setItem('role', role);
    localStorage.setItem('name', name);
    if (email) localStorage.setItem('email', email);
    setUser({ name, role, email });
  }

  async function loginWithOtp(email, otp) {
    const r = await api.verifySuperadminOtp(email, otp);
    const token = r.access_token || r.token;
    setToken(token);
    const payload = parseJwt(token);
    const role = r.role || (r.user && r.user.role) || payload.role || 'superadmin';
    const name = r.name || r.username || (r.user && (r.user.name || r.user.username)) || 'Saleh Hamdy';
    const userEmail = r.email || email;
    localStorage.setItem('role', role);
    localStorage.setItem('name', name);
    localStorage.setItem('email', userEmail);
    setUser({ name, role, email: userEmail });
    return r;
  }

  function logout() {
    setToken(null);
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    localStorage.removeItem('email');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, loginWithOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

