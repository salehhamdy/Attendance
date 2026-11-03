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

export const SUPERADMIN_EMAIL = 'salehhamdy599@gmail.com';

export const initialSuperadmin = {
  id: 0,
  name: 'Saleh Hamdy',
  username: 'salehhamdy599@gmail.com',
  email: 'salehhamdy599@gmail.com',
  workspace: 'Global Platform',
  role: 'superadmin',
  status: 'active',
  is_immutable: true,
};

export const initialOwners = [
  {
    id: 99,
    name: 'Resort Owner',
    username: 'owner',
    email: 'owner@rixos.com',
    workspace: 'Universal Attendance System',
    role: 'owner',
    status: 'active',
    team_size: 0,
  },
  {
    id: 10,
    name: 'Layla Mansour',
    username: 'layla',
    email: 'layla@acme.com',
    workspace: 'Acme Resorts Sharm',
    role: 'owner',
    status: 'active',
    team_size: 12,
  },
  {
    id: 11,
    name: 'Karim Jaber',
    username: 'kjaber',
    email: 'kjaber@beta.io',
    workspace: 'Beta Studios Sharm',
    role: 'owner',
    status: 'active',
    team_size: 9,
  },
  {
    id: 12,
    name: 'Nour Bakr',
    username: 'nour',
    email: 'nour@nile.co',
    workspace: 'Nile Media Group',
    role: 'owner',
    status: 'suspended',
    team_size: 7,
  },
  {
    id: 13,
    name: 'Rania Mostafa',
    username: 'rania',
    email: 'rania@hub.dev',
    workspace: 'Red Sea Hub',
    role: 'owner',
    status: 'active',
    team_size: 6,
  },
  {
    id: 14,
    name: 'Ahmed Hassan',
    username: 'ahassan',
    email: 'ahmed@core.app',
    workspace: 'Core Creative',
    role: 'owner',
    status: 'active',
    team_size: 4,
  },
];

export const initialShifts = [
  {
    id: 1,
    name: 'Morning Shift',
    start_time: '07:00',
    end_time: '15:00',
    description: 'Resort morning & breakfast photography',
  },
  {
    id: 2,
    name: 'Evening Shift',
    start_time: '15:00',
    end_time: '23:00',
    description: 'Sunset sessions, beach parties & galas',
  },
  {
    id: 3,
    name: 'Night Shift',
    start_time: '23:00',
    end_time: '07:00',
    description: 'Overnight photo editing & system maintenance',
  },
];

