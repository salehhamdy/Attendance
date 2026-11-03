import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Modal, Button, StatusBadge } from '../../../shared/ui/index.js';
import { api } from '../../../shared/api/index.js';
import { DEFAULT_ZONE, findNearestBranch } from '../services/geofence.js';

export function CheckInModal({ onClose, onDone }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const pinRef = useRef(null);
  const [pos, setPos] = useState(null);
  const [branches, setBranches] = useState([DEFAULT_ZONE]);
  const [allowRemote, setAllowRemote] = useState(false);
  const [status, setStatus] = useState('Locating your GPS coordinates…');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Load active company branches & remote checkin policy
  useEffect(() => {
    if (api.summary) {
      api.summary().then((s) => {
        if (s && s.branches && s.branches.length) {
          setBranches(s.branches);
        }
        if (s && s.allow_remote !== undefined) {
          setAllowRemote(Boolean(s.allow_remote));
        }
      }).catch(() => {});
    }
  }, []);

  const nearest = pos ? findNearestBranch(pos.lat, pos.lng, branches) : { branch: branches[0], distance: null, inZone: false };
  const targetBranch = nearest.branch || branches[0] || DEFAULT_ZONE;

  const applyPosition = useCallback(
    (c, activeBranches = branches, remoteAllowed = allowRemote) => {
      setPos(c);
      const { branch, distance, inZone } = findNearestBranch(c.lat, c.lng, activeBranches);
      const bName = branch ? branch.name : 'workplace';

      if (remoteAllowed) {
        setStatus(`Remote check-in enabled: Coordinates detected near ${bName} (~${distance}m)`);
      } else if (inZone) {
        setStatus(`Inside ${bName} (~${distance}m from center)`);
      } else {
        const radius = branch ? branch.radius : 300;
        setStatus(`Outside approved zone: ~${distance - radius}m beyond ${bName} boundary`);
      }

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
          if (branch) {
            mapRef.current.fitBounds(
              L.latLngBounds([
                [c.lat, c.lng],
                [branch.lat, branch.lng],
              ]).pad(0.3)
            );
          }
        } catch {
          // Fallback in headless/test environments
        }
      }
    },
    [branches, allowRemote]
  );

  useEffect(() => {
    let map = null;
    const centerZone = branches[0] || DEFAULT_ZONE;

    if (mapEl.current) {
      try {
        map = L.map(mapEl.current).setView([centerZone.lat, centerZone.lng], 15);
        mapRef.current = map;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        // Draw circles for all company branches
        branches.forEach((b) => {
          L.circle([b.lat, b.lng], {
            radius: Number(b.radius) || 300,
            color: '#6366f1',
            fillColor: '#6366f1',
            fillOpacity: 0.16,
            weight: 2,
          }).addTo(map);
        });

        setTimeout(() => map && map.invalidateSize && map.invalidateSize(), 300);
      } catch {
        // Safe fallback in test environments
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
      setStatus('Geolocation not supported. Use simulation below.');
    }

    return () => {
      if (map) {
        try {
          map.remove();
        } catch {
          // ignore cleanup
        }
      }
    };
  }, [branches, applyPosition]);

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

  const isEligible = allowRemote || nearest.inZone;

  return (
    <Modal title="Spatial Attendance Check-In" onClose={onClose}>
      <div ref={mapEl} className="map" aria-label="Geofence Map" />

      <div className="zone-info">
        <div>
          <strong>Target Workplace:</strong> {targetBranch.name}
          {branches.length > 1 && (
            <span className="muted text-sm block">({branches.length} approved business locations)</span>
          )}
        </div>
        <div className="status-row">
          <span>{status}</span>
          {pos && (
            <StatusBadge status={isEligible ? 'approved' : 'rejected'}>
              {allowRemote ? 'Remote Allowed' : nearest.inZone ? 'In Geofence' : 'Out of Geofence'}
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
              lat: targetBranch.lat + 0.0002,
              lng: targetBranch.lng + 0.0002,
            })
          }
        >
          Simulate GPS at {targetBranch.name}
        </button>
      </div>
    </Modal>
  );
}

export default CheckInModal;
