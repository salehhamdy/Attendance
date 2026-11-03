import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../../shared/api/index.js';
import { Card, Button, StatCard, Modal } from '../../../shared/ui/index.js';

function getInitials(name = '') {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'OW';
}

const AVATAR_COLORS = ['av-a', 'av-s', 'av-w', 'av-p'];

export function SuperadminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');

  // Create Owner Modal state
  const [showModal, setShowModal] = useState(false);
  const [newOwner, setNewOwner] = useState({
    name: '',
    username: '',
    email: '',
    workspace: '',
    password: 'OwnerPass123!',
  });
  const [savingOwner, setSavingOwner] = useState(false);

  const load = () => {
    setLoading(true);
    return api
      .superadminOwners()
      .then((res) => {
        setData(res);
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

  async function handleCreateOwner(e) {
    e.preventDefault();
    if (!newOwner.name.trim() || !newOwner.username.trim() || !newOwner.workspace.trim()) {
      setErr('Owner name, username, and assigned workspace are required');
      return;
    }
    setErr('');
    setMsg('');
    setSavingOwner(true);
    try {
      await api.createOwner(newOwner);
      setMsg(`Owner "${newOwner.name}" created and assigned to "${newOwner.workspace}".`);
      setShowModal(false);
      setNewOwner({
        name: '',
        username: '',
        email: '',
        workspace: '',
        password: 'OwnerPass123!',
      });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSavingOwner(false);
    }
  }

  async function handleSuspendOwner(owner) {
    setErr('');
    setMsg('');
    try {
      const res = await api.suspendOwner(owner.id);
      setMsg(
        res?.message ||
          `Owner "${owner.name}" and entire team (${owner.team_size || 0} members) suspended simultaneously.`
      );
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function handleReinstateOwner(owner) {
    setErr('');
    setMsg('');
    try {
      const res = await api.reinstateOwner(owner.id);
      setMsg(res?.message || `Owner "${owner.name}" reinstated. Full team access restored.`);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function handleRemoveOwner(owner) {
    setErr('');
    setMsg('');
    try {
      const res = await api.removeOwner(owner.id);
      setMsg(
        res?.message ||
          `Owner "${owner.name}" and all ${owner.team_size || 0} team members permanently removed.`
      );
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  const ownersList = useMemo(() => data?.owners || [], [data?.owners]);
  const superadmin = data?.superadmin || {
    name: 'Platform Superadmin',
    email: 'admin@platform.com',
    workspace: 'Global Platform',
  };
  const stats = data?.stats || {
    total_owners: ownersList.length,
    active_owners: ownersList.filter((o) => o.status === 'active').length,
    suspended_owners: ownersList.filter((o) => o.status === 'suspended').length,
    total_team_members: ownersList.reduce((acc, o) => acc + (o.team_size || 0), 0),
  };

  const filteredOwners = useMemo(() => {
    if (!search.trim()) return ownersList;
    const q = search.toLowerCase();
    return ownersList.filter(
      (o) =>
        (o.name && o.name.toLowerCase().includes(q)) ||
        (o.username && o.username.toLowerCase().includes(q)) ||
        (o.email && o.email.toLowerCase().includes(q)) ||
        (o.workspace && o.workspace.toLowerCase().includes(q))
    );
  }, [ownersList, search]);

  return (
    <div>
      <div className="row-head">
        <div>
          <h2>Platform Superadmin Console</h2>
          <p className="muted subtitle">
            Top-level organizational authority: assign business owners, control workspace teams, and enforce permissions. Superadmin is immutable.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Assign New Owner</Button>
      </div>

      {err && <p className="error" role="alert">{err}</p>}
      {msg && <p className="ok" role="status">{msg}</p>}

      {/* Stats Bar */}
      <div className="grid3 mb">
        <StatCard
          variant="green"
          title="Total Owners"
          value={stats.total_owners}
          sub="Registered business owners"
        />
        <StatCard
          variant="green"
          title="Active Owners"
          value={stats.active_owners}
          sub="Operational workspaces"
        />
        <StatCard
          variant="black"
          title="Suspended Owners"
          value={stats.suspended_owners}
          sub="Suspended with entire teams"
        />
        <StatCard
          variant="red"
          title="Total Team Members"
          value={stats.total_team_members}
          sub="Staff and photographers governed"
        />
      </div>

      {/* Owner Management Table */}
      <Card>
        <div className="row-head mb-sm">
          <div>
            <h3>All Platform Accounts & Owners</h3>
            <p className="muted text-sm">
              Superadmin account is protected and immutable. Managing an owner cascades access controls across their entire team.
            </p>
          </div>
          <input
            type="search"
            aria-label="Search owners"
            placeholder="Search owners or workspaces…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '240px' }}
          />
        </div>

        {loading ? (
          <p className="muted">Loading accounts…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Assigned Workspace</th>
                <th>Role</th>
                <th>Team Size</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Immutable Superadmin Row */}
              <tr className="superadmin-row">
                <td>
                  <div className="owner-cell">
                    <div className="avatar av-p">SA</div>
                    <div>
                      <strong>You ({superadmin.name})</strong>
                      <small className="block muted">{superadmin.email}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <strong>{superadmin.workspace}</strong>
                </td>
                <td>
                  <span className="badge-superadmin">🛡️ Superadmin</span>
                </td>
                <td>—</td>
                <td>
                  <span className="badge badge-active">Active</span>
                </td>
                <td>
                  <span className="lock-note">🔒 Protected (Immutable)</span>
                </td>
              </tr>

              {/* Dynamic Owner Rows */}
              {filteredOwners.map((o, idx) => {
                const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const isSuspended = o.status === 'suspended';
                return (
                  <tr key={o.id}>
                    <td>
                      <div className="owner-cell">
                        <div className={`avatar ${colorClass}`}>
                          {getInitials(o.name || o.username)}
                        </div>
                        <div>
                          <strong>{o.name || o.username}</strong>
                          <small className="block muted">{o.email || `@${o.username}`}</small>
                        </div>
                      </div>
                    </td>
                    <td>{o.workspace || 'Designated Workplace'}</td>
                    <td>
                      <span className="font-semibold text-sm muted">Owner</span>
                    </td>
                    <td>
                      <strong>{o.team_size || 0} members</strong>
                    </td>
                    <td>
                      <span className={`badge ${isSuspended ? 'badge-suspended' : 'badge-active'}`}>
                        {isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <div className="btn-row">
                        {isSuspended ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            style={{ color: 'var(--green)', borderColor: 'var(--green)' }}
                            aria-label={`Reinstate owner ${o.name || o.username}`}
                            onClick={() => handleReinstateOwner(o)}
                          >
                            Reinstate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-warn"
                            aria-label={`Suspend owner ${o.name || o.username}`}
                            onClick={() => handleSuspendOwner(o)}
                          >
                            Suspend
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          aria-label={`Remove owner ${o.name || o.username}`}
                          onClick={() => handleRemoveOwner(o)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!filteredOwners.length && (
                <tr>
                  <td colSpan="6" className="muted text-center">
                    No matching owners found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {/* Assign New Owner Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h3>Assign New Business Owner</h3>
          <p className="muted text-sm mb">
            Provision a new owner account and assign them to an organizational workspace.
          </p>

          <form onSubmit={handleCreateOwner} className="form" noValidate>
            <div className="two">
              <div>
                <label htmlFor="owner-name" className="field-label">
                  Owner Full Name
                </label>
                <input
                  id="owner-name"
                  type="text"
                  required
                  placeholder="e.g. Layla Mansour"
                  value={newOwner.name}
                  onChange={(e) => setNewOwner({ ...newOwner, name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="owner-username" className="field-label">
                  Username
                </label>
                <input
                  id="owner-username"
                  type="text"
                  required
                  placeholder="e.g. layla"
                  value={newOwner.username}
                  onChange={(e) => setNewOwner({ ...newOwner, username: e.target.value })}
                />
              </div>
            </div>

            <div className="two">
              <div>
                <label htmlFor="owner-email" className="field-label">
                  Email Address
                </label>
                <input
                  id="owner-email"
                  type="email"
                  placeholder="e.g. layla@acme.com"
                  value={newOwner.email}
                  onChange={(e) => setNewOwner({ ...newOwner, email: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="owner-workspace" className="field-label">
                  Assigned Workspace / Business
                </label>
                <input
                  id="owner-workspace"
                  type="text"
                  required
                  placeholder="e.g. Acme Resorts Sharm"
                  value={newOwner.workspace}
                  onChange={(e) => setNewOwner({ ...newOwner, workspace: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="owner-password" className="field-label">
                Initial Account Password
              </label>
              <input
                id="owner-password"
                type="text"
                required
                value={newOwner.password}
                onChange={(e) => setNewOwner({ ...newOwner, password: e.target.value })}
              />
            </div>

            <div className="btn-row mt">
              <Button disabled={savingOwner}>
                {savingOwner ? 'Creating…' : 'Create & Assign Owner'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default SuperadminDashboard;
