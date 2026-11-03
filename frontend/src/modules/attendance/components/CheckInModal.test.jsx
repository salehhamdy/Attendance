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
    summary: vi.fn().mockResolvedValue({
      branches: [
        { id: 1, name: 'Main Business Office', lat: 27.9158, lng: 34.33, radius: 300 },
      ],
      allow_remote: false,
    }),
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

  it('renders workplace info and confirm button initially disabled', async () => {
    render(<CheckInModal onClose={vi.fn()} onDone={vi.fn()} />);
    expect(await screen.findByText(/Target Workplace:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm Location & Check In/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Simulate GPS/i })).toBeEnabled();
  });

  it('simulates GPS coordinates and enables checkin within geofence', async () => {
    api.checkin.mockResolvedValueOnce({
      success: true,
      message: 'Early check-in: +1 Green Point awarded!',
    });
    const onDone = vi.fn();
    render(<CheckInModal onClose={vi.fn()} onDone={onDone} />);

    await userEvent.click(await screen.findByRole('button', { name: /Simulate GPS/i }));

    expect(screen.getByText(/In Geofence/i)).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /Confirm Location & Check In/i });
    expect(confirmBtn).toBeEnabled();

    await userEvent.click(confirmBtn);
    expect(api.checkin).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('handles checkin error from API', async () => {
    api.checkin.mockRejectedValueOnce(new Error('Outside approved workplace'));
    render(<CheckInModal onClose={vi.fn()} onDone={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /Simulate GPS/i }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm Location & Check In/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Outside approved workplace');
  });

  it('attaches selfie verification photo to check-in payload', async () => {
    api.checkin.mockResolvedValueOnce({ success: true });
    const onDone = vi.fn();
    render(<CheckInModal onClose={vi.fn()} onDone={onDone} />);

    // Take photo
    const takePhotoBtn = await screen.findByRole('button', { name: /Take Selfie Photo/i });
    await userEvent.click(takePhotoBtn);

    expect(screen.getByText(/Selfie Verification Attached/i)).toBeInTheDocument();

    // Simulate GPS and confirm
    await userEvent.click(screen.getByRole('button', { name: /Simulate GPS/i }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm Location & Check In/i }));

    expect(api.checkin).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({
        photo: expect.stringContaining('data:image/'),
      })
    );
  });

  it('allows entering on-site kiosk code for location verification', async () => {
    api.checkin.mockResolvedValueOnce({ success: true });
    render(<CheckInModal onClose={vi.fn()} onDone={vi.fn()} />);

    // Reveal kiosk code input
    const kioskBtn = await screen.findByRole('button', { name: /Enter Kiosk PIN \/ Code/i });
    await userEvent.click(kioskBtn);

    const kioskInput = screen.getByPlaceholderText(/Enter 6-char On-Site Kiosk Code/i);
    await userEvent.type(kioskInput, 'SHARM1');

    await userEvent.click(screen.getByRole('button', { name: /Simulate GPS/i }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm Location & Check In/i }));

    expect(api.checkin).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({
        kiosk_code: 'SHARM1',
      })
    );
  });
});
