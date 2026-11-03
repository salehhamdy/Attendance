import React, { createContext, useContext, useState } from 'react';
import { api, setToken, getToken } from '../../../shared/api/index.js';

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
    };
  });

  async function login(username, password) {
    const r = await api.login(username, password);
    const token = r.access_token || r.token;
    setToken(token);
    const payload = parseJwt(token);
    const role = r.role || (r.user && r.user.role) || payload.role || 'employee';
    const name = r.name || r.username || (r.user && (r.user.name || r.user.username)) || username;
    localStorage.setItem('role', role);
    localStorage.setItem('name', name);
    setUser({ name, role });
  }

  function logout() {
    setToken(null);
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

