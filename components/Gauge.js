import React, { useEffect, useRef } from 'react';

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
  
  const circleRef = useRef(null);
  const textRef = useRef(null);
  const prevValueRef = useRef(min);

  // Shorten label if it's "MAINT. CYCLE"
  const displayLabel = label === 'MAINT. CYCLE' ? 'MAINT.' : label;

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    
    // Ensure value is normalized
    const normalizedEnd = Math.min(Math.max(endValue, min), max);
    const normalizedStart = Math.min(Math.max(startValue, min), max);

    if (normalizedStart === normalizedEnd && circleRef.current && textRef.current) {
      // Just set them directly if no change
      const pct = (normalizedEnd - min) / (max - min);
      const offset = circumference - (pct * circumference);
      circleRef.current.setAttribute('stroke-dashoffset', offset);
      textRef.current.textContent = normalizedEnd;
      return;
    }

    let startTimestamp = null;
    const duration = 1200; // 1.2s smooth spin up / transition
    let animationFrameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing: cubicOut for smooth deceleration
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentVal = Math.round(normalizedStart + easedProgress * (normalizedEnd - normalizedStart));
      const currentPct = (normalizedStart + easedProgress * (normalizedEnd - normalizedStart) - min) / (max - min);
      const currentOffset = circumference - (currentPct * circumference);

      if (circleRef.current) {
        circleRef.current.setAttribute('stroke-dashoffset', currentOffset);
      }
      if (textRef.current) {
        textRef.current.textContent = currentVal;
      }
      prevValueRef.current = currentVal;

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value, min, max, circumference]);

  // Initial calculation for static server-side rendering
  const normalizedValue = Math.min(Math.max(value, min), max);
  const percentage = (normalizedValue - min) / (max - min);
  const strokeDashoffset = circumference - (percentage * circumference);

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
            ref={circleRef}
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter={`url(#glow-${displayLabel.replace(/\s+/g, '-')})`}
            style={{ transition: 'stroke 0.3s ease' }}
          />

          {/* Text rotated back to normal */}
          <g transform="rotate(90 50 50)">
            <text 
              ref={textRef}
              x="50" 
              y="48" 
              textAnchor="middle" 
              dominantBaseline="middle"
              fill={color} 
              style={{ 
                fontSize: '22px', 
                fontWeight: 900, 
                fontFamily: 'var(--font-mono), monospace',
                textShadow: `0 0 15px ${color}`
              }}
            >
              {normalizedValue}
            </text>
            <text 
              x="50" 
              y="64" 
              textAnchor="middle" 
              fill="var(--foreground)" 
              style={{ 
                fontSize: '11px', 
                fontWeight: 800, 
                fontFamily: 'var(--font-sans), sans-serif',
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
