import React from 'react';

export default function Gauge({ 
  value = 0, 
  min = 0, 
  max = 100, 
  label = '', 
  unit = '', 
  color = 'var(--accent)', 
  size = 120 
}) {
  const radius = 42;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  
  // Normalize value between min and max
  const normalizedValue = Math.min(Math.max(value, min), max);
  const percentage = (normalizedValue - min) / (max - min);
  const strokeDashoffset = circumference - (percentage * circumference);

  // Shorten label if it's "MAINT. CYCLE"
  const displayLabel = label === 'MAINT. CYCLE' ? 'MAINT.' : label;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      width: `${size}px` 
    }}>
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
        <svg 
          viewBox="0 0 100 100" 
          style={{ width: '100%', height: '100%', overflow: 'visible', transform: 'rotate(-90deg)' }}
        >
          {/* Defs for Glow and Gradient */}
          <defs>
            <filter id={`glow-${displayLabel.replace(/\s+/g, '-')}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            {/* Inner radial gradient for pop */}
            <radialGradient id={`bg-grad-${displayLabel.replace(/\s+/g, '-')}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={color} stopOpacity="0.15" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Inner Glow Background */}
          <circle 
            cx="50" cy="50" r={radius - strokeWidth/2}
            fill={`url(#bg-grad-${displayLabel.replace(/\s+/g, '-')})`}
          />

          {/* Background Track */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="var(--badge-bg)"
            strokeWidth={strokeWidth}
          />

          {/* Value Track */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter={`url(#glow-${displayLabel.replace(/\s+/g, '-')})`}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.3s ease' }}
          />

          {/* Text needs to be rotated back to normal */}
          <g transform="rotate(90 50 50)">
            <text 
              x="50" 
              y="48" 
              textAnchor="middle" 
              dominantBaseline="middle"
              fill={color} 
              style={{ 
                fontSize: '22px', 
                fontWeight: 900, 
                fontFamily: 'Inter, sans-serif',
                textShadow: `0 0 15px ${color}`
              }}
            >
              {value}
            </text>
            <text 
              x="50" 
              y="64" 
              textAnchor="middle" 
              fill="var(--foreground)" 
              style={{ 
                fontSize: '11px', 
                fontWeight: 800, 
                fontFamily: 'Inter, sans-serif',
                opacity: 0.7
              }}
            >
              {unit}
            </text>
          </g>
        </svg>
      </div>

      {/* Label */}
      <div style={{ textAlign: 'center', marginTop: '8px' }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          {displayLabel}
        </div>
      </div>
    </div>
  );
}
