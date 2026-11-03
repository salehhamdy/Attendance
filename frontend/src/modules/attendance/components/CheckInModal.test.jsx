import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('leaflet', () => ({
  default: {
    map: () => ({
      setView: vi.fn().mockReturnThis(),
      invalidateSize: vi.fn(),
      fitBounds: vi.fn(),
      remove: vi.fn(),
    }),
    tileLayer: () => ({ addTo: vi.fn() }),
    circle: () => ({ addTo: vi.fn() }),
    marker: () => ({ addTo: vi.fn(), setLatLng: vi.fn() }),
    divIcon: vi.fn(() => ({})),
    latLngBounds: () => ({ pad: vi.fn() }),
  },
}));

vi.mock('../../../shared/api/index.js', () => ({
  api: {
    checkin: vi.fn(),
  },
}));

import { api } from '../../../shared/api/index.js';
import { CheckInModal, WORK_ZONE, getDistanceMeters } from '../index.js';

describe('Attendance Module - CheckInModal Component', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('calculates spatial distances correctly', () => {
    const distZero = getDistanceMeters(WORK_ZONE.lat, WORK_ZONE.lng, WORK_ZONE.lat, WORK_ZONE.lng);
    expect(distZero).toBe(0);

    const distFar = getDistanceMeters(WORK_ZONE.lat, WORK_ZONE.lng, 30.0444, 31.2357);
    expect(distFar).toBeGreaterThan(100000); // hundreds of km
  });

  it('renders work zone info and confirm button initially disabled', () => {
    render(<CheckInModal onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText(/Zone:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Rixos Radamis/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Confirm Location & Check In/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Simulate Rixos Radamis GPS/i })).toBeEnabled();
  });

  it('simulates GPS coordinates and enables checkin within geofence', async () => {
    api.checkin.mockResolvedValueOnce({
      success: true,
      message: 'Early check-in: +1 Green Point awarded!',
    });
    const onDone = vi.fn();
    render(<CheckInModal onClose={vi.fn()} onDone={onDone} />);

    await userEvent.click(screen.getByRole('button', { name: /Simulate Rixos Radamis GPS/i }));

    expect(screen.getByText(/In Geofence/i)).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /Confirm Location & Check In/i });
    expect(confirmBtn).toBeEnabled();

    await userEvent.click(confirmBtn);
    expect(api.checkin).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('handles checkin error from API', async () => {
    api.checkin.mockRejectedValueOnce(new Error('Outside geofence zone boundary'));
    render(<CheckInModal onClose={vi.fn()} onDone={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /Simulate Rixos Radamis GPS/i }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm Location & Check In/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Outside geofence zone boundary');
  });
});
