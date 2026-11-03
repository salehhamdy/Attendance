import React from 'react';
import { Card } from './Card.jsx';

export const StatCard = ({ variant, title, value, sub }) => (
  <Card className={`stat stat-${variant}`}>
    <div className="stat-title">{title}</div>
    <div className="stat-value">{value}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </Card>
);

