import React from 'react';

export const ToggleSwitch = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    className={`toggle ${checked ? 'on' : ''}`}
    onClick={() => onChange && onChange(!checked)}
  >
    <span className="knob" />
  </button>
);
