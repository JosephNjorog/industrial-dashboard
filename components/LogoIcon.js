export default function LogoIcon({ size = 48, color = '#4ce7ff' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.4" />
        </linearGradient>
        <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 3D Shield Base (Isometric depth) */}
      <path
        d="M32 4L10 14V32C10 46 32 54 32 54C32 54 54 46 54 32V14L32 4Z"
        fill="rgba(0,0,0,0.4)"
        stroke={color}
        strokeWidth="1"
        opacity="0.5"
      />
      
      {/* Front Face of 3D Shield */}
      <path
        d="M32 8L14 17V32C14 44 32 50 32 50C32 50 50 44 50 32V17L32 8Z"
        fill="url(#logoGrad)"
        stroke={color}
        strokeWidth="2"
        filter="url(#logoGlow)"
      />

      {/* Isometric 3D Cube at center */}
      <g transform="translate(32, 28) scale(0.8)">
        {/* Top */}
        <path d="M0 -12 L12 -6 L0 0 L-12 -6 Z" fill="#fff" opacity="0.9" />
        {/* Left */}
        <path d="M-12 -6 L0 0 L0 12 L-12 6 Z" fill={color} opacity="0.6" />
        {/* Right */}
        <path d="M0 0 L12 -6 L12 6 L0 12 Z" fill={color} opacity="0.8" />
      </g>
      
      {/* Power Ring */}
      <path
        d="M20 32C20 38 32 42 32 42C32 42 44 38 44 32"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
