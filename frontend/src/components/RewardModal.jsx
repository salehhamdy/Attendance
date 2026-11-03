import React, { useState } from 'react';
import { Modal, Button } from './ui.jsx';
import { api } from '../api.js';

export default function RewardModal({ onClose, onDone }) {
  const [method, setMethod] = useState('vodafone_cash');
  const [number, setNumber] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api.requestReward(method, number);
      onDone();
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  }

  const isInsta = method === 'instapay';

  return (
    <Modal title="Claim Green Points Reward" onClose={onClose}>
      <div className="reward-banner">
        <div className="reward-title">30 Green Points Reward</div>
        <div className="reward-val">Valuation: 40 USD / 2,200 EGP</div>
        <p className="muted text-sm mt-xs">
          Select your payout method below. Payouts require owner approval.
        </p>
      </div>

      <form onSubmit={submit} className="form">
        <label className="field-label">Payout Method</label>
        <div className="seg">
          <Button
            type="button"
            variant={isInsta ? 'primary' : 'ghost'}
            onClick={() => setMethod('instapay')}
          >
            InstaPay
          </Button>
          <Button
            type="button"
            variant={!isInsta ? 'primary' : 'ghost'}
            onClick={() => setMethod('vodafone_cash')}
          >
            Vodafone Cash
          </Button>
        </div>

        <label htmlFor="payout-number" className="field-label">
          {isInsta ? 'InstaPay IPA / Phone' : 'Vodafone Cash Number'}
        </label>
        <input
          id="payout-number"
          required
          placeholder={isInsta ? 'username@instapay or 01xxxxxxxxx' : '010xxxxxxxx (11 digits)'}
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />

        {err && <p className="error" role="alert">{err}</p>}

        <Button disabled={busy || !number.trim()}>
          {busy ? 'Submitting…' : 'Submit Reward Request'}
        </Button>
      </form>
    </Modal>
  );
}
