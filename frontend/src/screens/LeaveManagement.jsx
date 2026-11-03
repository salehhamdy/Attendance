import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Card, Button, StatusBadge } from '../components/ui.jsx';

export default function LeaveManagement() {
  const [list, setList] = useState([]);
  const [f, setF] = useState({ start_date: '', end_date: '', reason: '' });
  const [err, setErr] = useState('');
  const load = () => api.listLeave().then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault(); setErr('');
    try { await api.requestLeave(f); setF({ start_date: '', end_date: '', reason: '' }); load(); }
    catch (x) { setErr(x.message); }
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div>
      <h2>Leave</h2>
      <Card>
        <form onSubmit={submit} className="form">
          <div className="two">
            <input type="date" required value={f.start_date} onChange={set('start_date')} />
            <input type="date" required value={f.end_date} onChange={set('end_date')} />
          </div>
          <textarea required placeholder="Reason" value={f.reason} onChange={set('reason')} />
          {err && <p className="error">{err}</p>}
          <Button>Submit request</Button>
        </form>
      </Card>
      <Card className="mt">
        <h3>History</h3>
        <table>
          <thead><tr><th>From</th><th>To</th><th>Reason</th><th>Status</th></tr></thead>
          <tbody>
            {list.map((l) => (
              <tr key={l.id}><td>{l.start_date}</td><td>{l.end_date}</td><td>{l.reason}</td><td><StatusBadge status={l.status} /></td></tr>
            ))}
            {!list.length && <tr><td colSpan="4" className="muted">No requests yet</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
