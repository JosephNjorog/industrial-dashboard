import { useState, useEffect } from 'react';

export default function DateTimeCard() {
  const [dateTime, setDateTime] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDateTime(new Date());
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!dateTime) {
    return null;
  }

  const date = dateTime.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const time = dateTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '16px',
      background: 'rgba(0, 0, 0, 0.25)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '8px 16px',
      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          fontSize: '0.65rem', 
          fontWeight: 800, 
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '2px'
        }}>
          <span style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--success)',
            animation: 'pulse 1s infinite',
          }} />
          System Time
        </div>
        <div style={{ 
          fontSize: '1.2rem', 
          color: 'var(--accent)', 
          fontFamily: '"JetBrains Mono", "Roboto Mono", monospace',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1
        }}>
          {time}
        </div>
      </div>
      
      <div style={{ 
        height: '24px', 
        width: '1px', 
        background: 'var(--border)' 
      }} />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--foreground)', 
          fontWeight: 700,
          textTransform: 'uppercase'
        }}>
          {date.split(',')[1]}
        </div>
        <div style={{ 
          fontSize: '0.65rem', 
          color: 'var(--text-muted)',
          fontWeight: 600,
          textTransform: 'uppercase'
        }}>
          {date.split(',')[0]}
        </div>
      </div>
    </div>
  );
}