const initialUsers = [
  { id: 1, owner_id: 99, name: 'rico', username: 'rico', role: 'employee', status: 'active', green: 27, red: 1, black: 0, shift_id: 1, shift_name: 'Morning Shift' },
  { id: 2, owner_id: 99, name: 'sara', username: 'sara', role: 'employee', status: 'active', green: 10, red: 0, black: 1, shift_id: 2, shift_name: 'Evening Shift' },
  { id: 3, owner_id: 99, name: 'ahmed', username: 'ahmed', role: 'employee', status: 'active', green: 30, red: 0, black: 0, shift_id: 1, shift_name: 'Morning Shift' },
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

export const initialAuditLogs = [
  { id: 1, timestamp: '2026-11-03 14:15', actor: 'salehhamdy599@gmail.com', action: 'SUPERADMIN_OTP_VERIFIED', ip: '197.38.12.94 (Cairo, EG)', detail: 'Root superadmin session authenticated via 6-digit Email OTP' },
  { id: 2, timestamp: '2026-11-03 14:10', actor: 'salehhamdy599@gmail.com', action: 'SUPERADMIN_OTP_DISPATCHED', ip: '197.38.12.94 (Cairo, EG)', detail: 'Verification code dispatched to salehhamdy599@gmail.com' },
  { id: 3, timestamp: '2026-11-03 13:50', actor: 'salehhamdy599@gmail.com', action: 'SECURITY_AUDIT_CHECK', ip: '197.38.12.94 (Cairo, EG)', detail: 'Enforced root account immutability & cascading protections' },
  { id: 4, timestamp: '2026-11-03 12:30', actor: 'Layla Mansour', action: 'BRANCH_GEOFENCE_UPDATED', ip: '156.204.8.12 (Sharm El-Sheikh, EG)', detail: 'Configured 300m radius geofence for Rixos Radamis branch' },
  { id: 5, timestamp: '2026-11-03 11:15', actor: 'salehhamdy599@gmail.com', action: 'OWNER_PROVISIONED', ip: '197.38.12.94 (Cairo, EG)', detail: 'Provisioned owner Layla Mansour assigned to Acme Resorts Sharm' },
];

const state = {
  green: 27,
  red: 1,
  black: 0,
  settings: { ...initialSettings },
  company: structuredClone(initialCompany),
  superadmin: structuredClone(initialSuperadmin),
  superadminOtp: '849201',
  kiosk_code: 'SHARM1',
  owners: structuredClone(initialOwners),
  audit_logs: structuredClone(initialAuditLogs),
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
  shifts: structuredClone(initialShifts),
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
    const uLower = username.toLowerCase();

    // 1. Superadmin role - Exclusively reserved for salehhamdy599@gmail.com with email OTP verification
    if (uLower === 'superadmin' || uLower === SUPERADMIN_EMAIL.toLowerCase()) {
      const validCodes = [state.superadminOtp, '123456', '849201', 'adminpass'];
      if (!validCodes.includes(password.trim())) {
        return fail(`Invalid OTP code. Superadmin access requires the OTP verification code sent to ${SUPERADMIN_EMAIL}.`);
      }
      return delay({
        access_token: 'mock-jwt-token-superadmin',
        role: 'superadmin',
        username: SUPERADMIN_EMAIL,
        name: 'Saleh Hamdy',
        email: SUPERADMIN_EMAIL,
        company_name: 'Platform Control Center',
      });
    }

    // 2. Check if user is an owner
    const matchedOwner = state.owners.find(
      (o) => o.username.toLowerCase() === uLower || o.email.toLowerCase() === uLower
    );
    if (matchedOwner) {
      if (matchedOwner.status === 'suspended') {
        return fail(
          'Account suspended: Your organization owner has been suspended by the platform superadmin. Access is restricted until reinstated.'
        );
      }
      return delay({
        access_token: `mock-jwt-token-owner-${matchedOwner.id}`,
        role: 'owner',
        username: matchedOwner.username,
        name: matchedOwner.name,
        company_name: matchedOwner.workspace || state.company.company_name,
      });
    }

    // 3. Check if user is an employee
    const matchedUser = state.users.find((u) => u.username.toLowerCase() === uLower);
    if (matchedUser) {
      if (matchedUser.status === 'suspended') {
        return fail(
          'Account suspended: Your organization owner has been suspended by the platform superadmin. Access is restricted until reinstated.'
        );
      }
      return delay({
        access_token: `mock-jwt-token-photographer-${matchedUser.id}`,
        role: matchedUser.role || 'employee',
        username: matchedUser.username,
        name: matchedUser.name,
        company_name: state.company.company_name,
      });
    }

    const role = uLower === 'owner' ? 'owner' : 'employee';
    return delay({
      access_token: 'mock-jwt-token-photographer',
      role,
      username,
      name: username,
      company_name: state.company.company_name,
    });
  },

  summary: () => delay(summary()),

  checkin: (lat, lng, extras = {}) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return fail('Invalid GPS coordinates provided');
    }

    // Verify active user suspension
    const activeUser = state.users.find((u) => u.id === 1);
    if (activeUser && activeUser.status === 'suspended') {
      return fail(
        'Account suspended: Your organization owner has been suspended by the platform superadmin. Access is restricted until reinstated.'
      );
    }

    // GPS Accuracy validation & Anti-spoofing filter
    const acc = typeof extras.accuracy === 'number' ? extras.accuracy : 15;
    const hasKiosk = Boolean(extras.kiosk_code && extras.kiosk_code.trim().toUpperCase() === state.kiosk_code);

    if (extras.kiosk_code && !hasKiosk) {
      return fail('Invalid On-Site Kiosk Code. Please check the code displayed at your workplace.');
    }

    if (acc > 150 && !state.company.allow_remote && !hasKiosk) {
      return fail(
        `GPS accuracy is too low (±${Math.round(acc)}m). Potential simulated location detected. Please move to clear skies or scan on-site Kiosk QR.`
      );
    }

    const { branch, distance, inZone } = findNearestBranch(lat, lng, state.company.branches);
    const allowRemote = Boolean(state.company.allow_remote);

    if (!allowRemote && !inZone && !hasKiosk) {
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
      photo: extras.photo || null,
      accuracy: acc,
      kiosk_verified: Boolean(extras.kiosk_code),
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
      photo: extras.photo || null,
      accuracy: acc,
      kiosk_verified: Boolean(extras.kiosk_code),
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
      shifts: structuredClone(state.shifts),
      leave_requests: structuredClone(state.leave),
      reward_requests: structuredClone(state.rewards),
    }),

  ownerAdjust: ({ user_id, color, delta, reason }) => {
    if (user_id === 0 || Number(user_id) === 0 || Number(user_id) === state.superadmin.id) {
      return fail('Operation prohibited: The superadmin account is immutable and cannot be removed, suspended, or modified.');
    }
    if (user_id === undefined || user_id === null || user_id === '' || !color || delta === undefined || !reason) {
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
  addUser: ({ name, username, role = 'employee', owner_id = 99, shift_id }) => {
    if (!name || !username) return fail('Name and username are required');
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername === 'superadmin') {
      return fail('Operation prohibited: The superadmin username is reserved and immutable.');
    }
    const exists = state.users.some(
      (u) => u.username.toLowerCase() === cleanUsername
    );
    if (exists) return fail(`Username "${username}" already exists`);

    const assignedShift =
      (shift_id && state.shifts.find((s) => s.id === Number(shift_id))) ||
      state.shifts[0];

    const newUser = {
      id: Date.now(),
      owner_id: Number(owner_id) || 99,
      name: name.trim(),
      username: username.trim(),
      role: role || 'employee',
      status: 'active',
      green: 0,
      red: 0,
      black: 0,
      shift_id: assignedShift ? assignedShift.id : 1,
      shift_name: assignedShift ? assignedShift.name : 'Morning Shift',
    };
    state.users.push(newUser);
    return delay(newUser);
  },

  removeUser: (userId) => {
    const uId = Number(userId);
    if (uId === 0 || uId === state.superadmin.id) {
      return fail('Operation prohibited: The superadmin account is immutable and cannot be removed, suspended, or modified.');
    }
    const idx = state.users.findIndex((u) => u.id === uId);
    if (idx === -1) return fail('User not found');
    const [removed] = state.users.splice(idx, 1);
    return delay({ success: true, removed });
  },

  resetUserPassword: (userId, new_password) => {
    const uId = Number(userId);
    if (uId === 0 || uId === state.superadmin.id) {
      return fail('Operation prohibited: The superadmin account is immutable and cannot be removed, suspended, or modified.');
    }
    if (!new_password || !new_password.trim()) {
      return fail('Password cannot be empty');
    }
    const user = state.users.find((u) => u.id === uId) || state.owners.find((o) => o.id === uId);
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

  // Superadmin Management APIs
  superadminOwners: () => {
    const list = state.owners.map((o) => {
      const dynamicTeamCount = state.users.filter((u) => u.owner_id === o.id).length;
      return {
        ...o,
        team_size: (o.team_size || 0) + dynamicTeamCount,
      };
    });
    const totalMembers = list.reduce((acc, o) => acc + (o.team_size || 0), 0);
    return delay({
      superadmin: structuredClone(state.superadmin),
      owners: structuredClone(list),
      stats: {
        total_owners: list.length,
        active_owners: list.filter((o) => o.status === 'active').length,
        suspended_owners: list.filter((o) => o.status === 'suspended').length,
        total_team_members: totalMembers,
      },
    });
  },

  createOwner: ({ name, username, email, workspace, password }) => {
    if (!name || !username || !workspace) {
      return fail('Owner name, username, and assigned workspace are required');
    }
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername === 'superadmin') {
      return fail('Operation prohibited: The superadmin username is reserved and immutable.');
    }
    const exists = state.owners.some((o) => o.username.toLowerCase() === cleanUsername);
    if (exists) {
      return fail(`Owner with username "${username}" already exists`);
    }

    const newOwner = {
      id: Date.now(),
      name: name.trim(),
      username: username.trim(),
      email: email ? email.trim() : `${cleanUsername}@platform.com`,
      workspace: workspace.trim(),
      role: 'owner',
      status: 'active',
      team_size: 0,
      password: password || 'OwnerPass123!',
      created_at: new Date().toISOString(),
    };
    state.owners.push(newOwner);
    return delay(structuredClone(newOwner));
  },

  suspendOwner: (ownerId) => {
    const oId = Number(ownerId);
    if (oId === 0 || oId === state.superadmin.id) {
      return fail('Operation prohibited: The superadmin account is immutable and cannot be removed, suspended, or modified.');
    }
    const owner = state.owners.find((o) => o.id === oId);
    if (!owner) return fail('Owner not found');

    owner.status = 'suspended';
    let suspendedCount = 0;
    state.users.forEach((u) => {
      if (u.owner_id === oId || (oId === 99 && (u.owner_id === undefined || u.owner_id === 99))) {
        u.status = 'suspended';
        suspendedCount++;
      }
    });

    return delay({
      success: true,
      message: `Owner "${owner.name}" and team (${suspendedCount + (owner.team_size || 0)} members) suspended simultaneously.`,
      owner: structuredClone(owner),
      suspended_team_count: suspendedCount,
    });
  },

  reinstateOwner: (ownerId) => {
    const oId = Number(ownerId);
    const owner = state.owners.find((o) => o.id === oId);
    if (!owner) return fail('Owner not found');

    owner.status = 'active';
    let reinstatedCount = 0;
    state.users.forEach((u) => {
      if (u.owner_id === oId || (oId === 99 && (u.owner_id === undefined || u.owner_id === 99))) {
        u.status = 'active';
        reinstatedCount++;
      }
    });

    return delay({
      success: true,
      message: `Owner "${owner.name}" reinstated. Entire team access restored.`,
      owner: structuredClone(owner),
      reinstated_team_count: reinstatedCount,
    });
  },

  removeOwner: (ownerId) => {
    const oId = Number(ownerId);
    if (oId === 0 || oId === state.superadmin.id) {
      return fail('Operation prohibited: The superadmin account is immutable and cannot be removed, suspended, or modified.');
    }
    const idx = state.owners.findIndex((o) => o.id === oId);
    if (idx === -1) return fail('Owner not found');

    const [removed] = state.owners.splice(idx, 1);

    // Cascading removal: permanently delete all team members under this owner
    const removedUserIds = [];
    state.users = state.users.filter((u) => {
      if (u.owner_id === oId || (oId === 99 && (u.owner_id === undefined || u.owner_id === 99))) {
        removedUserIds.push(u.id);
        return false;
      }
      return true;
    });

    state.leave = state.leave.filter((l) => !removedUserIds.includes(l.user_id));
    state.rewards = state.rewards.filter((r) => !removedUserIds.includes(r.user_id));

    return delay({
      success: true,
      message: `Owner "${removed.name}" and all team members permanently removed.`,
      removed_owner: structuredClone(removed),
      removed_team_count: removedUserIds.length + (removed.team_size || 0),
    });
  },

  requestSuperadminOtp: (email) => {
    if (!email || email.trim().toLowerCase() !== SUPERADMIN_EMAIL.toLowerCase()) {
      return fail(
        'Access denied: This email is not authorized for the Superadmin Console.'
      );
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    state.superadminOtp = code;
    return delay({
      success: true,
      message: 'OTP verification code sent to your authorized email address.',
      otp: code,
    });
  },

  verifySuperadminOtp: (email, otp) => {
    if (!email || email.trim().toLowerCase() !== SUPERADMIN_EMAIL.toLowerCase()) {
      return fail(
        'Access denied: This email is not authorized for the Superadmin Console.'
      );
    }
    const validCodes = [state.superadminOtp, '123456', '849201', 'adminpass'];
    if (!otp || !validCodes.includes(String(otp).trim())) {
      return fail('Invalid or expired OTP verification code. Please check your email and try again.');
    }
    return delay({
      access_token: 'mock-jwt-token-superadmin',
      role: 'superadmin',
      username: SUPERADMIN_EMAIL,
      name: 'Saleh Hamdy',
      email: SUPERADMIN_EMAIL,
      company_name: 'Platform Control Center',
    });
  },

  getKioskCode: () => delay({ kiosk_code: state.kiosk_code || 'SHARM1' }),

  rotateKioskCode: () => {
    state.kiosk_code = 'K' + Math.random().toString(36).substring(2, 7).toUpperCase();
    return delay({ success: true, kiosk_code: state.kiosk_code });
  },

  getAuditLogs: () => delay(structuredClone(state.audit_logs)),

  exportAuditLogsCsv: () => {
    const header = 'ID,Timestamp,Actor,Action,IP_Location,Detail\n';
    const rows = state.audit_logs
      .map(
        (l) =>
          `${l.id},"${l.timestamp}","${l.actor}","${l.action}","${l.ip}","${String(l.detail).replace(/"/g, '""')}"`
      )
      .join('\n');
    return delay(header + rows);
  },

  // Shifts & Multi-Shift Scheduling Management
  getShifts: () => delay(structuredClone(state.shifts)),

  createShift: ({ name, start_time, end_time, description = '' }) => {
    if (!name || !start_time || !end_time) {
      return fail('Shift name, start time, and end time are required');
    }
    const newShift = {
      id: Date.now(),
      name: name.trim(),
      start_time: start_time.trim(),
      end_time: end_time.trim(),
      description: description.trim(),
    };
    state.shifts.push(newShift);
    return delay(newShift);
  },

  deleteShift: (shiftId) => {
    const sId = Number(shiftId);
    const idx = state.shifts.findIndex((s) => s.id === sId);
    if (idx === -1) return fail('Shift schedule not found');
    const [removed] = state.shifts.splice(idx, 1);
    const fallback = state.shifts[0];
    state.users.forEach((u) => {
      if (u.shift_id === sId) {
        u.shift_id = fallback ? fallback.id : null;
        u.shift_name = fallback ? fallback.name : 'Unassigned';
      }
    });
    return delay({ success: true, removed });
  },

  assignUserShift: (userId, shiftId) => {
    const u = state.users.find((user) => user.id === Number(userId));
    if (!u) return fail('User not found');
    const shift = state.shifts.find((s) => s.id === Number(shiftId));
    if (!shift) return fail('Shift schedule not found');
    u.shift_id = shift.id;
    u.shift_name = shift.name;
    return delay({
      success: true,
      message: `Assigned ${u.name || u.username} to ${shift.name}.`,
      user: structuredClone(u),
    });
  },

  __resetState: () => {
    state.green = 27;
    state.red = 1;
    state.black = 0;
    state.settings = { ...initialSettings };
    state.company = structuredClone(initialCompany);
    state.superadmin = structuredClone(initialSuperadmin);
    state.superadminOtp = '849201';
    state.kiosk_code = 'SHARM1';
    state.owners = structuredClone(initialOwners);
    state.users = structuredClone(initialUsers);
    state.shifts = structuredClone(initialShifts);
    state.history = structuredClone(initialHistory);
    state.calendar = structuredClone(initialCalendar);
    state.audit_logs = structuredClone(initialAuditLogs);
  },
};

export { haversineDistance, findNearestBranch };
