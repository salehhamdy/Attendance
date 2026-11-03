import { describe, it, expect } from 'vitest';
import { mockApi } from './mock.js';

describe('mock api rules', () => {
  it('computes deductions as 250 per red and 1000 per black', async () => {
    const s = await mockApi.summary();
    expect(s.deductions_egp).toBe(s.red * 250 + s.black * 1000);
  });

  it('cancelling a red spends 1 green and 1 red', async () => {
    const before = await mockApi.summary();
    const after = await mockApi.cancelRed();
    expect(after.green).toBe(before.green - 1);
    expect(after.red).toBe(before.red - 1);
  });

  it('rejects cancelling a black without one', async () => {
    await expect(mockApi.cancelBlack()).rejects.toThrow('Not enough points');
  });

  it('caps progress at 30', async () => {
    const s = await mockApi.summary();
    expect(s.progress).toBeLessThanOrEqual(30);
  });

  it('requires 30 green for a reward', async () => {
    await expect(mockApi.requestReward('instapay', '010')).rejects.toThrow('Need 30');
  });
});

