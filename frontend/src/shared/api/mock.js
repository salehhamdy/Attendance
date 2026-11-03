import { haversineDistance, findNearestBranch } from '../utils/geo.js';

// In-memory mock API used when VITE_MOCK=1 so the UI runs without the backend.
const delay = (v, ms = 120) => new Promise((r) => setTimeout(() => r(structuredClone(v)), ms));
const fail = (m, ms = 120) => new Promise((_, rej) => setTimeout(() => rej(new Error(m)), ms));

export const initialCompany = {
  company_name: 'Universal Attendance System',
  currency: 'EGP',
  reward_threshold: 30,
  reward_amount: '40 USD / 2,200 EGP',
  allow_remote: false,
  payout_methods: ['InstaPay', 'Vodafone Cash', 'Bank Transfer', 'Cash'],
  branches: [
    { id: 1, name: 'Rixos Radamis (Sharm El-Sheikh)', lat: 27.9158, lng: 34.33, radius: 300 },
    { id: 2, name: 'Cairo Headquarters', lat: 30.0444, lng: 31.2357, radius: 300 },
  ],
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

export const initialHistory = [
  {
    id: 1,
    timestamp: '2026-11-01 07:35',
    action: 'Early Check-In',
    zone: 'Rixos Radamis (Sharm El-Sheikh)',
    delta_green: 1,
    delta_red: 0,
    delta_black: 0,
    note: 'Early shift bonus (+1 Green Point awarded)',
  },
  {
    id: 2,
    timestamp: '2026-11-02 08:45',
    action: 'On-Time Check-In',
    zone: 'Rixos Radamis (Sharm El-Sheikh)',
    delta_green: 0,
    delta_red: 0,
    delta_black: 0,
    note: 'Standard arrival (Normal attendance recorded)',
  },
  {
    id: 3,
    timestamp: '2026-11-02 10:30',
    action: 'Late Check-In',
    zone: 'Rixos Radamis (Sharm El-Sheikh)',
    delta_green: 0,
    delta_red: 1,
    delta_black: 0,
    note: 'Late arrival penalty (+1 Red Penalty assigned)',
  },
  {
    id: 4,
    timestamp: '2026-11-03 07:40',
    action: 'Early Check-In',
    zone: 'Rixos Radamis (Sharm El-Sheikh)',
    delta_green: 1,
    delta_red: 0,
    delta_black: 0,
    note: 'Early shift bonus (+1 Green Point awarded)',
  },
];

export const initialCalendar = [
  { day: 1, date: '2026-11-01', status: 'early', label: 'Early (+1G)', time: '07:35' },
  { day: 2, date: '2026-11-02', status: 'late', label: 'Late (+1R)', time: '10:30' },
  { day: 3, date: '2026-11-03', status: 'early', label: 'Early (+1G)', time: '07:40' },
  { day: 4, date: '2026-11-04', status: 'normal', label: 'On-Time', time: '08:50' },
  { day: 5, date: '2026-11-05', status: 'normal', label: 'On-Time', time: '08:45' },
  { day: 6, date: '2026-11-06', status: 'off', label: 'Day Off', time: '-' },
  { day: 7, date: '2026-11-07', status: 'off', label: 'Day Off', time: '-' },
  { day: 8, date: '2026-11-08', status: 'early', label: 'Early (+1G)', time: '07:25' },
  { day: 9, date: '2026-11-09', status: 'normal', label: 'On-Time', time: '08:30' },
  { day: 10, date: '2026-11-10', status: 'leave', label: 'Approved Leave', time: '-' },
  { day: 11, date: '2026-11-11', status: 'leave', label: 'Approved Leave', time: '-' },
  { day: 12, date: '2026-11-12', status: 'leave', label: 'Approved Leave', time: '-' },
  { day: 13, date: '2026-11-13', status: 'normal', label: 'On-Time', time: '08:55' },
  { day: 14, date: '2026-11-14', status: 'off', label: 'Day Off', time: '-' },
];

export const WORK_ZONE = initialCompany.branches[0];

const state = {
  green: 27,
  red: 1,
  black: 0,
  settings: { ...initialSettings },
  company: structuredClone(initialCompany),
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
  history: structuredClone(initialHistory),
  calendar: structuredClone(initialCalendar),
};

function timeToMinutes(timeStr) {
  const [h, m] = String(timeStr || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatNowTimestamp() {
  const d = new Date();
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hr = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yr}-${mo}-${day} ${hr}:${min}`;
}

const summary = () => ({
  green: state.green,
  red: state.red,
  black: state.black,
  red_penalty_egp: state.settings.red_penalty_egp,
  black_penalty_egp: state.settings.black_penalty_egp,
  currency: state.company.currency || 'EGP',
  company_name: state.company.company_name || 'Universal Attendance System',
  reward_threshold: state.company.reward_threshold || 30,
  reward_amount: state.company.reward_amount || '40 USD / 2,200 EGP',
  allow_remote: Boolean(state.company.allow_remote),
  branches: structuredClone(state.company.branches || []),
  deductions_egp:
    state.red * state.settings.red_penalty_egp +
    state.black * state.settings.black_penalty_egp,
  progress: Math.min(state.green, state.company.reward_threshold || 30),
  settings: structuredClone(state.settings),
  company: structuredClone(state.company),
  history: structuredClone(state.history),
  calendar: structuredClone(state.calendar),
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
      company_name: state.company.company_name,
    });
  },

  summary: () => delay(summary()),

  checkin: (lat, lng) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return fail('Invalid GPS coordinates provided');
    }

    const { branch, distance, inZone } = findNearestBranch(lat, lng, state.company.branches);
    const allowRemote = Boolean(state.company.allow_remote);

    if (!allowRemote && !inZone) {
      const branchName = branch ? branch.name : 'designated workplace';
      const maxRadius = branch ? branch.radius : 300;
      return fail(
        `Outside approved workplace: Nearest branch "${branchName}" is ~${distance}m away (allowed radius: ${maxRadius}m)`
      );
    }

    // Determine point allocation based on Egypt / Cairo time & configured time windows
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const earlyStart = timeToMinutes(state.settings.early_window_start);
    const earlyEnd = timeToMinutes(state.settings.early_window_end);
    const normalEnd = timeToMinutes(state.settings.normal_window_end);
    const lateEnd = timeToMinutes(state.settings.late_window_end);

    const currency = state.company.currency || 'EGP';
    let pointMsg = 'Check-in recorded successfully';
    let type = 'normal';
    let deltaG = 0;
    let deltaR = 0;
    let deltaB = 0;
    let actionLabel = 'On-Time Check-In';

    if (currentMins >= earlyStart && currentMins < earlyEnd) {
      state.green += 1;
      type = 'green';
      deltaG = 1;
      actionLabel = 'Early Check-In';
      pointMsg = `Early check-in (${state.settings.early_window_start} - ${state.settings.early_window_end}): +1 Green Point awarded!`;
    } else if (currentMins >= earlyEnd && currentMins < normalEnd) {
      type = 'normal';
      actionLabel = 'On-Time Check-In';
      pointMsg = `On-time check-in (${state.settings.early_window_end} - ${state.settings.normal_window_end}): Attendance recorded.`;
    } else if (currentMins >= normalEnd && currentMins < lateEnd) {
      state.red += 1;
      type = 'red';
      deltaR = 1;
      actionLabel = 'Late Check-In';
      pointMsg = `Late check-in (${state.settings.normal_window_end} - ${state.settings.late_window_end}): +1 Red Penalty assigned (${state.settings.red_penalty_egp} ${currency}).`;
    } else if (currentMins >= lateEnd) {
      state.black += 1;
      type = 'black';
      deltaB = 1;
      actionLabel = 'Severe Absence Delay';
      pointMsg = `Severe delay / absent (post ${state.settings.late_window_end}): +1 Black Penalty assigned (${state.settings.black_penalty_egp} ${currency}).`;
    } else {
      state.green += 1;
      type = 'green';
      deltaG = 1;
      actionLabel = 'Early Check-In';
      pointMsg = 'Early check-in: +1 Green Point awarded!';
    }

    const matchedBranchName = branch ? branch.name : 'Remote Check-in';
    const zoneName = allowRemote && !inZone ? 'Remote Location' : matchedBranchName;

    // Append to Points History Ledger
    state.history.unshift({
      id: Date.now(),
      timestamp: formatNowTimestamp(),
      action: actionLabel,
      zone: zoneName,
      delta_green: deltaG,
      delta_red: deltaR,
      delta_black: deltaB,
      note: pointMsg,
    });

    // Update Calendar for today
    const dayOfMonth = now.getDate();
    const existingCalIdx = state.calendar.findIndex((c) => c.day === dayOfMonth);
    const calEntry = {
      day: dayOfMonth,
      date: now.toISOString().slice(0, 10),
      status: type,
      label: type === 'green' ? 'Early (+1G)' : type === 'red' ? 'Late (+1R)' : type === 'black' ? 'Severe (+1B)' : 'On-Time',
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    };
    if (existingCalIdx >= 0) {
      state.calendar[existingCalIdx] = calEntry;
    } else {
      state.calendar.push(calEntry);
    }

    return delay({
      success: true,
      type,
      message: pointMsg,
      distance: distance || 0,
      zone: zoneName,
      branch: branch || null,
      allow_remote: allowRemote,
      is_remote: Boolean(allowRemote && !inZone),
      summary: summary(),
    });
  },

  cancelRed: () => {
    if (state.green < 1 || state.red < 1) {
      return fail('Insufficient points: Need at least 1 Green point and 1 active Red penalty');
    }
    state.green -= 1;
    state.red -= 1;

    state.history.unshift({
      id: Date.now(),
      timestamp: formatNowTimestamp(),
      action: 'Red Penalty Cancelled',
      zone: 'Point Exchange',
      delta_green: -1,
      delta_red: -1,
      delta_black: 0,
      note: `Waived 1 Red Penalty by exchanging 1 Green Point (-${state.settings.red_penalty_egp} ${state.company.currency || 'EGP'} deduction)`,
    });

    return delay(summary());
  },

  cancelBlack: () => {
    if (state.green < 5 || state.black < 1) {
      return fail('Insufficient points: Need at least 5 Green points and 1 active Black penalty');
    }
    state.green -= 5;
    state.black -= 1;

    state.history.unshift({
      id: Date.now(),
      timestamp: formatNowTimestamp(),
      action: 'Black Penalty Cancelled',
      zone: 'Point Exchange',
      delta_green: -5,
      delta_red: 0,
      delta_black: -1,
      note: `Waived 1 Black Penalty by exchanging 5 Green Points (-${state.settings.black_penalty_egp} ${state.company.currency || 'EGP'} deduction)`,
    });

    return delay(summary());
  },

  requestLeave: ({ start_date, end_date, reason }) => {
    if (!start_date || !end_date || !reason) {
      return fail('Start date, end date, and reason are required');
    }
    if (new Date(end_date) < new Date(start_date)) {
      return fail('End date cannot be prior to start date');
    }
    const newLeave = {
      id: Date.now(),
      user_id: 1,
      user_name: 'rico',
      start_date,
      end_date,
      reason,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    state.leave.push(newLeave);
    return delay(newLeave);
  },

  listLeave: () => delay(structuredClone(state.leave)),

  requestReward: (payout_method, number) => {
    const threshold = state.company.reward_threshold || 30;
    if (state.green < threshold) {
      return fail(`Insufficient Green Points: Reached ${state.green}/${threshold} required for milestone`);
    }
    if (!payout_method || !number) {
      return fail('Payout method and target number/account are required');
    }
    const newReward = {
      id: Date.now(),
      user_id: 1,
      user_name: 'rico',
      payout_method,
      number,
      amount_usd: 40,
      amount_egp: 2200,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    state.rewards.push(newReward);
    return delay(newReward);
  },

  // Owner endpoints
  ownerUsers: () =>
    delay({
      users: structuredClone(state.users),
      settings: structuredClone(state.settings),
      company: structuredClone(state.company),
      leave_requests: structuredClone(state.leave),
      reward_requests: structuredClone(state.rewards),
    }),

  ownerAdjust: ({ user_id, color, delta, reason }) => {
    if (!user_id || !color || delta === undefined || !reason) {
      return fail('user_id, color, delta, and audit reason are required');
    }
    const user = state.users.find((u) => u.id === Number(user_id));
    if (!user) return fail('User not found');

    const numDelta = Number(delta);
    if (color === 'green') user.green = Math.max(0, (user.green || 0) + numDelta);
    if (color === 'red') user.red = Math.max(0, (user.red || 0) + numDelta);
    if (color === 'black') user.black = Math.max(0, (user.black || 0) + numDelta);

    if (user.id === 1) {
      if (color === 'green') state.green = user.green;
      if (color === 'red') state.red = user.red;
      if (color === 'black') state.black = user.black;

      state.history.unshift({
        id: Date.now(),
        timestamp: formatNowTimestamp(),
        action: 'Administrative Point Adjustment',
        zone: 'Owner Panel',
        delta_green: color === 'green' ? numDelta : 0,
        delta_red: color === 'red' ? numDelta : 0,
        delta_black: color === 'black' ? numDelta : 0,
        note: `Owner adjustment: ${reason}`,
      });
    }

    return delay({ success: true, user: structuredClone(user) });
  },

  approveLeave: (leaveId) => {
    const l = state.leave.find((x) => x.id === Number(leaveId));
    if (!l) return fail('Leave request not found');
    l.status = 'approved';
    return delay({ success: true, leave: structuredClone(l) });
  },

  rejectLeave: (leaveId) => {
    const l = state.leave.find((x) => x.id === Number(leaveId));
    if (!l) return fail('Leave request not found');
    l.status = 'rejected';
    return delay({ success: true, leave: structuredClone(l) });
  },

  approveReward: (rewardId) => {
    const r = state.rewards.find((x) => x.id === Number(rewardId));
    if (!r) return fail('Reward request not found');
    r.status = 'approved';
    return delay({ success: true, reward: structuredClone(r) });
  },

  // Owner System Configuration
  getSettings: () => delay(structuredClone(state.settings)),

  updateSettings: (newSettings) => {
    if (!newSettings) return fail('Invalid settings payload');
    state.settings = {
      ...state.settings,
      ...newSettings,
      red_penalty_egp:
        newSettings.red_penalty_egp !== undefined
          ? Number(newSettings.red_penalty_egp)
          : state.settings.red_penalty_egp,
      black_penalty_egp:
        newSettings.black_penalty_egp !== undefined
          ? Number(newSettings.black_penalty_egp)
          : state.settings.black_penalty_egp,
    };
    return delay(structuredClone(state.settings));
  },

  // Company / Universal Business Profile Settings
  getCompanySettings: () => delay(structuredClone(state.company)),

  updateCompanySettings: (c) => {
    if (!c) return fail('Invalid company payload');
    state.company = {
      ...state.company,
      ...c,
      reward_threshold: Number(c.reward_threshold) || state.company.reward_threshold || 30,
      allow_remote: Boolean(c.allow_remote),
    };
    return delay(structuredClone(state.company));
  },

  // Multi-Branch Location Management (Anywhere in the World)
  addBranch: ({ name, lat, lng, radius = 300 }) => {
    if (!name || typeof lat !== 'number' || typeof lng !== 'number') {
      return fail('Branch name and valid GPS latitude & longitude are required');
    }
    const newBranch = {
      id: Date.now(),
      name: name.trim(),
      lat: Number(lat),
      lng: Number(lng),
      radius: Number(radius) || 300,
    };
    state.company.branches.push(newBranch);
    return delay(newBranch);
  },

  removeBranch: (branchId) => {
    const idx = state.company.branches.findIndex((b) => b.id === Number(branchId));
    if (idx === -1) return fail('Branch not found');
    const [removed] = state.company.branches.splice(idx, 1);
    return delay({ success: true, removed });
  },

  // Owner User Management
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

  resetUserPassword: (userId, new_password) => {
    if (!new_password || !new_password.trim()) {
      return fail('Password cannot be empty');
    }
    const user = state.users.find((u) => u.id === Number(userId));
    if (!user) return fail('User not found');
    user.password = new_password.trim();
    user.updated_at = new Date().toISOString();
    return delay({
      success: true,
      message: `Password for "${user.name || user.username}" reset successfully.`,
      user_id: user.id,
    });
  },

  // Points History & Monthly Attendance Calendar Queries
  getPointsHistory: () => delay(structuredClone(state.history)),

  getAttendanceCalendar: () => delay(structuredClone(state.calendar)),

  // Payroll CSV Export
  exportPayrollCsv: () => {
    const currency = state.company.currency || 'EGP';
    const redVal = Number(state.settings.red_penalty_egp) || 250;
    const blackVal = Number(state.settings.black_penalty_egp) || 1000;

    const headers = [
      'Employee ID',
      'Name',
      'Username',
      'Role',
      'Green Points',
      'Red Penalties',
      `Red Deduction (${currency})`,
      'Black Penalties',
      `Black Deduction (${currency})`,
      `Total Deductions (${currency})`,
      'Approved Rewards',
      `Net Adjustment (${currency})`,
    ];

    const rows = state.users.map((u) => {
      const redDed = (u.red || 0) * redVal;
      const blackDed = (u.black || 0) * blackVal;
      const totalDed = redDed + blackDed;
      const userApprovedRewards = state.rewards.filter(
        (r) => r.user_id === u.id && r.status === 'approved'
      );
      const rewardValuation = userApprovedRewards.length * 2200;
      const net = rewardValuation - totalDed;
      return [
        `#${u.id}`,
        `"${u.name || u.username}"`,
        `"${u.username}"`,
        u.role || 'employee',
        u.green || 0,
        u.red || 0,
        redDed,
        u.black || 0,
        blackDed,
        totalDed,
        userApprovedRewards.length,
        net,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    return delay({
      filename: `payroll-report-${(state.company.company_name || 'attendance').toLowerCase().replace(/\s+/g, '-')}.csv`,
      csv: csvContent,
      rowCount: state.users.length,
    });
  },

  __resetState: () => {
    state.green = 27;
    state.red = 1;
    state.black = 0;
    state.settings = { ...initialSettings };
    state.company = structuredClone(initialCompany);
    state.users = structuredClone(initialUsers);
    state.history = structuredClone(initialHistory);
    state.calendar = structuredClone(initialCalendar);
  },
};

export { haversineDistance, findNearestBranch };
