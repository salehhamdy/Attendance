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

  it('caps progress at 30', async () => {
    const s = await mockApi.summary();
    expect(s.progress).toBeLessThanOrEqual(30);
  });

  it('requires 30 green points for a reward claim', async () => {
    await expect(mockApi.requestReward('instapay', '01012345678')).rejects.toThrow(/30 Green Points/i);
  });

  it('validates geofence distance during checkin', async () => {
    const res = await mockApi.checkin(WORK_ZONE.lat, WORK_ZONE.lng);
    expect(res.success).toBe(true);
    expect(res.zone).toBe(WORK_ZONE.name);

    await expect(mockApi.checkin(30.0444, 31.2357)).rejects.toThrow(/Outside geofence zone/i);
  });

  it('computes accurate haversine distances in meters', () => {
    const distSame = haversineDistance(27.9158, 34.33, 27.9158, 34.33);
    expect(distSame).toBe(0);

    const distOffset = haversineDistance(27.9158, 34.33, 27.9168, 34.33);
    expect(distOffset).toBeGreaterThan(50);
    expect(distOffset).toBeLessThan(200);
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
});
