import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../shared/api/index.js', () => ({
  api: {
    requestReward: vi.fn(),
  },
}));

import { api } from '../../../shared/api/index.js';
import { RewardModal } from '../index.js';

describe('Rewards Module - RewardModal Component', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders reward valuation and payout selection', () => {
    render(<RewardModal onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText(/40 USD \/ 2,200 EGP/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'InstaPay' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vodafone Cash' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Reward Request/i })).toBeDisabled();
  });

  it('switches between payout methods and updates input label', async () => {
    render(<RewardModal onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByLabelText(/Vodafone Cash Number/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'InstaPay' }));
    expect(screen.getByLabelText(/InstaPay IPA/i)).toBeInTheDocument();
  });

  it('submits reward request and triggers onDone', async () => {
    api.requestReward.mockResolvedValueOnce({ success: true });
    const onDone = vi.fn();
    render(<RewardModal onClose={vi.fn()} onDone={onDone} />);

    const input = screen.getByLabelText(/Vodafone Cash Number/i);
    await userEvent.type(input, '01012345678');

    const submitBtn = screen.getByRole('button', { name: /Submit Reward Request/i });
    expect(submitBtn).toBeEnabled();

    await userEvent.click(submitBtn);
    expect(api.requestReward).toHaveBeenCalledWith('vodafone_cash', '01012345678');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('handles API submission errors gracefully', async () => {
    api.requestReward.mockRejectedValueOnce(new Error('30 Green Points required'));
    const onDone = vi.fn();
    render(<RewardModal onClose={vi.fn()} onDone={onDone} />);

    const input = screen.getByLabelText(/Vodafone Cash Number/i);
    await userEvent.type(input, '01099999999');

    await userEvent.click(screen.getByRole('button', { name: /Submit Reward Request/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('30 Green Points required');
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Submit Reward Request/i })).toBeEnabled();
  });
});

