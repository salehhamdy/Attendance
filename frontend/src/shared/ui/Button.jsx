import React from 'react';

export const Button = ({ variant = 'primary', className = '', type = 'submit', ...props }) => (
  <button type={type} className={`btn btn-${variant} ${className}`} {...props} />
);

