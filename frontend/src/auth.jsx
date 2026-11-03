import React, { createContext, useContext, useState } from 'react';
import { api, setToken, getToken } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

function parse(token) {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return {}; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const t = getToken();
    if (!t) return null;
    const p = parse(t);
    return { name: localStorage.getItem('name') || p.sub, role: localStorage.getItem('role') || p.role || 'employee' };
  });

  async function login(username, password) {
    const r = await api.login(username, password);
    const token = r.access_token || r.token;
    setToken(token);
    const p = parse(token);
    const role = r.role || (r.user && r.user.role) || p.role || 'employee';
    const name = r.name || r.username || (r.user && (r.user.name || r.user.username)) || username;
    localStorage.setItem('role', role);
    localStorage.setItem('name', name);
    setUser({ name, role });
  }
  function logout() {
    setToken(null); localStorage.removeItem('role'); localStorage.removeItem('name'); setUser(null);
  }
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}
