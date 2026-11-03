import { describe, it, expect, beforeEach } from 'vitest';
import { mockApi, WORK_ZONE, haversineDistance } from './mock.js';

describe('Shared API Mock Module Rules', () => {
  beforeEach(() => {
    mockApi.__resetState();
  });

  it('computes deductions as 250 per red and 1000 per black by default', async () => {
    const s = await mockApi.summary();
    expect(s.deductions_egp).toBe(s.red * 250 + s.black * 1000);
  });

  it('cancelling a red spends 1 green and 1 red', async () => {
    const before = await mockApi.summary();
    const after = await mockApi.cancelRed();
    expect(after.green).toBe(before.green - 1);
    expect(after.red).toBe(before.red - 1);
  });

  it('rejects cancelling a black without an active black penalty', async () => {
    await expect(mockApi.cancelBlack()).rejects.toThrow(/Insufficient points/i);
  });

  it('caps progress at reward_threshold', async () => {
    const s = await mockApi.summary();
    expect(s.progress).toBeLessThanOrEqual(s.reward_threshold || 30);
  });

  it('requires 30 green points for a reward claim', async () => {
    await expect(mockApi.requestReward('instapay', '01012345678')).rejects.toThrow(/Green Points/i);
  });

  it('validates multi-branch geofence distance during checkin', async () => {
    // Check-in at Branch 1 (Sharm)
    const res1 = await mockApi.checkin(WORK_ZONE.lat, WORK_ZONE.lng);
    expect(res1.success).toBe(true);
    expect(res1.zone).toBe('Rixos Radamis (Sharm El-Sheikh)');

    // Check-in at Branch 2 (Cairo Headquarters: 30.0444, 31.2357)
    const res2 = await mockApi.checkin(30.0444, 31.2357);
    expect(res2.success).toBe(true);
    expect(res2.zone).toBe('Cairo Headquarters');

    // Outside all branches (e.g. London coordinates) fails when remote mode is disabled
    await expect(mockApi.checkin(51.5074, -0.1278)).rejects.toThrow(/Outside approved workplace/i);
  });

  it('allows remote check-in from anywhere in the world when allow_remote is enabled', async () => {
    await mockApi.updateCompanySettings({ allow_remote: true });

    // Check-in from anywhere (e.g. Tokyo, Japan: 35.6762, 139.6503)
    const res = await mockApi.checkin(35.6762, 139.6503);
    expect(res.success).toBe(true);
    expect(res.is_remote).toBe(true);
  });

  it('computes accurate haversine distances in meters', () => {
    const distSame = haversineDistance(27.9158, 34.33, 27.9158, 34.33);
    expect(distSame).toBe(0);

    const distOffset = haversineDistance(27.9158, 34.33, 27.9168, 34.33);
    expect(distOffset).toBeGreaterThan(50);
    expect(distOffset).toBeLessThan(200);
  });

  it('supports company settings retrieval and update', async () => {
    const initial = await mockApi.getCompanySettings();
    expect(initial.company_name).toBe('Universal Attendance System');
    expect(initial.currency).toBe('EGP');

    const updated = await mockApi.updateCompanySettings({
      company_name: 'Starlight Global',
      currency: 'USD',
      reward_threshold: 25,
      reward_amount: '$100 Bonus',
      allow_remote: true,
    });

    expect(updated.company_name).toBe('Starlight Global');
    expect(updated.currency).toBe('USD');
    expect(updated.reward_threshold).toBe(25);
    expect(updated.allow_remote).toBe(true);

    const s = await mockApi.summary();
    expect(s.company_name).toBe('Starlight Global');
    expect(s.currency).toBe('USD');
    expect(s.reward_threshold).toBe(25);
    expect(s.allow_remote).toBe(true);
  });

  it('supports adding and removing workplace branch geofences', async () => {
    const newBranch = await mockApi.addBranch({
      name: 'Dubai Hub',
      lat: 25.2048,
      lng: 55.2708,
      radius: 400,
    });
    expect(newBranch.id).toBeDefined();
    expect(newBranch.name).toBe('Dubai Hub');

    // Can now check in at Dubai Hub
    const checkinRes = await mockApi.checkin(25.2048, 55.2708);
    expect(checkinRes.success).toBe(true);
    expect(checkinRes.zone).toBe('Dubai Hub');

    // Remove branch
    const deleteRes = await mockApi.removeBranch(newBranch.id);
    expect(deleteRes.success).toBe(true);

    // After removal, Dubai coordinates should fail checkin if remote is false
    await expect(mockApi.checkin(25.2048, 55.2708)).rejects.toThrow(/Outside approved workplace/i);
  });

  it('supports leave submission, listing, approval and rejection', async () => {
    const newLeave = await mockApi.requestLeave({
      start_date: '2026-11-20',
      end_date: '2026-11-22',
      reason: 'Vacation',
    });
    expect(newLeave.id).toBeDefined();
    expect(newLeave.status).toBe('pending');

    const list = await mockApi.listLeave();
    expect(list.some((l) => l.id === newLeave.id)).toBe(true);

    await mockApi.approveLeave(newLeave.id);
    const updatedList = await mockApi.listLeave();
    const approved = updatedList.find((l) => l.id === newLeave.id);
    expect(approved.status).toBe('approved');
  });

  it('supports owner adjusting points', async () => {
    const res = await mockApi.ownerAdjust({
      user_id: 1,
      color: 'green',
      delta: 5,
      reason: 'Overtime photography shoot',
    });
    expect(res.user.green).toBeGreaterThanOrEqual(30);
  });

  it('allows owner to change penalty values and updates deductions dynamically', async () => {
    const updated = await mockApi.updateSettings({
      red_penalty_egp: 300,
      black_penalty_egp: 1200,
    });
    expect(updated.red_penalty_egp).toBe(300);
    expect(updated.black_penalty_egp).toBe(1200);

    // Summary calculation should now reflect new penalty values
    const s = await mockApi.summary();
    expect(s.red_penalty_egp).toBe(300);
    expect(s.black_penalty_egp).toBe(1200);
    expect(s.deductions_egp).toBe(s.red * 300 + s.black * 1200);
  });

  it('allows owner to change arrival time windows', async () => {
    const updated = await mockApi.updateSettings({
      early_window_start: '06:30',
      early_window_end: '07:30',
      normal_window_end: '09:30',
      late_window_end: '11:30',
    });
    expect(updated.early_window_start).toBe('06:30');
    expect(updated.early_window_end).toBe('07:30');
    expect(updated.normal_window_end).toBe('09:30');
    expect(updated.late_window_end).toBe('11:30');
  });

  it('allows owner to add new users and remove existing users', async () => {
    const newUser = await mockApi.addUser({
      name: 'Youssef Photo',
      username: 'youssef',
      role: 'employee',
    });
    expect(newUser.id).toBeDefined();
    expect(newUser.username).toBe('youssef');

    const usersData = await mockApi.ownerUsers();
    expect(usersData.users.some((u) => u.username === 'youssef')).toBe(true);

    // Cannot add duplicate username
    await expect(
      mockApi.addUser({ name: 'Another', username: 'youssef' })
    ).rejects.toThrow(/already exists/i);

    // Remove user
    await mockApi.removeUser(newUser.id);
    const afterDelete = await mockApi.ownerUsers();
    expect(afterDelete.users.some((u) => u.username === 'youssef')).toBe(false);
  });

  it('allows owner to reset user password directly', async () => {
    const resetRes = await mockApi.resetUserPassword(1, 'SecureNewPass2026!');
    expect(resetRes.success).toBe(true);
    expect(resetRes.message).toMatch(/reset successfully/i);

    await expect(mockApi.resetUserPassword(1, '')).rejects.toThrow(/cannot be empty/i);
    await expect(mockApi.resetUserPassword(9999, 'pass')).rejects.toThrow(/User not found/i);
  });

  it('exports payroll report as CSV', async () => {
    const exportRes = await mockApi.exportPayrollCsv();
    expect(exportRes.filename).toMatch(/\.csv$/);
    expect(exportRes.csv).toContain('Employee ID,Name,Username,Role');
    expect(exportRes.rowCount).toBeGreaterThanOrEqual(1);
  });

  it('retrieves points history and monthly attendance calendar data', async () => {
    const history = await mockApi.getPointsHistory();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toHaveProperty('action');
    expect(history[0]).toHaveProperty('delta_green');

    const calendar = await mockApi.getAttendanceCalendar();
    expect(Array.isArray(calendar)).toBe(true);
    expect(calendar.length).toBeGreaterThan(0);
    expect(calendar[0]).toHaveProperty('status');
  });

  it('enforces that superadmin is immutable and protected from remove, suspend, and modification', async () => {
    // Attempt to suspend superadmin
    await expect(mockApi.suspendOwner(0)).rejects.toThrow(/superadmin account is immutable/i);

    // Attempt to remove superadmin
    await expect(mockApi.removeOwner(0)).rejects.toThrow(/superadmin account is immutable/i);
    await expect(mockApi.removeUser(0)).rejects.toThrow(/superadmin account is immutable/i);

    // Attempt to adjust superadmin
    await expect(
      mockApi.ownerAdjust({ user_id: 0, color: 'green', delta: 1, reason: 'test' })
    ).rejects.toThrow(/superadmin account is immutable/i);

    // Attempt to reset superadmin password via standard endpoint
    await expect(mockApi.resetUserPassword(0, 'hacked')).rejects.toThrow(/superadmin account is immutable/i);

    // Attempt to create user with reserved superadmin username
    await expect(
      mockApi.addUser({ name: 'Impostor', username: 'superadmin' })
    ).rejects.toThrow(/reserved and immutable/i);
    await expect(
      mockApi.createOwner({ name: 'Impostor', username: 'superadmin', workspace: 'Hack' })
    ).rejects.toThrow(/reserved and immutable/i);
  });

  it('superadmin can create owners, assign them to workspaces, and view stats', async () => {
    const newOwner = await mockApi.createOwner({
      name: 'Salma Tarek',
      username: 'salma',
      email: 'salma@oasis.com',
      workspace: 'Oasis Sharm Studios',
    });
    expect(newOwner.id).toBeDefined();
    expect(newOwner.workspace).toBe('Oasis Sharm Studios');

    const res = await mockApi.superadminOwners();
    expect(res.owners.some((o) => o.username === 'salma')).toBe(true);
    expect(res.stats.total_owners).toBeGreaterThanOrEqual(2);
  });

  it('suspending an owner simultaneously suspends their entire team and blocks login/checkin', async () => {
    // Owner 99 governs user 1 (rico)
    const suspendRes = await mockApi.suspendOwner(99);
    expect(suspendRes.success).toBe(true);
    expect(suspendRes.owner.status).toBe('suspended');

    // Both owner and team member should be blocked from login
    await expect(mockApi.login('owner', 'pass')).rejects.toThrow(/Account suspended.*reinstated/i);
    await expect(mockApi.login('rico', 'pass')).rejects.toThrow(/Account suspended.*reinstated/i);

    // Checkin should be blocked for team member
    await expect(mockApi.checkin(WORK_ZONE.lat, WORK_ZONE.lng)).rejects.toThrow(/Account suspended/i);

    // Reinstate owner 99
    const reinstateRes = await mockApi.reinstateOwner(99);
    expect(reinstateRes.success).toBe(true);
    expect(reinstateRes.owner.status).toBe('active');

    // Access restored!
    const loginRes = await mockApi.login('rico', 'pass');
    expect(loginRes.username).toBe('rico');
  });

  it('removing an owner permanently removes all team members under that owner', async () => {
    // Create an owner and a user under that owner
    const tempOwner = await mockApi.createOwner({
      name: 'Temporary Owner',
      username: 'tempowner',
      workspace: 'Temp Workspace',
    });

    const tempUser = await mockApi.addUser({
      name: 'Temp Employee',
      username: 'tempemp',
      role: 'employee',
      owner_id: tempOwner.id,
    });

    // Remove owner
    const removeRes = await mockApi.removeOwner(tempOwner.id);
    expect(removeRes.success).toBe(true);

    // Verify owner is gone
    const ownersData = await mockApi.superadminOwners();
    expect(ownersData.owners.some((o) => o.id === tempOwner.id)).toBe(false);

    // Verify team members under that owner were cascadingly removed
    const afterUsers = await mockApi.ownerUsers();
    expect(afterUsers.users.some((u) => u.id === tempUser.id)).toBe(false);
  });

  it('enforces email OTP authentication exclusively for salehhamdy599@gmail.com', async () => {
    // 1. Request OTP for authorized email
    const reqRes = await mockApi.requestSuperadminOtp('salehhamdy599@gmail.com');
    expect(reqRes.success).toBe(true);
    expect(reqRes.otp).toBeDefined();

    // 2. Reject OTP request for any other email
    await expect(mockApi.requestSuperadminOtp('hacker@platform.com')).rejects.toThrow(
      /Access denied: This email is not authorized/i
    );

    // 3. Verify OTP with correct code
    const authRes = await mockApi.verifySuperadminOtp('salehhamdy599@gmail.com', reqRes.otp);
    expect(authRes.role).toBe('superadmin');
    expect(authRes.email).toBe('salehhamdy599@gmail.com');
    expect(authRes.name).toBe('Saleh Hamdy');

    // 4. Reject invalid OTP code
    await expect(
      mockApi.verifySuperadminOtp('salehhamdy599@gmail.com', '000000')
    ).rejects.toThrow(/Invalid or expired OTP/i);

    // 5. Reject OTP verification for unauthorized email
    await expect(
      mockApi.verifySuperadminOtp('other@email.com', reqRes.otp)
    ).rejects.toThrow(/Access denied/i);

    // 6. Direct login with OTP as password
    const directLogin = await mockApi.login('salehhamdy599@gmail.com', reqRes.otp);
    expect(directLogin.role).toBe('superadmin');
    expect(directLogin.email).toBe('salehhamdy599@gmail.com');

    // 7. Direct login failure with wrong password
    await expect(
      mockApi.login('salehhamdy599@gmail.com', 'wrong_pass')
    ).rejects.toThrow(/Invalid OTP code/i);
  });
});
