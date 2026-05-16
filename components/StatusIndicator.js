import { useEffect, useState } from 'react';

const statusColors = {
  Healthy: 'var(--success)',
  Warning: 'var(--warning)',
  Critical: 'var(--danger)',
};

const statusStyles = {
  wrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '999px',
    background: 'var(--badge-bg)',
    border: '1px solid var(--border)',
    transition: 'all 0.3s ease',
  },
  wrapperChanged: {
    animation: 'pulse 0.6s ease-in-out',
  },
  dot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    transition: 'all 0.3s ease',
  },
  dotChanged: {
    animation: 'glow 0.6s ease-in-out',
  },
  label: {
    color: 'var(--foreground)',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    fontSize: '0.85rem',
  },
};

export default function StatusIndicator({ status = 'Healthy', hasChanged = false }) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (hasChanged) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [hasChanged]);

  const color = statusColors[status] || statusColors.Healthy;

  return (
    <div style={{
      ...statusStyles.wrapper,
      ...(isAnimating && statusStyles.wrapperChanged)
    }}>
      <span style={{
        ...statusStyles.dot,
        background: color,
        boxShadow: `0 0 15px ${color}`,
        ...(isAnimating && statusStyles.dotChanged)
      }} />
      <span style={statusStyles.label}>{status}</span>

      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes glow {
          0% { box-shadow: 0 0 12px rgba(0,0,0,0.3), 0 0 15px ${color}; }
          50% { box-shadow: 0 0 12px rgba(0,0,0,0.3), 0 0 25px ${color}; }
          100% { box-shadow: 0 0 12px rgba(0,0,0,0.3), 0 0 15px ${color}; }
        }
      `}</style>
    </div>
  );
}
