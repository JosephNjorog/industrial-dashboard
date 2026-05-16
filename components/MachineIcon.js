export default function MachineIcon({ type, size = 40, color = '#4ce7ff' }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
  };

  if (type === 'pump') {
    return (
      <svg {...common}>
        <defs>
          <linearGradient id="pumpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {/* Isometric Base */}
        <path d="M12 44 L32 54 L52 44 L32 34 Z" fill="rgba(0,0,0,0.3)" stroke={color} strokeWidth="1" />
        {/* Volute (Isometric Cylinder) */}
        <path d="M16 32 L16 42 C16 50 48 50 48 42 L48 32" fill="url(#pumpGrad)" stroke={color} strokeWidth="2" />
        <ellipse cx="32" cy="32" rx="16" ry="8" fill="url(#pumpGrad)" stroke={color} strokeWidth="2" />
        {/* Discharge pipe */}
        <path d="M28 24 L28 10 L36 10 L36 24" fill="rgba(0,0,0,0.2)" stroke={color} strokeWidth="2" />
        <ellipse cx="32" cy="10" rx="4" ry="2" fill={color} />
      </svg>
    );
  }

  if (type === 'motor') {
    return (
      <svg {...common}>
        <defs>
          <linearGradient id="motorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.7" />
            <stop offset="100%" stopColor={color} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {/* Isometric Box Body */}
        <path d="M10 35 L30 45 L54 33 L34 23 Z" fill={color} opacity="0.2" stroke={color} strokeWidth="1" />
        <path d="M10 35 L10 45 L30 55 L30 45 Z" fill={color} opacity="0.4" stroke={color} strokeWidth="1" />
        <path d="M30 45 L30 55 L54 43 L54 33 Z" fill={color} opacity="0.6" stroke={color} strokeWidth="1" />
        {/* Cooling Fins */}
        <path d="M15 38 L15 48 M20 41 L20 51 M25 43 L25 53" stroke={color} strokeWidth="1" opacity="0.5" />
        {/* Shaft */}
        <path d="M54 33 L62 29" stroke={color} strokeWidth="4" strokeLinecap="round" />
        {/* Terminal Box */}
        <path d="M20 20 L35 27 L45 22 L30 15 Z" fill="url(#motorGrad)" stroke={color} strokeWidth="2" />
      </svg>
    );
  }

  if (type === 'fan') {
    return (
      <svg {...common}>
        {/* Base shadow */}
        <ellipse cx="32" cy="50" rx="20" ry="6" fill="rgba(0,0,0,0.4)" />
        {/* Shroud (Isometric Ring) */}
        <path d="M12 32 C12 45 52 45 52 32" stroke={color} strokeWidth="2" fill="none" opacity="0.5" />
        <ellipse cx="32" cy="28" rx="20" ry="10" stroke={color} strokeWidth="3" fill="rgba(76, 231, 255, 0.05)" />
        {/* Blades in 3D perspective */}
        <path d="M32 28 L32 8 M32 28 L48 36 M32 28 L16 36" stroke={color} strokeWidth="6" strokeLinecap="round" />
        {/* Center Hub */}
        <ellipse cx="32" cy="28" rx="5" ry="2.5" fill={color} />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="10" y="10" width="44" height="44" rx="10" stroke={color} strokeWidth="3" fill="rgba(76, 231, 255, 0.05)" />
      <path d="M22 22L42 42M42 22L22 42" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
