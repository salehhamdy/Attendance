import React, { useEffect, useState } from 'react';
import { api } from '../../../shared/api/index.js';
import { Card, Button, StatusBadge } from '../../../shared/ui/index.js';

export function LeaveManagement() {
  const [list, setList] = useState([]);
  const [f, setF] = useState({ start_date: '', end_date: '', reason: '' });
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    return api
      .listLeave()
      .then((data) => {
        setList(Array.isArray(data) ? data : []);
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

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setMsg('');

    if (f.start_date && f.end_date && f.end_date < f.start_date) {
      setErr('End date cannot be earlier than start date');
      return;
    }

    setSubmitting(true);
    try {
      await api.requestLeave(f);
      setF({ start_date: '', end_date: '', reason: '' });
      setMsg('Leave request submitted! Once approved by the owner, absence penalties are waived.');
      await load();
    } catch (x) {
      setErr(x.message);
    } finally {
      setSubmitting(false);
    }
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div>
      <h2>Leave Management</h2>
      <p className="muted mb">
        Submit scheduled leave to exempt your attendance from severe absence deductions (1,000 EGP Black Penalties).
      </p>

      {err && <p className="error" role="alert">{err}</p>}
      {msg && <p className="ok" role="status">{msg}</p>}

      <Card>
        <h3>Request Leave</h3>
        <form onSubmit={submit} className="form" noValidate>
          <div className="two">
            <div>
              <label htmlFor="leave-start" className="field-label">Start Date</label>
              <input
                id="leave-start"
                type="date"
                required
                value={f.start_date}
                onChange={set('start_date')}
              />
            </div>
            <div>
              <label htmlFor="leave-end" className="field-label">End Date</label>
              <input
                id="leave-end"
                type="date"
                required
                min={f.start_date || undefined}
                value={f.end_date}
                onChange={set('end_date')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="leave-reason" className="field-label">Reason</label>
            <textarea
              id="leave-reason"
              required
              placeholder="Provide reason for absence (e.g. Family emergency, Sick leave, Vacation)"
              value={f.reason}
              onChange={set('reason')}
            />
          </div>

          <Button disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Leave Request'}
          </Button>
        </form>
      </Card>

      <Card className="mt">
        <h3>Leave History & Status</h3>
        {loading ? (
          <p className="muted">Loading leave requests…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id}>
                  <td>{l.start_date}</td>
                  <td>{l.end_date}</td>
                  <td>{l.reason}</td>
                  <td>
                    <StatusBadge status={l.status} />
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan="4" className="muted text-center">
                    No leave requests on record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export default LeaveManagement;

