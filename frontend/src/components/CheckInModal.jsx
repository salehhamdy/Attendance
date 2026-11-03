import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Modal, Button } from './ui.jsx';
import { api } from '../api.js';

// Default work zone; backend remains the authority on geofence validation.
const ZONE = { lat: 27.9158, lng: 34.33, radius: 300, name: 'Work zone' };

export default function CheckInModal({ onClose, onDone }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const pinRef = useRef(null);
  const [pos, setPos] = useState(null);
  const [status, setStatus] = useState('Locating…');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const map = L.map(mapEl.current).setView([ZONE.lat, ZONE.lng], 16);
    mapRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    L.circle([ZONE.lat, ZONE.lng], { radius: ZONE.radius, color: '#6366f1', fillOpacity: 0.15 }).addTo(map);
    setTimeout(() => map.invalidateSize(), 320);
    if (!navigator.geolocation) setStatus('Geolocation not supported');
    else navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(c); setStatus('Location found');
        pinRef.current = L.marker([c.lat, c.lng]).addTo(map);
        map.fitBounds(L.latLngBounds([[c.lat, c.lng], [ZONE.lat, ZONE.lng]]).pad(0.3));
      },
      (e) => setStatus(`Location error: ${e.message}`),
      { enableHighAccuracy: true, timeout: 15000 }
    );
    return () => map.remove();
  }, []);

  async function confirm() {
    setBusy(true); setErr('');
    try { const r = await api.checkin(pos.lat, pos.lng); onDone(r); }
    catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <Modal title="Check In" onClose={onClose}>
      <div ref={mapEl} className="map" />
      <p className="muted">{ZONE.name} · {status}</p>
      {err && <p className="error">{err}</p>}
      <Button disabled={!pos || busy} onClick={confirm}>{busy ? 'Checking in…' : 'Confirm location'}</Button>
    </Modal>
  );
}
