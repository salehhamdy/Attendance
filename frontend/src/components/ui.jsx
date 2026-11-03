import React from 'react';

export const Card = ({ className = '', children, ...props }) => (
  <div className={`card ${className}`} {...props}>
    {children}
  </div>
);

export const Button = ({ variant = 'primary', className = '', type = 'submit', ...props }) => (
  <button type={type} className={`btn btn-${variant} ${className}`} {...props} />
);

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

export const StatusBadge = ({ status, children }) => {
  const s = String(status || '').toLowerCase();
  return <span className={`badge badge-${s}`}>{children || s}</span>;
};

export function Modal({ title, onClose, children }) {
  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="x" aria-label="Close modal" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const StatCard = ({ variant, title, value, sub }) => (
  <Card className={`stat stat-${variant}`}>
    <div className="stat-title">{title}</div>
    <div className="stat-value">{value}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </Card>
);
