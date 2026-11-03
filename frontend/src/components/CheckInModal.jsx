import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Modal, Button, StatusBadge } from './ui.jsx';
import { api } from '../api.js';

export const WORK_ZONE = {
  name: 'Rixos Radamis (Sharm El-Sheikh)',
  lat: 27.9158,
  lng: 34.33,
  radius: 300, // 300m designated work area
};

export function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
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

export default function CheckInModal({ onClose, onDone }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const pinRef = useRef(null);
  const [pos, setPos] = useState(null);
  const [status, setStatus] = useState('Locating your GPS coordinates…');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Update map pin & position
  const applyPosition = (c) => {
    setPos(c);
    const dist = getDistanceMeters(c.lat, c.lng, WORK_ZONE.lat, WORK_ZONE.lng);
    const inZone = dist <= WORK_ZONE.radius;
    setStatus(
      inZone
        ? `Inside work zone (~${dist}m from center)`
        : `Outside work zone (~${dist - WORK_ZONE.radius}m beyond boundary)`
    );

    if (mapRef.current) {
      try {
        if (!pinRef.current) {
          const pinIcon = L.divIcon({
            className: 'custom-pin',
            html: `<div style="background:#dc2626;width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
          pinRef.current = L.marker([c.lat, c.lng], { icon: pinIcon }).addTo(mapRef.current);
        } else {
          pinRef.current.setLatLng([c.lat, c.lng]);
        }
        mapRef.current.fitBounds(
          L.latLngBounds([
            [c.lat, c.lng],
            [WORK_ZONE.lat, WORK_ZONE.lng],
          ]).pad(0.3)
        );
      } catch {
        // Safe fallback in test or headless environments
      }
    }
  };

  useEffect(() => {
    let map = null;
    if (mapEl.current) {
      try {
        map = L.map(mapEl.current).setView([WORK_ZONE.lat, WORK_ZONE.lng], 16);
        mapRef.current = map;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        L.circle([WORK_ZONE.lat, WORK_ZONE.lng], {
          radius: WORK_ZONE.radius,
          color: '#6366f1',
          fillColor: '#6366f1',
          fillOpacity: 0.18,
          weight: 2,
        }).addTo(map);

        setTimeout(() => map && map.invalidateSize && map.invalidateSize(), 300);
      } catch {
        // Safe fallback if Leaflet cannot instantiate DOM in test environment
      }
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          applyPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
        },
        (e) => {
          setStatus(`GPS unavailable: ${e.message}. You can simulate coordinates below.`);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setStatus('Geolocation not supported by this browser. Use simulation below.');
    }

    return () => {
      if (map) {
        try {
          map.remove();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  async function confirm() {
    if (!pos) return;
    setBusy(true);
    setErr('');
    try {
      const r = await api.checkin(pos.lat, pos.lng);
      onDone(r);
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  const dist = pos ? getDistanceMeters(pos.lat, pos.lng, WORK_ZONE.lat, WORK_ZONE.lng) : null;
  const inZone = dist !== null && dist <= WORK_ZONE.radius;

  return (
    <Modal title="Spatial Attendance Check-In" onClose={onClose}>
      <div ref={mapEl} className="map" aria-label="Geofence Map" />

      <div className="zone-info">
        <div>
          <strong>Zone:</strong> {WORK_ZONE.name}
        </div>
        <div className="status-row">
          <span>{status}</span>
          {pos && (
            <StatusBadge status={inZone ? 'approved' : 'rejected'}>
              {inZone ? 'In Geofence' : 'Out of Geofence'}
            </StatusBadge>
          )}
        </div>
      </div>

      {err && <p className="error" role="alert">{err}</p>}

      <div className="btn-group">
        <Button disabled={!pos || busy} onClick={confirm}>
          {busy ? 'Validating…' : 'Confirm Location & Check In'}
        </Button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            applyPosition({
              lat: WORK_ZONE.lat + 0.0002,
              lng: WORK_ZONE.lng + 0.0002,
            })
          }
        >
          Simulate Rixos Radamis GPS
        </button>
      </div>
    </Modal>
  );
}
