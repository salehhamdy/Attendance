const BASE = '/api';

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

export async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Empty JSON payload
  }

  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login') {
      setToken(null);
      window.location.href = '/login';
    }
    const detail = data && data.detail;
    throw new Error(
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((x) => x.msg).join(', ')
          : `Request failed (${res.status})`
    );
  }

  return data;
}

export const realApi = {
  login: (username, password) => request('POST', '/auth/login', { username, password }),
  summary: () => request('GET', '/me/summary'),
  checkin: (lat, lng) => request('POST', '/checkin', { lat, lng }),
  cancelRed: () => request('POST', '/points/cancel-red'),
  cancelBlack: () => request('POST', '/points/cancel-black'),
  requestLeave: (b) => request('POST', '/leave', b),
  listLeave: () => request('GET', '/leave'),
  requestReward: (payout_method, number) => request('POST', '/rewards', { payout_method, number }),
  ownerUsers: () => request('GET', '/owner/users'),
  ownerAdjust: (b) => request('POST', '/owner/adjust', b),
  approveLeave: (id) => request('POST', `/owner/leave/${id}/approve`),
  rejectLeave: (id) => request('POST', `/owner/leave/${id}/reject`),
  approveReward: (id) => request('POST', `/owner/rewards/${id}/approve`),
  getSettings: () => request('GET', '/owner/settings'),
  updateSettings: (s) => request('POST', '/owner/settings', s),
  addUser: (u) => request('POST', '/owner/users', u),
  removeUser: (id) => request('DELETE', `/owner/users/${id}`),
  getCompanySettings: () => request('GET', '/owner/company'),
  updateCompanySettings: (c) => request('POST', '/owner/company', c),
  addBranch: (b) => request('POST', '/owner/branches', b),
  removeBranch: (id) => request('DELETE', `/owner/branches/${id}`),
  resetUserPassword: (id, new_password) =>
    request('POST', `/owner/users/${id}/reset-password`, { new_password }),
  getPointsHistory: () => request('GET', '/me/history'),
  getAttendanceCalendar: (year, month) =>
    request('GET', `/me/calendar${year ? `?year=${year}&month=${month}` : ''}`),
  exportPayrollCsv: () => request('GET', '/owner/payroll/export'),
};
