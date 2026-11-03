import React, { useEffect, useState } from 'react';

const CONFETTI_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e'
];

export function Confetti({ active = false, duration = 3500, onComplete }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const generated = Array.from({ length: 48 }, (_, i) => ({
      id: i,
      left: Math.random() * 96 + '%',
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: Math.random() * 8 + 6 + 'px',
      delay: Math.random() * 0.6 + 's',
      duration: Math.random() * 1.5 + 2 + 's',
      rotation: Math.random() * 360 + 'deg',
    }));

    setParticles(generated);

    const timer = setTimeout(() => {
      setParticles([]);
      if (onComplete) onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [active, duration, onComplete]);

  if (!particles.length) return null;

  return (
    <div className="confetti-overlay" aria-hidden="true" data-testid="confetti-container">
      {particles.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
            transform: `rotate(${p.rotation})`,
          }}
        />
      ))}
    </div>
  );
}

export default Confetti;
