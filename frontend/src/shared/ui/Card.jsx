import React from 'react';

export const Card = ({ className = '', children, ...props }) => (
  <div className={`card ${className}`} {...props}>
    {children}
  </div>
);
