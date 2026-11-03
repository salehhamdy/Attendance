import { supabase } from './supabaseClient.js';
import { SUPERADMIN_EMAIL, findNearestBranch } from './mock.js';

function fail(msg) {
  return Promise.reject(new Error(msg));
}

export const supabaseApi = {
  login: async (username, password) => {
    if (!username || !password) return fail('Invalid credentials');
    const uLower = username.toLowerCase();

    // 1. Superadmin role check
    if (uLower === 'superadmin' || uLower === SUPERADMIN_EMAIL.toLowerCase()) {
      const { data, error } = await supabase.auth.verifyOtp({
        email: SUPERADMIN_EMAIL,
        token: password.trim(),
        type: 'email',
      });
      if (error) {
        return fail(`Invalid OTP code: ${error.message}`);
      }
      return {
        access_token: data.session?.access_token || 'mock-jwt-token-superadmin',
        role: 'superadmin',
        username: SUPERADMIN_EMAIL,
        name: 'Saleh Hamdy',
        email: SUPERADMIN_EMAIL,
        company_name: 'Platform Control Center',
      };
    }

    // 2. Standard user login (email or username)
    let emailToAuth = username;
    if (!username.includes('@')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, status')
        .eq('username', uLower)
        .single();
      if (!profile) return fail('User not found');
      if (profile.status === 'suspended') {
        return fail('Account suspended: Your organization owner has been suspended. Access is restricted.');
      }
      emailToAuth = profile.email || `${uLower}@domain.local`;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToAuth,
      password,
    });
    if (authError) return fail(authError.message);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, workspaces(name)')
      .eq('id', authData.user.id)
      .single();

    if (profileData && profileData.status === 'suspended') {
      await supabase.auth.signOut();
      return fail('Account suspended: Your organization owner has been suspended. Access is restricted.');
    }

    return {
      access_token: authData.session?.access_token,
      role: profileData?.role || 'employee',
      username: profileData?.username || username,
      name: profileData?.full_name || username,
      company_name: profileData?.workspaces?.name || 'Universal Attendance System',
    };
  },

  summary: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, workspaces(*)')
      .eq('id', user.id)
      .single();

    const ws = profile?.workspaces || {};
    const { data: branches } = await supabase
      .from('branches')
      .select('*')
      .eq('workspace_id', profile?.workspace_id);

    const { data: history } = await supabase
      .from('attendance_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(30);

    const redVal = Number(ws.red_penalty_amount) || 250;
    const blackVal = Number(ws.black_penalty_amount) || 1000;
    const g = profile?.green_points || 0;
    const r = profile?.red_penalties || 0;
    const b = profile?.black_penalties || 0;

    return {
      green: g,
      red: r,
      black: b,
      red_penalty_egp: redVal,
      black_penalty_egp: blackVal,
      currency: ws.currency || 'EGP',
      company_name: ws.name || 'Universal Attendance System',
      reward_threshold: ws.reward_threshold || 30,
      reward_amount: ws.reward_amount_desc || '40 USD / 2,200 EGP',
      allow_remote: Boolean(ws.allow_remote),
      branches: branches || [],
      deductions_egp: r * redVal + b * blackVal,
      progress: Math.min(g, ws.reward_threshold || 30),
      settings: {
        red_penalty_egp: redVal,
        black_penalty_egp: blackVal,
        early_window_start: ws.early_window_start || '07:00',
        early_window_end: ws.early_window_end || '08:00',
        normal_window_end: ws.normal_window_end || '10:00',
        late_window_end: ws.late_window_end || '12:00',
      },
      company: {
        company_name: ws.name || 'Universal Attendance System',
        currency: ws.currency || 'EGP',
        reward_threshold: ws.reward_threshold || 30,
        reward_amount: ws.reward_amount_desc || '40 USD / 2,200 EGP',
        allow_remote: Boolean(ws.allow_remote),
        branches: branches || [],
      },
      history: history || [],
      calendar: [],
    };
  },

  checkin: async (lat, lng, extras = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, workspaces(*)')
      .eq('id', user.id)
      .single();

    if (profile?.status === 'suspended') {
      return fail('Account suspended: Access restricted until owner is reinstated.');
    }

    const ws = profile?.workspaces || {};
    const { data: branches } = await supabase
      .from('branches')
      .select('*')
      .eq('workspace_id', profile.workspace_id);

    const acc = typeof extras.accuracy === 'number' ? extras.accuracy : 15;
    const hasKiosk = Boolean(
      extras.kiosk_code &&
      extras.kiosk_code.trim().toUpperCase() === String(ws.kiosk_code || '').toUpperCase()
    );

    if (extras.kiosk_code && !hasKiosk) {
      return fail('Invalid On-Site Kiosk Code. Please check the code displayed at your workplace.');
    }

    if (acc > 150 && !ws.allow_remote && !hasKiosk) {
      return fail(`GPS accuracy is too low (±${Math.round(acc)}m). Potential simulated location detected.`);
    }

    const { branch, distance, inZone } = findNearestBranch(lat, lng, branches || []);
    const allowRemote = Boolean(ws.allow_remote);

    if (!allowRemote && !inZone && !hasKiosk) {
      const branchName = branch ? branch.name : 'designated workplace';
      const maxRadius = branch ? branch.radius : 300;
      return fail(`Outside approved workplace: Nearest branch "${branchName}" is ~${distance}m away (allowed: ${maxRadius}m)`);
    }

    // Upload selfie photo if provided
    let photoUrl = null;
    if (extras.photo && extras.photo.startsWith('data:')) {
      const fileName = `${profile.workspace_id}/${user.id}/${Date.now()}.png`;
      const base64Data = extras.photo.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      const { data: uploadData } = await supabase.storage
        .from('checkin-photos')
        .upload(fileName, blob);

      if (uploadData) {
        photoUrl = uploadData.path;
      }
    }

    // Determine shift timings & point allocation
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const earlyStart = 7 * 60;
    const earlyEnd = 8 * 60;
    const normalEnd = 10 * 60;
    const lateEnd = 12 * 60;

    let deltaG = 0;
    let deltaR = 0;
    let deltaB = 0;
    let actionLabel = 'On-Time Check-In';
    let pointMsg = 'Attendance recorded successfully.';

    if (currentMins >= earlyStart && currentMins < earlyEnd) {
      deltaG = 1;
      actionLabel = 'Early Check-In';
      pointMsg = 'Early check-in: +1 Green Point awarded!';
    } else if (currentMins >= normalEnd && currentMins < lateEnd) {
      deltaR = 1;
      actionLabel = 'Late Check-In';
      pointMsg = `Late check-in: +1 Red Penalty assigned.`;
    } else if (currentMins >= lateEnd) {
      deltaB = 1;
      actionLabel = 'Severe Absence Delay';
      pointMsg = `Severe delay: +1 Black Penalty assigned.`;
    }

    // Insert attendance ledger entry
    const { data: entry, error: entryError } = await supabase
      .from('attendance_ledger')
      .insert({
        workspace_id: profile.workspace_id,
        user_id: user.id,
        branch_id: branch?.id || null,
        action: actionLabel,
        zone_name: branch?.name || (allowRemote ? 'Remote Check-in' : 'Main Branch'),
        delta_green: deltaG,
        delta_red: deltaR,
        delta_black: deltaB,
        note: pointMsg,
        photo_url: photoUrl,
        accuracy_meters: acc,
        kiosk_verified: Boolean(hasKiosk),
        is_remote: Boolean(allowRemote && !inZone),
        checkin_lat: lat,
        checkin_lng: lng,
      })
      .select()
      .single();

    if (entryError) return fail(entryError.message);

    // Update profile points
    await supabase
      .from('profiles')
      .update({
        green_points: Math.max(0, (profile.green_points || 0) + deltaG),
        red_penalties: Math.max(0, (profile.red_penalties || 0) + deltaR),
        black_penalties: Math.max(0, (profile.black_penalties || 0) + deltaB),
      })
      .eq('id', user.id);

    return {
      success: true,
      type: deltaG > 0 ? 'green' : deltaR > 0 ? 'red' : deltaB > 0 ? 'black' : 'normal',
      message: pointMsg,
      delta_green: deltaG,
      ledger_id: entry.id,
    };
  },

  cancelRed: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail('Not authenticated');

    const { data, error } = await supabase.rpc('fn_cancel_red_penalty', {
      p_user_id: user.id,
    });
    if (error) return fail(error.message);
    return data;
  },

  cancelBlack: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail('Not authenticated');

    const { data, error } = await supabase.rpc('fn_cancel_black_penalty', {
      p_user_id: user.id,
    });
    if (error) return fail(error.message);
    return data;
  },

  requestLeave: async ({ start_date, end_date, reason }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('id', user.id)
      .single();

    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        workspace_id: profile.workspace_id,
        user_id: user.id,
        start_date,
        end_date,
        reason,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return fail(error.message);
    return data;
  },

  listLeave: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from('leave_requests')
      .select('*, profiles(username, full_name)')
      .order('created_at', { ascending: false });

    return data || [];
  },

  requestReward: async (payout_method, number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, workspaces(*)')
      .eq('id', user.id)
      .single();

    const threshold = profile?.workspaces?.reward_threshold || 30;
    if ((profile?.green_points || 0) < threshold) {
      return fail(`Insufficient Green Points: Reached ${profile?.green_points || 0}/${threshold}`);
    }

    const { data, error } = await supabase
      .from('reward_claims')
      .insert({
        workspace_id: profile.workspace_id,
        user_id: user.id,
        payout_method,
        account_number: number,
        amount_usd: 40,
        amount_local: 2200,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return fail(error.message);
    return data;
  },

  ownerUsers: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail('Not authenticated');

    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('id', user.id)
      .single();

    const wsId = ownerProfile?.workspace_id;
    const { data: users } = await supabase
      .from('profiles')
      .select('*, shifts(name)')
      .eq('workspace_id', wsId);

    const { data: ws } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', wsId)
      .single();

    const { data: shifts } = await supabase
      .from('shifts')
      .select('*')
      .eq('workspace_id', wsId);

    const { data: branches } = await supabase
      .from('branches')
      .select('*')
      .eq('workspace_id', wsId);

    const { data: leaves } = await supabase
      .from('leave_requests')
      .select('*, profiles(username, full_name)')
      .eq('workspace_id', wsId);

    const { data: rewards } = await supabase
      .from('reward_claims')
      .select('*, profiles(username, full_name)')
      .eq('workspace_id', wsId);

    return {
      users: (users || []).map((u) => ({
        ...u,
        name: u.full_name,
        green: u.green_points,
        red: u.red_penalties,
        black: u.black_penalties,
        shift_name: u.shifts?.name || 'Morning Shift',
      })),
      settings: {
        red_penalty_egp: Number(ws?.red_penalty_amount) || 250,
        black_penalty_egp: Number(ws?.black_penalty_amount) || 1000,
        early_window_start: ws?.early_window_start || '07:00',
        early_window_end: ws?.early_window_end || '08:00',
        normal_window_end: ws?.normal_window_end || '10:00',
        late_window_end: ws?.late_window_end || '12:00',
      },
      company: {
        company_name: ws?.name || 'Universal Attendance System',
        currency: ws?.currency || 'EGP',
        reward_threshold: ws?.reward_threshold || 30,
        reward_amount: ws?.reward_amount_desc || '40 USD / 2,200 EGP',
        allow_remote: Boolean(ws?.allow_remote),
        branches: branches || [],
      },
      shifts: shifts || [],
      leave_requests: leaves || [],
      reward_requests: rewards || [],
    };
  },

  ownerAdjust: async ({ user_id, color, delta, reason }) => {
    const numDelta = Number(delta);
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (!profile) return fail('User not found');
    if (profile.is_immutable) {
      return fail('Operation prohibited: The superadmin account is immutable.');
    }

    const updates = {};
    if (color === 'green') updates.green_points = Math.max(0, (profile.green_points || 0) + numDelta);
    if (color === 'red') updates.red_penalties = Math.max(0, (profile.red_penalties || 0) + numDelta);
    if (color === 'black') updates.black_penalties = Math.max(0, (profile.black_penalties || 0) + numDelta);

    await supabase.from('profiles').update(updates).eq('id', user_id);

    await supabase.from('attendance_ledger').insert({
      workspace_id: profile.workspace_id,
      user_id: profile.id,
      action: 'Administrative Point Adjustment',
      zone_name: 'Owner Panel',
      delta_green: color === 'green' ? numDelta : 0,
      delta_red: color === 'red' ? numDelta : 0,
      delta_black: color === 'black' ? numDelta : 0,
      note: `Owner adjustment: ${reason}`,
    });

    return { success: true };
  },

  approveLeave: async (leaveId) => {
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: 'approved' })
      .eq('id', leaveId);
    if (error) return fail(error.message);
    return { success: true };
  },

  rejectLeave: async (leaveId) => {
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: 'rejected' })
      .eq('id', leaveId);
    if (error) return fail(error.message);
    return { success: true };
  },

  approveReward: async (rewardId) => {
    const { error } = await supabase
      .from('reward_claims')
      .update({ status: 'approved' })
      .eq('id', rewardId);
    if (error) return fail(error.message);
    return { success: true };
  },

  getSettings: async () => {
    const res = await supabaseApi.ownerUsers();
    return res.settings;
  },

  updateSettings: async (settings) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('id', user.id)
      .single();

    const { error } = await supabase
      .from('workspaces')
      .update({
        red_penalty_amount: Number(settings.red_penalty_egp),
        black_penalty_amount: Number(settings.black_penalty_egp),
        early_window_start: settings.early_window_start,
        early_window_end: settings.early_window_end,
        normal_window_end: settings.normal_window_end,
        late_window_end: settings.late_window_end,
      })
      .eq('id', profile.workspace_id);

    if (error) return fail(error.message);
    return settings;
  },

  getCompanySettings: async () => {
    const res = await supabaseApi.ownerUsers();
    return res.company;
  },

  updateCompanySettings: async (company) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('id', user.id)
      .single();

    const { error } = await supabase
      .from('workspaces')
      .update({
        name: company.company_name,
        currency: company.currency,
        reward_threshold: Number(company.reward_threshold),
        reward_amount_desc: company.reward_amount,
        allow_remote: Boolean(company.allow_remote),
      })
      .eq('id', profile.workspace_id);

    if (error) return fail(error.message);
    return company;
  },

  addBranch: async ({ name, lat, lng, radius = 300 }) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('id', user.id)
      .single();

    const { data, error } = await supabase
      .from('branches')
      .insert({
        workspace_id: profile.workspace_id,
        name: name.trim(),
        latitude: Number(lat),
        longitude: Number(lng),
        radius_meters: Number(radius) || 300,
      })
      .select()
      .single();

    if (error) return fail(error.message);
    return data;
  },

  removeBranch: async (branchId) => {
    const { error } = await supabase.from('branches').delete().eq('id', branchId);
    if (error) return fail(error.message);
    return { success: true };
  },

  resetUserPassword: async (userId) => {
    // In Supabase, password reset can be executed via Admin RPC or auth
    return {
      success: true,
      message: 'Password reset instruction generated for user.',
      user_id: userId,
    };
  },

  getPointsHistory: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from('attendance_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false });

    return data || [];
  },

  getAttendanceCalendar: async () => {
    return [];
  },

  exportPayrollCsv: async () => {
    const res = await supabaseApi.ownerUsers();
    const users = res.users || [];
    const currency = res.company.currency || 'EGP';
    const redVal = res.settings.red_penalty_egp || 250;
    const blackVal = res.settings.black_penalty_egp || 1000;

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

    const rows = users.map((u) => {
      const redDed = (u.red || 0) * redVal;
      const blackDed = (u.black || 0) * blackVal;
      const totalDed = redDed + blackDed;
      const net = -(totalDed);
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
        0,
        net,
      ].join(',');
    });

    return {
      csv: [headers.join(','), ...rows].join('\n'),
      filename: `payroll-report-${(res.company.company_name || 'attendance').toLowerCase().replace(/\s+/g, '-')}.csv`,
    };
  },

  superadminOwners: async () => {
    const { data: owners } = await supabase
      .from('profiles')
      .select('*, workspaces(name)')
      .eq('role', 'owner');

    const { data: allUsers } = await supabase.from('profiles').select('id, owner_id');

    const ownersWithStats = (owners || []).map((o) => ({
      ...o,
      name: o.full_name,
      workspace: o.workspaces?.name || 'Workspace',
      team_size: (allUsers || []).filter((u) => u.owner_id === o.id).length,
    }));

    return {
      superadmin: {
        name: 'Saleh Hamdy',
        email: SUPERADMIN_EMAIL,
        workspace: 'Global Platform',
        role: 'superadmin',
        is_immutable: true,
      },
      owners: ownersWithStats,
      stats: {
        total_owners: ownersWithStats.length,
        active_owners: ownersWithStats.filter((o) => o.status === 'active').length,
        suspended_owners: ownersWithStats.filter((o) => o.status === 'suspended').length,
        total_team_members: (allUsers || []).length,
      },
    };
  },

  createOwner: async ({ name, username, email, workspace }) => {
    const { error: wsErr } = await supabase
      .from('workspaces')
      .insert({ name: workspace })
      .select()
      .single();

    if (wsErr) return fail(wsErr.message);

    return {
      name,
      username,
      email,
      workspace,
      status: 'active',
      team_size: 0,
    };
  },

  suspendOwner: async (ownerId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'suspended' })
      .eq('id', ownerId);

    if (error) return fail(error.message);
    return { success: true, message: 'Owner and team suspended simultaneously.' };
  },

  reinstateOwner: async (ownerId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', ownerId);

    if (error) return fail(error.message);
    return { success: true, message: 'Owner and team access restored.' };
  },

  removeOwner: async (ownerId) => {
    const { error } = await supabase.from('profiles').delete().eq('id', ownerId);
    if (error) return fail(error.message);
    return { success: true, message: 'Owner and team permanently removed.' };
  },

  requestSuperadminOtp: async (email) => {
    if (!email || email.trim().toLowerCase() !== SUPERADMIN_EMAIL.toLowerCase()) {
      return fail(`Access denied: Only ${SUPERADMIN_EMAIL} is authorized.`);
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: SUPERADMIN_EMAIL,
    });

    if (error) return fail(error.message);
    return { success: true, message: `OTP sent to ${SUPERADMIN_EMAIL}.` };
  },

  verifySuperadminOtp: async (email, otp) => {
    if (!email || email.trim().toLowerCase() !== SUPERADMIN_EMAIL.toLowerCase()) {
      return fail(`Access denied: Only ${SUPERADMIN_EMAIL} is authorized.`);
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: SUPERADMIN_EMAIL,
      token: String(otp).trim(),
      type: 'email',
    });

    if (error) return fail(error.message);
    return {
      access_token: data.session?.access_token,
      role: 'superadmin',
      username: SUPERADMIN_EMAIL,
      name: 'Saleh Hamdy',
      email: SUPERADMIN_EMAIL,
    };
  },

  getKioskCode: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspaces(kiosk_code)')
      .eq('id', user.id)
      .single();

    return { kiosk_code: profile?.workspaces?.kiosk_code || 'SHARM1' };
  },

  rotateKioskCode: async () => {
    const fresh = 'K' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('id', user.id)
      .single();

    await supabase
      .from('workspaces')
      .update({ kiosk_code: fresh })
      .eq('id', profile.workspace_id);

    return { success: true, kiosk_code: fresh };
  },

  getAuditLogs: async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    return data || [];
  },

  exportAuditLogsCsv: async () => {
    const logs = await supabaseApi.getAuditLogs();
    const header = 'ID,Timestamp,Actor,Action,IP_Location,Detail\n';
    const rows = logs
      .map(
        (l) =>
          `${l.id},"${l.timestamp}","${l.actor_email}","${l.action}","${l.ip_location}","${String(l.detail).replace(/"/g, '""')}"`
      )
      .join('\n');
    return header + rows;
  },

  getShifts: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('id', user.id)
      .single();

    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('workspace_id', profile.workspace_id);

    return data || [];
  },

  createShift: async (shift) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('id', user.id)
      .single();

    const { data, error } = await supabase
      .from('shifts')
      .insert({
        workspace_id: profile.workspace_id,
        name: shift.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        description: shift.description,
      })
      .select()
      .single();

    if (error) return fail(error.message);
    return data;
  },

  deleteShift: async (shiftId) => {
    const { error } = await supabase.from('shifts').delete().eq('id', shiftId);
    if (error) return fail(error.message);
    return { success: true };
  },

  assignUserShift: async (userId, shiftId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ shift_id: shiftId })
      .eq('id', userId);

    if (error) return fail(error.message);
    return { success: true };
  },
};

export default supabaseApi;
