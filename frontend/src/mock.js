// In-memory mock API used when VITE_MOCK=1 so the UI runs without the backend.
const delay = (v, ms = 120) => new Promise((r) => setTimeout(() => r(structuredClone(v)), ms));
const fail = (m, ms = 120) => new Promise((_, rej) => setTimeout(() => rej(new Error(m)), ms));

export const WORK_ZONE = {
  name: 'Rixos Radamis (Sharm El-Sheikh)',
  lat: 27.9158,
  lng: 34.33,
  radius: 300, // meters
};

export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const state = {
  green: 27,
  red: 1,
  black: 0,
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
  users: [
    { id: 1, name: 'rico', username: 'rico', green: 27, red: 1, black: 0 },
    { id: 2, name: 'sara', username: 'sara', green: 10, red: 0, black: 1 },
    { id: 3, name: 'ahmed', username: 'ahmed', green: 30, red: 0, black: 0 },
  ],
};

const summary = () => ({
  green: state.green,
  red: state.red,
  black: state.black,
  deductions_egp: state.red * 250 + state.black * 1000,
  progress: Math.min(state.green, 30),
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

    // Determine point allocation based on Egypt / Cairo time
    const now = new Date();
    // Default to +1 green in mock if between 7-8 or for interactive test
    const hours = now.getHours();
    let pointMsg = 'Check-in recorded successfully';
    let type = 'normal';

    if (hours >= 7 && hours < 8) {
      state.green += 1;
      type = 'green';
      pointMsg = 'Early check-in (07:00-08:00): +1 Green Point awarded!';
    } else if (hours >= 8 && hours < 10) {
      type = 'normal';
      pointMsg = 'On-time check-in (08:00-10:00): Attendance recorded.';
    } else if (hours >= 10 && hours < 12) {
      state.red += 1;
      type = 'red';
      pointMsg = 'Late check-in (10:00-12:00): +1 Red Penalty assigned (250 EGP).';
    } else if (hours >= 12) {
      state.black += 1;
      type = 'black';
      pointMsg = 'Severe delay / absent (post 12:00): +1 Black Penalty assigned (1000 EGP).';
    } else {
      // Early morning before 7
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

  // Helper to reset state for testing
  __resetState: () => {
    state.green = 27;
    state.red = 1;
    state.black = 0;
  },
};
