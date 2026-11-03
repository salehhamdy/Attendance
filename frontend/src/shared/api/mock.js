import { haversineDistance } from '../utils/geo.js';

// In-memory mock API used when VITE_MOCK=1 so the UI runs without the backend.
const delay = (v, ms = 120) => new Promise((r) => setTimeout(() => r(structuredClone(v)), ms));
const fail = (m, ms = 120) => new Promise((_, rej) => setTimeout(() => rej(new Error(m)), ms));

export const WORK_ZONE = {
  name: 'Rixos Radamis (Sharm El-Sheikh)',
  lat: 27.9158,
  lng: 34.33,
  radius: 300, // meters
};

const initialUsers = [
  { id: 1, name: 'rico', username: 'rico', role: 'employee', green: 27, red: 1, black: 0 },
  { id: 2, name: 'sara', username: 'sara', role: 'employee', green: 10, red: 0, black: 1 },
  { id: 3, name: 'ahmed', username: 'ahmed', role: 'employee', green: 30, red: 0, black: 0 },
];

const initialSettings = {
  red_penalty_egp: 250,
  black_penalty_egp: 1000,
  early_window_start: '07:00',
  early_window_end: '08:00',
  normal_window_end: '10:00',
  late_window_end: '12:00',
};

const state = {
  green: 27,
  red: 1,
  black: 0,
  settings: { ...initialSettings },
  leave: [
    {
      id: 1,
      user_id: 1,
      user_name: 'rico',
      start_date: '2026-11-10',
      end_date: '2026-11-12',
      reason: 'Personal leave',
      status: 'pending',
    },
    {
      id: 2,
      user_id: 2,
      user_name: 'sara',
      start_date: '2026-11-05',
      end_date: '2026-11-07',
      reason: 'Medical appointment',
      status: 'approved',
    },
  ],
  rewards: [
    {
      id: 101,
      user_id: 1,
      user_name: 'rico',
      payout_method: 'vodafone_cash',
      number: '01012345678',
      amount_usd: 40,
      amount_egp: 2200,
      status: 'pending',
    },
  ],
  users: structuredClone(initialUsers),
};

