import React from 'react';

export const StatusBadge = ({ status, children }) => {
  const s = String(status || '').toLowerCase();
  return <span className={`badge badge-${s}`}>{children || s}</span>;
};

