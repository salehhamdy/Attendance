import React, { useEffect, useState } from 'react';
import { api } from '../../../shared/api/index.js';
import { Card, Button, StatusBadge, StatCard, Modal, useToast } from '../../../shared/ui/index.js';

export const RESORT_PRESETS = [
  { name: 'Rixos Radamis (Sharm El-Sheikh)', lat: 27.9158, lng: 34.33, radius: 300 },
  { name: 'Rixos Premium Seagate (Nabq Sharm)', lat: 28.0267, lng: 34.4326, radius: 350 },
  { name: 'Pickalbatros Aqua Park (Sharm)', lat: 27.8631, lng: 34.3168, radius: 300 },
  { name: 'Four Seasons Resort (Sharm El-Sheikh)', lat: 27.9620, lng: 34.3912, radius: 400 },
  { name: 'Steigenberger Alcazar (Nabq Bay)', lat: 28.0531, lng: 34.4419, radius: 350 },
  { name: 'Cairo Corporate Headquarters', lat: 30.0444, lng: 31.2357, radius: 300 },
];

export function OwnerDashboard() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // Business Profile & Company Settings (Universal Multi-Business & Remote SaaS)
  const [company, setCompany] = useState({
    company_name: 'Universal Attendance System',
    currency: 'EGP',
    reward_threshold: 30,
    reward_amount: '40 USD / 2,200 EGP',
    allow_remote: false,
    branches: [
      { id: 1, name: 'Rixos Radamis (Sharm El-Sheikh)', lat: 27.9158, lng: 34.33, radius: 300 },
      { id: 2, name: 'Cairo Headquarters', lat: 30.0444, lng: 31.2357, radius: 300 },
    ],
  });
  const [savingCompany, setSavingCompany] = useState(false);

  // Branch creation state & resort presets
  const [newBranch, setNewBranch] = useState({
    name: '',
    lat: '',
    lng: '',
    radius: 300,
  });
  const [addingBranch, setAddingBranch] = useState(false);
  const [locatingBranch, setLocatingBranch] = useState(false);

  // Point Adjustment state
  const [adj, setAdj] = useState({ user_id: '', color: 'green', delta: 1, reason: '' });

  // Multi-Shift Scheduling state
  const [shifts, setShifts] = useState([
    { id: 1, name: 'Morning Shift', start_time: '07:00', end_time: '15:00', description: 'Resort morning & breakfast photography' },
    { id: 2, name: 'Evening Shift', start_time: '15:00', end_time: '23:00', description: 'Sunset sessions, beach parties & galas' },
    { id: 3, name: 'Night Shift', start_time: '23:00', end_time: '07:00', description: 'Overnight photo editing & system maintenance' },
  ]);
  const [newShift, setNewShift] = useState({
    name: '',
    start_time: '07:00',
    end_time: '15:00',
    description: '',
  });
  const [addingShift, setAddingShift] = useState(false);

  // System Configuration (Penalties & Arrival time windows)
  const [settings, setSettings] = useState({
    red_penalty_egp: 250,
    black_penalty_egp: 1000,
    early_window_start: '07:00',
    early_window_end: '08:00',
    normal_window_end: '10:00',
    late_window_end: '12:00',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // User Management state
  const [newUser, setNewUser] = useState({ name: '', username: '', role: 'employee', shift_id: 1 });
  const [addingUser, setAddingUser] = useState(false);

  // Direct Password Reset state
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('NewPass123!');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Payroll CSV export state
  const [exportingPayroll, setExportingPayroll] = useState(false);

  // On-Site Attendance Kiosk Mode state
  const [kioskCode, setKioskCode] = useState('SHARM1');
  const [showKioskModal, setShowKioskModal] = useState(false);
  const [rotatingKiosk, setRotatingKiosk] = useState(false);

  const load = () => {
    setLoading(true);
    return Promise.all([
      api.ownerUsers(),
      api.getSettings ? api.getSettings().catch(() => null) : Promise.resolve(null),
      api.getCompanySettings ? api.getCompanySettings().catch(() => null) : Promise.resolve(null),
      api.getShifts ? api.getShifts().catch(() => null) : Promise.resolve(null),
    ])
      .then(([r, s, c, sh]) => {
        const list = Array.isArray(r) ? r : r.users || [];
        setUsers(list);
        setLeaves(
          Array.isArray(r)
            ? list.flatMap((u) => u.leave_requests || [])
            : r.leave_requests || r.leaves || []
        );
        setRewards(
          Array.isArray(r)
            ? list.flatMap((u) => u.reward_requests || [])
            : r.reward_requests || r.rewards || []
        );
        if (s) {
          setSettings(s);
        } else if (r && r.settings) {
          setSettings(r.settings);
        }
        if (c) {
          setCompany(c);
        } else if (r && r.company) {
          setCompany(r.company);
        }
        if (Array.isArray(sh)) {
          setShifts(sh);
        } else if (r && r.shifts) {
          setShifts(r.shifts);
        }
        setLoading(false);
      })
      .catch((e) => {
        setErr(e.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const runAction = (fn, successMsg) => async () => {
    setErr('');
    setMsg('');
    try {
      await fn();
      await load();
      if (successMsg) {
        setMsg(successMsg);
        toast.success(successMsg);
      }
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    }
  };

  // 1. Submit Company Profile (Universal Business & Remote Policy)
  async function submitCompany(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    setSavingCompany(true);
    try {
      if (api.updateCompanySettings) {
        await api.updateCompanySettings(company);
      }
      const successNotice = `Business profile for "${company.company_name}" updated successfully.`;
      setMsg(successNotice);
      toast.success(successNotice);
      await load();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setSavingCompany(false);
    }
  }

  // 2. Add Branch Location
  async function submitAddBranch(e) {
    e.preventDefault();
    if (!newBranch.name.trim() || newBranch.lat === '' || newBranch.lng === '') {
      setErr('Branch name and valid latitude/longitude coordinates are required');
      return;
    }
    setErr('');
    setMsg('');
    setAddingBranch(true);
    try {
      if (api.addBranch) {
        await api.addBranch({
          name: newBranch.name.trim(),
          lat: Number(newBranch.lat),
          lng: Number(newBranch.lng),
          radius: Number(newBranch.radius) || 300,
        });
      }
      const successNotice = `New branch "${newBranch.name}" added successfully.`;
      setMsg(successNotice);
      toast.success(successNotice);
      setNewBranch({ name: '', lat: '', lng: '', radius: 300 });
      await load();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setAddingBranch(false);
    }
  }

  // 3. Remove Branch Location
  async function removeBranch(branch) {
    setErr('');
    setMsg('');
    try {
      if (api.removeBranch) {
        await api.removeBranch(branch.id);
      }
      const successNotice = `Branch "${branch.name}" removed from company locations.`;
      setMsg(successNotice);
      toast.info(successNotice);
      await load();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    }
  }

  // 4. Autofill Branch GPS using current device location
  function locateDeviceForBranch() {
    if (!navigator.geolocation) {
      setErr('Geolocation is not supported by your browser');
      return;
    }
    setLocatingBranch(true);
    setErr('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingBranch(false);
        setNewBranch((prev) => ({
          ...prev,
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        }));
        setMsg('Coordinates acquired from device GPS');
      },
      (err) => {
        setLocatingBranch(false);
        setErr(`GPS error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // 5. Apply Resort Preset to form
  function applyResortPreset(preset) {
    setNewBranch({
      name: preset.name,
      lat: preset.lat,
      lng: preset.lng,
      radius: preset.radius,
    });
    setMsg(`Preset applied: ${preset.name}`);
  }

  // 6. Direct Password Reset
  async function submitPasswordReset(e) {
    e.preventDefault();
    if (!resetModalUser || !newPassword.trim()) {
      setErr('New password cannot be empty');
      return;
    }
    setErr('');
    setMsg('');
    setResettingPassword(true);
    try {
      if (api.resetUserPassword) {
        await api.resetUserPassword(resetModalUser.id, newPassword.trim());
      }
      const successNotice = `Password for "${resetModalUser.name || resetModalUser.username}" reset successfully.`;
      setMsg(successNotice);
      toast.success(successNotice);
      setResetModalUser(null);
      setNewPassword('NewPass123!');
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setResettingPassword(false);
    }
  }

  // 7. Export Payroll to CSV (Excel)
  async function exportPayroll() {
    setErr('');
    setMsg('');
    setExportingPayroll(true);
    try {
      let csvContent = '';
      let filename = `payroll-report-${(company.company_name || 'attendance').toLowerCase().replace(/\s+/g, '-')}.csv`;

      if (api.exportPayrollCsv) {
        const res = await api.exportPayrollCsv();
        if (res && res.csv) {
          csvContent = res.csv;
          if (res.filename) filename = res.filename;
        }
      }

      if (!csvContent) {
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
          const userApprovedRewards = rewards.filter(
            (r) => r.user_id === u.id && r.status === 'approved'
          );
          const net = userApprovedRewards.length * 2200 - totalDed;
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
            userApprovedRewards.length,
            net,
          ].join(',');
        });

        csvContent = [headers.join(','), ...rows].join('\n');
      }

      if (
        typeof window !== 'undefined' &&
        window.URL &&
        typeof window.URL.createObjectURL === 'function' &&
        window.Blob
      ) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      const successNotice = `Payroll CSV export complete: ${users.length} employee records exported.`;
      setMsg(successNotice);
      toast.success(successNotice);
    } catch (e) {
      const errNotice = `Payroll export failed: ${e.message}`;
      setErr(errNotice);
      toast.error(errNotice);
    } finally {
      setExportingPayroll(false);
    }
  }

  // 8. Submit Point Adjustment
  async function submitAdjust(e) {
    e.preventDefault();
    if (!adj.user_id) {
      setErr('Please select an employee to adjust');
      return;
    }
    setErr('');
    setMsg('');
    try {
      await api.ownerAdjust({
        ...adj,
        user_id: Number(adj.user_id) || adj.user_id,
        delta: Number(adj.delta),
      });
      const successNotice = `Successfully updated ${adj.color} points by ${Number(adj.delta) > 0 ? '+' : ''}${adj.delta} for selected employee`;
      setMsg(successNotice);
      toast.success(successNotice);
      setAdj({ user_id: '', color: 'green', delta: 1, reason: '' });
      await load();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    }
  }

  // 8b. Rotate On-Site Kiosk Code
  async function handleRotateKiosk() {
    setRotatingKiosk(true);
    setErr('');
    setMsg('');
    try {
      let freshCode = '';
      if (api.rotateKioskCode) {
        const res = await api.rotateKioskCode();
        freshCode = res.kiosk_code;
      } else {
        freshCode = 'K' + Math.random().toString(36).substring(2, 7).toUpperCase();
      }
      setKioskCode(freshCode);
      const successNotice = `On-site kiosk access code refreshed to "${freshCode}".`;
      setMsg(successNotice);
      toast.info(successNotice);
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setRotatingKiosk(false);
    }
  }

  // 9. Submit Settings (Penalties & Arrival Windows)
  async function submitSettings(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    setSavingSettings(true);
    try {
      if (api.updateSettings) {
        await api.updateSettings(settings);
      }
      const successNotice = 'System rules updated: new arrival times & penalty values are now in effect.';
      setMsg(successNotice);
      toast.success(successNotice);
      await load();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setSavingSettings(false);
    }
  }

  // 10. Multi-Shift Scheduling Handlers
  async function submitAddShift(e) {
    e.preventDefault();
    if (!newShift.name.trim() || !newShift.start_time || !newShift.end_time) {
      setErr('Shift name, start time, and end time are required');
      return;
    }
    setErr('');
    setMsg('');
    setAddingShift(true);
    try {
      if (api.createShift) {
        await api.createShift(newShift);
      }
      const successNotice = `New shift template "${newShift.name}" (${newShift.start_time} - ${newShift.end_time}) created successfully.`;
      setMsg(successNotice);
      toast.success(successNotice);
      setNewShift({ name: '', start_time: '07:00', end_time: '15:00', description: '' });
      await load();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setAddingShift(false);
    }
  }

  async function removeShift(shift) {
    setErr('');
    setMsg('');
    try {
      if (api.deleteShift) {
        await api.deleteShift(shift.id);
      }
      const successNotice = `Shift schedule "${shift.name}" removed. Assigned staff shifted to default schedule.`;
      setMsg(successNotice);
      toast.info(successNotice);
      await load();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    }
  }

  async function handleAssignUserShift(user, shiftId) {
    setErr('');
    setMsg('');
    try {
      if (api.assignUserShift) {
        await api.assignUserShift(user.id, shiftId);
      }
      const targetShift = shifts.find((s) => s.id === Number(shiftId));
      const shiftName = targetShift ? targetShift.name : 'Selected Shift';
      const successNotice = `Assigned ${user.name || user.username} to ${shiftName}.`;
      setMsg(successNotice);
      toast.success(successNotice);
      await load();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    }
  }

  // 11. Add User
  async function submitAddUser(e) {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.username.trim()) {
      setErr('Photographer name and username are required');
      return;
    }
    setErr('');
    setMsg('');
    setAddingUser(true);
    try {
      if (api.addUser) {
        await api.addUser(newUser);
      }
      const successNotice = `Photographer "${newUser.name}" added successfully.`;
      setMsg(successNotice);
      toast.success(successNotice);
      setNewUser({ name: '', username: '', role: 'employee', shift_id: 1 });
      await load();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setAddingUser(false);
    }
  }

  // 12. Remove User
  async function removeUser(user) {
    setErr('');
    setMsg('');
    try {
      if (api.removeUser) {
        await api.removeUser(user.id);
      }
      const successNotice = `User "${user.name || user.username}" removed from the system.`;
      setMsg(successNotice);
      toast.info(successNotice);
      await load();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    }
  }

  const pendingLeaves = leaves.filter(
    (l) => String(l.status || '').toLowerCase() === 'pending'
  );
  const pendingRewards = rewards.filter(
    (r) => String(r.status || '').toLowerCase() === 'pending'
  );

  const currency = company.currency || 'EGP';
  const redVal = Number(settings.red_penalty_egp) || 250;
  const blackVal = Number(settings.black_penalty_egp) || 1000;
  const branches = company.branches || [];

  return (
    <div>
      <div className="row-head">
        <div>
          <h2>Owner Administration Panel</h2>
          <p className="muted subtitle">
            Universal attendance control for {company.company_name}: configure branches anywhere in the world, remote work, penalties, and team management.
          </p>
        </div>
      </div>

      {err && <p className="error" role="alert">{err}</p>}
      {msg && <p className="ok" role="status">{msg}</p>}

      {/* Top Stat Overview */}
      <div className="grid3 mb">
        <StatCard
          variant="green"
          title="Team Members"
          value={users.length}
          sub="Registered system accounts"
        />
        <StatCard
          variant="red"
          title="Pending Leaves"
          value={pendingLeaves.length}
          sub="Require approval to waive absence penalties"
        />
        <StatCard
          variant="black"
          title="Pending Rewards"
          value={pendingRewards.length}
          sub={`${company.reward_threshold || 30}-point milestone claims (${company.reward_amount || 'Reward'})`}
        />
      </div>

      {/* 1. Business Profile & Global Attendance Policy */}
      <Card className="mb">
        <h3>Universal Business Profile & Attendance Mode</h3>
        <p className="muted text-sm mb-sm">
          Tailor this attendance system to any organization, company name, local currency, and remote or multi-location policy.
        </p>

        <form onSubmit={submitCompany} className="form" noValidate>
          <div className="two">
            <div>
              <label htmlFor="company-name" className="field-label">
                Company / Organization Name
              </label>
              <input
                id="company-name"
                type="text"
                required
                value={company.company_name}
                onChange={(e) => setCompany({ ...company, company_name: e.target.value })}
                placeholder="e.g. Acme Studios, Radamis Resort, Nile Media"
              />
            </div>

            <div>
              <label htmlFor="company-currency" className="field-label">
                Operating Currency Code
              </label>
              <input
                id="company-currency"
                type="text"
                required
                maxLength={6}
                value={company.currency}
                onChange={(e) => setCompany({ ...company, currency: e.target.value.toUpperCase() })}
                placeholder="e.g. EGP, USD, SAR, AED, EUR, GBP"
              />
            </div>
          </div>

          <div className="two">
            <div>
              <label htmlFor="company-reward-threshold" className="field-label">
                Reward Milestone Threshold (Green Points)
              </label>
              <input
                id="company-reward-threshold"
                type="number"
                min="1"
                required
                value={company.reward_threshold}
                onChange={(e) => setCompany({ ...company, reward_threshold: Number(e.target.value) })}
              />
            </div>

            <div>
              <label htmlFor="company-reward-amount" className="field-label">
                Reward Payout Description
              </label>
              <input
                id="company-reward-amount"
                type="text"
                required
                value={company.reward_amount}
                onChange={(e) => setCompany({ ...company, reward_amount: e.target.value })}
                placeholder="e.g. 40 USD / 2,200 EGP or 100 USD Bonus"
              />
            </div>
          </div>

          <div className="mb-sm">
            <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
              <input
                id="company-allow-remote"
                type="checkbox"
                checked={Boolean(company.allow_remote)}
                onChange={(e) => setCompany({ ...company, allow_remote: e.target.checked })}
              />
              <span style={{ fontWeight: 600 }}>
                Allow Remote / Anywhere Check-in (Worldwide)
              </span>
            </label>
            <p className="muted text-sm" style={{ marginTop: '0.2rem', marginLeft: '1.6rem' }}>
              When enabled, employees can record attendance from anywhere in the world without requiring proximity to a physical branch geofence.
            </p>
          </div>

          <Button disabled={savingCompany}>
            {savingCompany ? 'Saving Profile…' : 'Save Business Profile & Policy'}
          </Button>
        </form>
      </Card>

      {/* 2. Multiple Resort Geofencing & Workplace Branches */}
      <Card className="mb">
        <h3>Multiple Resort Geofencing & Workplace Branches</h3>
        <p className="muted text-sm mb-sm">
          Define physical resorts, offices, or studios anywhere in the world. When remote mode is disabled, staff must check in within the specified geofence radius.
        </p>

        {branches.length > 0 ? (
          <table className="mb">
            <thead>
              <tr>
                <th>Resort / Branch Name</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Radius (Meters)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.name}</strong></td>
                  <td><code>{Number(b.lat).toFixed(4)}</code></td>
                  <td><code>{Number(b.lng).toFixed(4)}</code></td>
                  <td>{b.radius || 300}m</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      aria-label={`Remove branch ${b.name}`}
                      onClick={() => removeBranch(b)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted mb">No physical branches configured. Add a workplace location below or enable remote check-in.</p>
        )}

        <h4>Add Resort / Branch Location</h4>

        {/* Resort Presets */}
        <div className="mb-sm">
          <span className="muted text-sm font-semibold block mb-xs">
            Quick Fill Resort Presets:
          </span>
          <div className="preset-bar">
            {RESORT_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className="preset-btn"
                onClick={() => applyResortPreset(p)}
              >
                + {p.name.split(' (')[0]}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={submitAddBranch} className="form" noValidate>
          <div className="two">
            <div>
              <label htmlFor="branch-name" className="field-label">Branch Name</label>
              <input
                id="branch-name"
                required
                aria-label="Branch name"
                placeholder="e.g. Rixos Radamis Sharm, London Office, Dubai Media City"
                value={newBranch.name}
                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="branch-radius" className="field-label">Allowed Geofence Radius (meters)</label>
              <input
                id="branch-radius"
                type="number"
                min="20"
                max="5000"
                required
                aria-label="Branch radius"
                value={newBranch.radius}
                onChange={(e) => setNewBranch({ ...newBranch, radius: e.target.value })}
              />
            </div>
          </div>

          <div className="two">
            <div>
              <label htmlFor="branch-lat" className="field-label">GPS Latitude</label>
              <input
                id="branch-lat"
                type="number"
                step="any"
                required
                aria-label="Branch latitude"
                placeholder="e.g. 27.9158"
                value={newBranch.lat}
                onChange={(e) => setNewBranch({ ...newBranch, lat: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="branch-lng" className="field-label">GPS Longitude</label>
              <input
                id="branch-lng"
                type="number"
                step="any"
                required
                aria-label="Branch longitude"
                placeholder="e.g. 34.3300"
                value={newBranch.lng}
                onChange={(e) => setNewBranch({ ...newBranch, lng: e.target.value })}
              />
            </div>
          </div>

          <div className="btn-row">
            <Button disabled={addingBranch}>
              {addingBranch ? 'Adding Branch…' : 'Add Branch Location'}
            </Button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={locateDeviceForBranch}
              disabled={locatingBranch}
            >
              {locatingBranch ? 'Detecting GPS…' : 'Use Current Device GPS'}
            </button>
          </div>
        </form>
      </Card>

      {/* 3. Payroll & Compensation Summary with CSV Export */}
      <Card className="mb">
        <div className="row-head">
          <div>
            <h3>Payroll & Compensation Export</h3>
            <p className="muted text-sm mb-sm">
              Calculate net employee pay adjustments based on penalties, milestone bonuses, and export formatted CSV reports for accounting and Excel.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={exportPayroll}
            disabled={exportingPayroll}
          >
            {exportingPayroll ? 'Exporting…' : 'Export Payroll to CSV (Excel)'}
          </Button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Green (Bonus)</th>
              <th>Red Penalties</th>
              <th>Black Penalties</th>
              <th>Total Deductions</th>
              <th>Approved Rewards</th>
              <th>Net Adjustment</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const redDed = (u.red || 0) * redVal;
              const blackDed = (u.black || 0) * blackVal;
              const totalDed = redDed + blackDed;
              const userApprovedRewards = rewards.filter(
                (r) => r.user_id === u.id && r.status === 'approved'
              );
              const rewardVal = userApprovedRewards.length * 2200;
              const net = rewardVal - totalDed;
              return (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name || u.username}</strong>
                    <small className="block muted">@{u.username}</small>
                  </td>
                  <td className="green-text font-semibold">{u.green || 0} pts</td>
                  <td>{u.red || 0} (-{redDed} {currency})</td>
                  <td>{u.black || 0} (-{blackDed} {currency})</td>
                  <td className="red-text font-semibold">{totalDed} {currency}</td>
                  <td className="green-text font-semibold">{userApprovedRewards.length} ({rewardVal} {currency})</td>
                  <td>
                    <strong className={net >= 0 ? 'green-text' : 'red-text'}>
                      {net >= 0 ? `+${net}` : net} {currency}
                    </strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* On-Site Kiosk Mode Card */}
      <Card className="mb">
        <div className="row-head">
          <div>
            <h3>On-Site Attendance Kiosk Mode (Physical Proof of Presence)</h3>
            <p className="muted text-sm mb-sm">
              Display a live rotating access token on a tablet at your reception, studio, or resort front desk. Staff scan or enter this code on their mobile device to confirm physical presence.
            </p>
          </div>
          <div className="btn-row">
            <Button type="button" variant="ghost" onClick={handleRotateKiosk} disabled={rotatingKiosk}>
              {rotatingKiosk ? 'Rotating…' : '🔄 Refresh Kiosk Code'}
            </Button>
            <Button type="button" onClick={() => setShowKioskModal(true)}>
              📺 Launch Kiosk Display
            </Button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
          <div>
            <span className="muted text-sm block">Current Branch PIN / Token:</span>
            <code style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '3px', color: 'var(--primary)' }}>
              {kioskCode}
            </code>
          </div>
          <small className="muted">
            Valid across all branches for staff indoor check-in without high-accuracy GPS.
          </small>
        </div>
      </Card>

      {/* Multi-Shift Scheduling & Timetable Templates */}
      <Card className="mb">
        <div className="row-head">
          <div>
            <h3>Shift Templates & Multi-Shift Scheduling</h3>
            <p className="muted text-sm mb-sm">
              Define operational work schedules (Morning, Sunset, Night) and assign team members to tailored shifts.
            </p>
          </div>
        </div>

        {/* Existing Shifts Table */}
        <table className="mb">
          <thead>
            <tr>
              <th>Shift Name</th>
              <th>Working Hours</th>
              <th>Operational Purpose</th>
              <th>Assigned Staff</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => {
              const assignedCount = users.filter((u) => u.shift_id === s.id).length;
              return (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td><code>{s.start_time} - {s.end_time}</code></td>
                  <td className="muted">{s.description || 'General shift schedule'}</td>
                  <td><span className="badge badge-active">{assignedCount} employees</span></td>
                  <td>
                    {shifts.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                        aria-label={`Remove shift ${s.name}`}
                        onClick={() => removeShift(s)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Add Shift Form */}
        <form onSubmit={submitAddShift} className="form" noValidate>
          <div className="two">
            <div>
              <label htmlFor="shift-name" className="field-label">New Shift Name</label>
              <input
                id="shift-name"
                required
                placeholder="e.g. Mid-Day Events Shift"
                value={newShift.name}
                onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="shift-desc" className="field-label">Purpose / Description</label>
              <input
                id="shift-desc"
                placeholder="e.g. Pool party & sunset portraits"
                value={newShift.description}
                onChange={(e) => setNewShift({ ...newShift, description: e.target.value })}
              />
            </div>
          </div>

          <div className="two">
            <div>
              <label htmlFor="shift-start" className="field-label">Shift Start Time</label>
              <input
                id="shift-start"
                type="time"
                required
                value={newShift.start_time}
                onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="shift-end" className="field-label">Shift End Time</label>
              <input
                id="shift-end"
                type="time"
                required
                value={newShift.end_time}
                onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
              />
            </div>
          </div>

          <Button disabled={addingShift}>
            {addingShift ? 'Creating Shift…' : '+ Create Shift Template'}
          </Button>
        </form>
      </Card>

      {/* 4. System Policy & Penalty Configuration */}
      <Card className="mb">
        <h3>Attendance Shift Windows & Financial Penalties</h3>
        <p className="muted text-sm mb-sm">
          Adjust the financial penalty rates in {currency} and daily shift arrival windows for scheduled shifts.
        </p>

        <form onSubmit={submitSettings} className="form" noValidate>
          <div className="two">
            <div>
              <label htmlFor="cfg-red-penalty" className="field-label">
                Red Penalty Value ({currency})
              </label>
              <input
                id="cfg-red-penalty"
                type="number"
                min="0"
                required
                value={settings.red_penalty_egp}
                onChange={(e) =>
                  setSettings({ ...settings, red_penalty_egp: e.target.value })
                }
                title={`Deduction amount per late check-in in ${currency}`}
              />
            </div>

            <div>
              <label htmlFor="cfg-black-penalty" className="field-label">
                Black Penalty Value ({currency})
              </label>
              <input
                id="cfg-black-penalty"
                type="number"
                min="0"
                required
                value={settings.black_penalty_egp}
                onChange={(e) =>
                  setSettings({ ...settings, black_penalty_egp: e.target.value })
                }
                title={`Deduction amount per severe delay or full-day absence in ${currency}`}
              />
            </div>
          </div>

          <div className="two">
            <div>
              <label htmlFor="cfg-early-start" className="field-label">
                Early Arrival Bonus Start (Shift Time)
              </label>
              <input
                id="cfg-early-start"
                type="time"
                required
                value={settings.early_window_start}
                onChange={(e) =>
                  setSettings({ ...settings, early_window_start: e.target.value })
                }
              />
            </div>

            <div>
              <label htmlFor="cfg-early-end" className="field-label">
                Early Arrival Bonus End / On-Time Start
              </label>
              <input
                id="cfg-early-end"
                type="time"
                required
                value={settings.early_window_end}
                onChange={(e) =>
                  setSettings({ ...settings, early_window_end: e.target.value })
                }
              />
            </div>
          </div>

          <div className="two">
            <div>
              <label htmlFor="cfg-normal-end" className="field-label">
                On-Time Deadline / Late Red Penalty Start
              </label>
              <input
                id="cfg-normal-end"
                type="time"
                required
                value={settings.normal_window_end}
                onChange={(e) =>
                  setSettings({ ...settings, normal_window_end: e.target.value })
                }
              />
            </div>

            <div>
              <label htmlFor="cfg-late-end" className="field-label">
                Severe Absence Cutoff / Black Penalty Start
              </label>
              <input
                id="cfg-late-end"
                type="time"
                required
                value={settings.late_window_end}
                onChange={(e) =>
                  setSettings({ ...settings, late_window_end: e.target.value })
                }
              />
            </div>
          </div>

          <Button disabled={savingSettings}>
            {savingSettings ? 'Saving Policy…' : 'Save Attendance Rules & Penalties'}
          </Button>
        </form>
      </Card>

      {/* 5. User Management Section */}
      <Card className="mb">
        <h3>User Management: Add Employee / Admin</h3>
        <p className="muted text-sm mb-sm">
          Create new staff, employee, or management accounts with portal access.
        </p>

        <form onSubmit={submitAddUser} className="form inline" noValidate>
          <input
            required
            aria-label="New user full name"
            placeholder="Full Name (e.g. Kareem Tarek)"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          />

          <input
            required
            aria-label="New user username"
            placeholder="Username (e.g. kareem)"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          />

          <select
            aria-label="New user role"
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <option value="employee">Employee / Staff</option>
            <option value="owner">System Owner / Admin</option>
          </select>

          <select
            aria-label="New user assigned shift"
            value={newUser.shift_id || (shifts[0] ? shifts[0].id : 1)}
            onChange={(e) => setNewUser({ ...newUser, shift_id: Number(e.target.value) })}
          >
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.start_time} - {s.end_time})
              </option>
            ))}
          </select>

          <Button disabled={addingUser}>
            {addingUser ? 'Adding…' : 'Add User Account'}
          </Button>
        </form>
      </Card>

      {/* 6. Employee List Table with Direct Password Reset & Remove Actions */}
      <Card>
        <h3>Staff Attendance & Point Balances</h3>
        {loading ? (
          <p className="muted">Loading staff list…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name / Username</th>
                <th>Role</th>
                <th>Assigned Shift</th>
                <th>Green Points</th>
                <th>Red ({redVal} {currency})</th>
                <th>Black ({blackVal} {currency})</th>
                <th>Current Deductions</th>
                <th>Account Security</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const redDeduction = (u.red || 0) * redVal;
                const blackDeduction = (u.black || 0) * blackVal;
                const totalDeductions = redDeduction + blackDeduction;
                return (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td><strong>{u.name || u.username}</strong></td>
                    <td className="capitalize">{u.role || 'employee'}</td>
                    <td>
                      <select
                        aria-label={`Assign shift for ${u.name || u.username}`}
                        value={u.shift_id || (shifts[0] ? shifts[0].id : 1)}
                        onChange={(e) => handleAssignUserShift(u, Number(e.target.value))}
                        style={{ padding: '4px 8px', fontSize: '0.82rem' }}
                      >
                        {shifts.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.start_time} - {s.end_time})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="green-text font-semibold">{u.green || 0}</td>
                    <td className="red-text font-semibold">{u.red || 0}</td>
                    <td className="black-text font-semibold">{u.black || 0}</td>
                    <td>
                      <span className={totalDeductions > 0 ? 'red-text font-semibold' : 'muted'}>
                        {totalDeductions} {currency}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-label={`Reset password for ${u.name || u.username}`}
                        onClick={() => {
                          setResetModalUser(u);
                          setNewPassword('NewPass123!');
                        }}
                      >
                        Reset Password
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-label={`Remove user ${u.name || u.username}`}
                        onClick={() => removeUser(u)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!users.length && (
                <tr>
                  <td colSpan="10" className="muted text-center">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {/* Direct Password Reset Modal */}
      {resetModalUser && (
        <Modal onClose={() => setResetModalUser(null)}>
          <h3>Reset Password for {resetModalUser.name || resetModalUser.username}</h3>
          <p className="muted text-sm mb">
            Set a new temporary password for this photographer/employee account. They can immediately sign in with these credentials.
          </p>

          <form onSubmit={submitPasswordReset} className="form">
            <div>
              <label htmlFor="reset-new-password" className="field-label">
                New Password
              </label>
              <input
                id="reset-new-password"
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <div className="btn-row mt">
              <Button disabled={resettingPassword}>
                {resettingPassword ? 'Resetting…' : 'Confirm Password Reset'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setResetModalUser(null)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 7. Point Adjustment Form */}
      <Card className="mt">
        <h3>Administrative Point Adjustment</h3>
        <p className="muted text-sm mb-sm">
          Manually award green bonus points or add/remove penalty points with an audit reason.
        </p>
        <form onSubmit={submitAdjust} className="form inline">
          <select
            required
            aria-label="Select employee"
            value={adj.user_id}
            onChange={(e) => setAdj({ ...adj, user_id: e.target.value })}
          >
            <option value="">Select Employee…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                #{u.id} {u.name || u.username}
              </option>
            ))}
          </select>

          <select
            aria-label="Select point color"
            value={adj.color}
            onChange={(e) => setAdj({ ...adj, color: e.target.value })}
          >
            <option value="green">Green (Early/Reward)</option>
            <option value="red">Red (Penalty - {redVal} {currency})</option>
            <option value="black">Black (Penalty - {blackVal} {currency})</option>
          </select>

          <input
            type="number"
            aria-label="Adjustment delta"
            value={adj.delta}
            onChange={(e) => setAdj({ ...adj, delta: e.target.value })}
            placeholder="Delta (+1, -1)"
            title="Positive adds points, negative removes points"
          />

          <input
            required
            aria-label="Reason for adjustment"
            placeholder="Audit reason (e.g. Overtime, Excused delay)"
            value={adj.reason}
            onChange={(e) => setAdj({ ...adj, reason: e.target.value })}
          />

          <Button>Apply Point Adjustment</Button>
        </form>
      </Card>

      {/* 8. Leave Requests Table */}
      <Card className="mt">
        <h3>Leave Requests & Absence Waiver</h3>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date Range</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((l) => {
              const isPending = String(l.status || '').toLowerCase() === 'pending';
              return (
                <tr key={l.id}>
                  <td><strong>{l.user_name || `User #${l.user_id}`}</strong></td>
                  <td>{l.start_date} → {l.end_date}</td>
                  <td>{l.reason}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>
                    {isPending ? (
                      <div className="btn-row">
                        <Button
                          type="button"
                          onClick={runAction(
                            () => api.approveLeave(l.id),
                            'Leave request approved: absence penalty waived'
                          )}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={runAction(
                            () => api.rejectLeave(l.id),
                            'Leave request rejected'
                          )}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="muted text-sm">Processed</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!leaves.length && (
              <tr>
                <td colSpan="5" className="muted text-center">
                  No leave requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* 9. Reward Requests Table */}
      <Card className="mt">
        <h3>{company.reward_threshold || 30}-Point Milestone Reward Claims ({company.reward_amount || 'Milestone Reward'})</h3>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Payout Method</th>
              <th>Account / Phone Number</th>
              <th>Valuation</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((r) => {
              const isPending = String(r.status || '').toLowerCase() === 'pending';
              return (
                <tr key={r.id}>
                  <td><strong>{r.user_name || `User #${r.user_id}`}</strong></td>
                  <td className="capitalize">{String(r.payout_method).replace('_', ' ')}</td>
                  <td><code>{r.number}</code></td>
                  <td>{company.reward_amount || 'Milestone Reward'}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    {isPending ? (
                      <Button
                        type="button"
                        onClick={runAction(
                          () => api.approveReward(r.id),
                          'Reward claim approved for payment disbursement'
                        )}
                      >
                        Approve Payout
                      </Button>
                    ) : (
                      <span className="muted text-sm">Processed</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rewards.length && (
              <tr>
                <td colSpan="6" className="muted text-center">
                  No reward requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* On-Site Kiosk Fullscreen Modal */}
      {showKioskModal && (
        <Modal onClose={() => setShowKioskModal(false)}>
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <span className="badge badge-superadmin" style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
              📍 LIVE ON-SITE ATTENDANCE KIOSK
            </span>
            <h2 style={{ margin: '8px 0' }}>{company.company_name}</h2>
            <p className="muted text-sm">
              Front Desk & Studio Terminal
            </p>

            <div
              style={{
                margin: '24px auto',
                padding: '24px',
                background: 'var(--card-bg)',
                border: '3px dashed var(--primary)',
                borderRadius: '16px',
                maxWidth: '320px',
              }}
            >
              <span className="muted text-sm block">ACTIVE CHECK-IN CODE</span>
              <div
                style={{
                  fontSize: '3.2rem',
                  fontWeight: 900,
                  letterSpacing: '6px',
                  color: 'var(--primary)',
                  margin: '12px 0',
                }}
              >
                {kioskCode}
              </div>
              <small className="muted block">
                Photographers: Enter this code in your mobile portal or scan on arrival.
              </small>
            </div>

            <div className="btn-row" style={{ justifyContent: 'center' }}>
              <Button type="button" variant="ghost" onClick={handleRotateKiosk} disabled={rotatingKiosk}>
                Generate New Code
              </Button>
              <Button type="button" onClick={() => setShowKioskModal(false)}>
                Exit Kiosk Mode
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default OwnerDashboard;