function timeToMinutes(timeStr) {
  const [h, m] = String(timeStr || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

const summary = () => ({
  green: state.green,
  red: state.red,
  black: state.black,
  red_penalty_egp: state.settings.red_penalty_egp,
  black_penalty_egp: state.settings.black_penalty_egp,
  deductions_egp:
    state.red * state.settings.red_penalty_egp +
    state.black * state.settings.black_penalty_egp,
  progress: Math.min(state.green, 30),
  settings: structuredClone(state.settings),
});

export const mockApi = {
  login: (username, password) => {
    if (!username || !password) return fail('Invalid credentials');
    const role = username.toLowerCase() === 'owner' ? 'owner' : 'employee';
    return delay({
      access_token: 'mock-jwt-token-photographer',
      role,
      username,
      name: username,
    });
  },

  summary: () => delay(summary()),

  checkin: (lat, lng) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return fail('Invalid GPS coordinates provided');
    }

    const dist = haversineDistance(lat, lng, WORK_ZONE.lat, WORK_ZONE.lng);
    if (dist > WORK_ZONE.radius) {
      return fail(
        `Outside geofence zone: You are ~${dist}m away from ${WORK_ZONE.name} (allowed radius: ${WORK_ZONE.radius}m)`
      );
    }

    // Determine point allocation based on Egypt / Cairo time & configured time windows
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const earlyStart = timeToMinutes(state.settings.early_window_start);
    const earlyEnd = timeToMinutes(state.settings.early_window_end);
    const normalEnd = timeToMinutes(state.settings.normal_window_end);
    const lateEnd = timeToMinutes(state.settings.late_window_end);

    let pointMsg = 'Check-in recorded successfully';
    let type = 'normal';

    if (currentMins >= earlyStart && currentMins < earlyEnd) {
      state.green += 1;
      type = 'green';
      pointMsg = `Early check-in (${state.settings.early_window_start} - ${state.settings.early_window_end}): +1 Green Point awarded!`;
    } else if (currentMins >= earlyEnd && currentMins < normalEnd) {
      type = 'normal';
      pointMsg = `On-time check-in (${state.settings.early_window_end} - ${state.settings.normal_window_end}): Attendance recorded.`;
    } else if (currentMins >= normalEnd && currentMins < lateEnd) {
      state.red += 1;
      type = 'red';
      pointMsg = `Late check-in (${state.settings.normal_window_end} - ${state.settings.late_window_end}): +1 Red Penalty assigned (${state.settings.red_penalty_egp} EGP).`;
    } else if (currentMins >= lateEnd) {
      state.black += 1;
      type = 'black';
      pointMsg = `Severe delay / absent (post ${state.settings.late_window_end}): +1 Black Penalty assigned (${state.settings.black_penalty_egp} EGP).`;
    } else {
      state.green += 1;
      type = 'green';
      pointMsg = 'Early check-in: +1 Green Point awarded!';
    }

    return delay({
      success: true,
      type,
      message: pointMsg,
      distance: dist,
      zone: WORK_ZONE.name,
      summary: summary(),
    });
  },

  cancelRed: () => {
    if (state.green < 1 || state.red < 1) {
      return fail('Insufficient points: Need at least 1 Green point and 1 active Red penalty');
    }
    state.green -= 1;
    state.red -= 1;
    return delay(summary());
  },

  cancelBlack: () => {
    if (state.green < 5 || state.black < 1) {
      return fail('Insufficient points: Need at least 5 Green points and 1 active Black penalty');
    }
    state.green -= 5;
    state.black -= 1;
    return delay(summary());
  },

  requestLeave: (b) => {
    if (!b || !b.start_date || !b.end_date || !b.reason) {
      return fail('All fields (start date, end date, reason) are required');
    }
    const item = {
      id: Date.now(),
      user_id: 1,
      user_name: 'rico',
      status: 'pending',
      ...b,
    };
    state.leave.push(item);
    return delay(item);
  },

  listLeave: () => delay(state.leave),

  requestReward: (payout_method, number) => {
    if (!number || !payout_method) {
      return fail('Payment method and account number are required');
    }
    if (state.green < 30) {
      return fail('Insufficient points: 30 Green Points required to claim 40 USD / 2200 EGP');
    }
    state.green -= 30;
    const req = {
      id: Date.now(),
      user_id: 1,
      user_name: 'rico',
      payout_method,
      number,
      amount_usd: 40,
      amount_egp: 2200,
      status: 'pending',
    };
    state.rewards.push(req);
    return delay(summary());
  },

  ownerUsers: () =>
    delay({
      users: state.users,
      leave_requests: state.leave,
      reward_requests: state.rewards,
      settings: state.settings,
    }),

  ownerAdjust: ({ user_id, color, delta, reason }) => {
    const u = state.users.find((x) => x.id === Number(user_id));
    if (!u) return fail('Employee not found');
    if (!['green', 'red', 'black'].includes(color)) return fail('Invalid point color');
    u[color] = Math.max(0, (u[color] || 0) + Number(delta));
    return delay({ user: u, reason });
  },

  approveLeave: (id) => {
    const l = state.leave.find((x) => x.id === Number(id));
    if (!l) return fail('Leave request not found');
    l.status = 'approved';
    return delay({ success: true, leave: l });
  },

  rejectLeave: (id) => {
    const l = state.leave.find((x) => x.id === Number(id));
    if (!l) return fail('Leave request not found');
    l.status = 'rejected';
    return delay({ success: true, leave: l });
  },

  approveReward: (id) => {
    const r = state.rewards.find((x) => x.id === Number(id));
    if (!r) return fail('Reward request not found');
    r.status = 'approved';
    return delay({ success: true, reward: r });
  },

  // Owner System Configuration & Policy Controls
  getSettings: () => delay(structuredClone(state.settings)),

  updateSettings: (newSettings) => {
    if (!newSettings) return fail('Invalid settings payload');
    const red =
      newSettings.red_penalty_egp !== undefined
        ? Number(newSettings.red_penalty_egp)
        : state.settings.red_penalty_egp;
    const black =
      newSettings.black_penalty_egp !== undefined
        ? Number(newSettings.black_penalty_egp)
        : state.settings.black_penalty_egp;

    if (isNaN(red) || red < 0) return fail('Red penalty must be a non-negative number');
    if (isNaN(black) || black < 0) return fail('Black penalty must be a non-negative number');

    state.settings = {
      ...state.settings,
      ...newSettings,
      red_penalty_egp: red,
      black_penalty_egp: black,
    };
    return delay(structuredClone(state.settings));
  },

  // Owner User Management Controls
  addUser: ({ name, username, role = 'employee' }) => {
    if (!name || !username) return fail('Name and username are required');
    const exists = state.users.some(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (exists) return fail(`Username "${username}" already exists`);

    const newUser = {
      id: Date.now(),
      name: name.trim(),
      username: username.trim(),
      role: role || 'employee',
      green: 0,
      red: 0,
      black: 0,
    };
    state.users.push(newUser);
    return delay(newUser);
  },

  removeUser: (userId) => {
    const idx = state.users.findIndex((u) => u.id === Number(userId));
    if (idx === -1) return fail('User not found');
    const [removed] = state.users.splice(idx, 1);
    return delay({ success: true, removed });
  },

  __resetState: () => {
    state.green = 27;
    state.red = 1;
    state.black = 0;
    state.settings = { ...initialSettings };
    state.users = structuredClone(initialUsers);
  },
};

export { haversineDistance };
