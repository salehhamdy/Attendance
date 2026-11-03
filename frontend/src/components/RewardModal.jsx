import React, { useState } from 'react';
import { Modal, Button } from './ui.jsx';
import { api } from '../api.js';

export default function RewardModal({ onClose, onDone }) {
  const [method, setMethod] = useState('vodafone_cash');
  const [number, setNumber] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.requestReward(method, number); onDone(); }
    catch (x) { setErr(x.message); setBusy(false); }
  }
  return (
    <Modal title="Send Reward Request" onClose={onClose}>
      <p className="muted">Reward: 40 USD / 2200 EGP</p>
      <form onSubmit={submit} className="form">
        <div className="seg">
          <Button type="button" variant={method === 'instapay' ? 'primary' : 'ghost'} onClick={() => setMethod('instapay')}>InstaPay</Button>
          <Button type="button" variant={method === 'vodafone_cash' ? 'primary' : 'ghost'} onClick={() => setMethod('vodafone_cash')}>Vodafone Cash</Button>
        </div>
        <input required placeholder="Number / handle" value={number} onChange={(e) => setNumber(e.target.value)} />
        {err && <p className="error">{err}</p>}
        <Button disabled={busy}>{busy ? 'Sending…' : 'Submit'}</Button>
      </form>
    </Modal>
  );
}
