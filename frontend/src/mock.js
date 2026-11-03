// In-memory mock API used when VITE_MOCK=1 so the UI runs without the backend.
const delay = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 150));
const fail = (m) => new Promise((_, rej) => setTimeout(() => rej(new Error(m)), 150));

const state = {
  green: 27, red: 1, black: 0,
  leave: [{ id: 1, start_date: '2026-11-10', end_date: '2026-11-11', reason: 'Family event', status: 'pending' }],
  rewards: [],
  users: [
    { id: 1, name: 'rico', green: 27, red: 1, black: 0 },
    { id: 2, name: 'sara', green: 10, red: 0, black: 1 },
  ],
};

const summary = () => ({
  green: state.green, red: state.red, black: state.black,
  deductions_egp: state.red * 250 + state.black * 1000,
  progress: Math.min(state.green, 30),
});

export const mockApi = {
  login: (username, password) =>
    !username || !password
      ? fail('Invalid credentials')
      : delay({ access_token: 'mock-token', role: username === 'owner' ? 'owner' : 'employee', username }),
  summary: () => delay(summary()),
  checkin: () => { state.green += 1; return delay({ type: 'green', message: 'Early check-in: +1 green point' }); },
  cancelRed: () => {
    if (state.green < 1 || state.red < 1) return fail('Not enough points');
    state.green -= 1; state.red -= 1; return delay(summary());
  },
  cancelBlack: () => {
    if (state.green < 5 || state.black < 1) return fail('Not enough points');
    state.green -= 5; state.black -= 1; return delay(summary());
  },
  requestLeave: (b) => {
    const item = { id: Date.now(), status: 'pending', ...b };
    state.leave.push(item); return delay(item);
  },
  listLeave: () => delay(state.leave),
  requestReward: (payout_method, number) => {
    if (state.green < 30) return fail('Need 30 green points');
    state.green -= 30; state.rewards.push({ id: Date.now(), payout_method, number, status: 'pending' });
    return delay(summary());
  },
  ownerUsers: () => delay({ users: state.users, leave_requests: state.leave, reward_requests: state.rewards }),
  ownerAdjust: ({ user_id, color, delta }) => {
    const u = state.users.find((x) => x.id === Number(user_id));
    if (!u) return fail('User not found');
    u[color] = Math.max(0, u[color] + Number(delta)); return delay(u);
  },
  approveLeave: (id) => { const l = state.leave.find((x) => x.id === id); if (l) l.status = 'approved'; return delay({}); },
  rejectLeave: (id) => { const l = state.leave.find((x) => x.id === id); if (l) l.status = 'rejected'; return delay({}); },
  approveReward: (id) => { const r = state.rewards.find((x) => x.id === id); if (r) r.status = 'approved'; return delay({}); },
};

