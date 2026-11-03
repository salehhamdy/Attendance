import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Card, Button, StatusBadge } from '../components/ui.jsx';

export default function OwnerDashboard() {
  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [err, setErr] = useState('');
  const [adj, setAdj] = useState({ user_id: '', color: 'green', delta: 1, reason: '' });

  const load = () => api.ownerUsers().then((r) => {
    const list = Array.isArray(r) ? r : r.users || [];
    setUsers(list);
    setLeaves(Array.isArray(r) ? list.flatMap((u) => u.leave_requests || []) : r.leave_requests || r.leaves || []);
    setRewards(Array.isArray(r) ? list.flatMap((u) => u.reward_requests || []) : r.reward_requests || r.rewards || []);
  }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const run = (fn) => async () => { setErr(''); try { await fn(); load(); } catch (e) { setErr(e.message); } };

  async function submitAdjust(e) {
    e.preventDefault();
    run(() => api.ownerAdjust({ ...adj, user_id: Number(adj.user_id) || adj.user_id, delta: Number(adj.delta) }))();
  }
  const pending = (x) => String(x.status).toLowerCase() === 'pending';

  return (
    <div>
      <h2>Owner Panel</h2>
      {err && <p className="error">{err}</p>}
      <Card>
        <h3>Employees</h3>
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Green</th><th>Red</th><th>Black</th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id}><td>{u.id}</td><td>{u.name || u.username}</td><td>{u.green}</td><td>{u.red}</td><td>{u.black}</td></tr>
          ))}</tbody>
        </table>
      </Card>
      <Card className="mt">
        <h3>Adjust points</h3>
        <form onSubmit={submitAdjust} className="form inline">
          <select required value={adj.user_id} onChange={(e) => setAdj({ ...adj, user_id: e.target.value })}>
            <option value="">Employee…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
          </select>
          <select value={adj.color} onChange={(e) => setAdj({ ...adj, color: e.target.value })}>
            <option>green</option><option>red</option><option>black</option>
          </select>
          <input type="number" value={adj.delta} onChange={(e) => setAdj({ ...adj, delta: e.target.value })} title="Positive adds, negative removes" />
          <input required placeholder="Reason" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} />
          <Button>Apply</Button>
        </form>
      </Card>
      <Card className="mt">
        <h3>Leave requests</h3>
        <table>
          <tbody>{leaves.map((l) => (
            <tr key={l.id}><td>{l.user_name || l.user_id}</td><td>{l.start_date} → {l.end_date}</td><td>{l.reason}</td>
              <td><StatusBadge status={l.status} /></td>
              <td>{pending(l) && <><Button onClick={run(() => api.approveLeave(l.id))}>Approve</Button> <Button variant="ghost" onClick={run(() => api.rejectLeave(l.id))}>Reject</Button></>}</td></tr>
          ))}
          {!leaves.length && <tr><td className="muted">None</td></tr>}</tbody>
        </table>
      </Card>
      <Card className="mt">
        <h3>Reward requests</h3>
        <table>
          <tbody>{rewards.map((r) => (
            <tr key={r.id}><td>{r.user_name || r.user_id}</td><td>{r.payout_method}</td><td>{r.number}</td>
              <td><StatusBadge status={r.status} /></td>
              <td>{pending(r) && <Button onClick={run(() => api.approveReward(r.id))}>Approve</Button>}</td></tr>
          ))}
          {!rewards.length && <tr><td className="muted">None</td></tr>}</tbody>
        </table>
      </Card>
    </div>
  );
}
