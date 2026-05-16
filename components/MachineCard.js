import MachineIcon from './MachineIcon';
import { getMaintenanceProgress } from '../utils/helpers';

const Sparkline = ({ data = [], dataKey, color }) => {
  const points = data.slice(-15);
  if (points.length < 2) return <div style={{ height: '16px' }} />;

  const values = points.map((p) => Number(p[dataKey] ?? 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = (max - min) || 1;
  const width = 100;
  const height = 10;
  const step = width / (values.length - 1);
  
  const path = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '10px', display: 'block' }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" opacity="0.6" />
    </svg>
  );
};

export default function MachineCard({ machine, title, stats, history = [], onControl, isLocked, onViewDetails, openModal }) {
  const isActive = stats.state === 'ON';
  const isAlert = stats.status === 'Critical' || stats.status === 'Warning';

  return (
    <div className="glass-panel" style={{
      padding: '8px',
      borderRadius: '10px',
      background: 'var(--card-gradient)',
      border: `1px solid ${isAlert ? 'var(--danger)' : 'var(--border)'}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: '260px',
      flex: '1'
    }}>
      {/* ─── HEADER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <MachineIcon type={machine} size={20} color={isActive ? 'var(--accent)' : 'var(--text-muted)'} />
          <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>{title}</h3>
        </div>
        <div style={{ 
          fontSize: '0.6rem', 
          fontWeight: 900, 
          color: stats.rawState === 'RUNNING' ? 'var(--success)' : stats.rawState === 'FAULT' ? 'var(--danger)' : 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>{stats.rawState === 'RUNNING' ? '●' : '○'}</span>
          {stats.rawState || (isActive ? 'ACTIVE' : 'IDLE')}
        </div>
      </div>

      {/* ─── HEALTH STATUS BAR (IMPORTANT) ─── */}
      <div style={{ marginTop: '2px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', fontWeight: 800, marginBottom: '2px' }}>
          <span style={{ color: 'var(--text-muted)' }}>HEALTH STATUS</span>
          <span style={{ color: stats.health > 80 ? 'var(--success)' : stats.health > 50 ? 'var(--warning)' : 'var(--danger)' }}>
            {stats.health.toFixed(0)}%
          </span>
        </div>
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ 
            width: `${stats.health}%`, 
            height: '100%', 
            background: stats.health > 80 ? 'var(--success)' : stats.health > 50 ? 'var(--warning)' : 'var(--danger)',
            boxShadow: `0 0 10px ${stats.health > 80 ? 'var(--success)' : 'var(--danger)'}`,
            transition: 'width 1s ease'
          }} />
        </div>
      </div>

      {/* ─── METRICS & GRAPHS ─── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: stats.hasVibration ? '1fr 1fr 1fr' : '1fr 1fr', 
        gap: '4px', 
        marginTop: '4px' 
      }}>
        {[
          { 
            label: 'TEMP', 
            val: stats.isSensorError ? 'ERR' : stats.temp.toFixed(1), 
            unit: '°C', 
            color: stats.isSensorError ? 'var(--danger)' : 'var(--warning)', 
            key: 'temp' 
          },
          { label: 'LOAD', val: stats.current.toFixed(1), unit: 'A', color: 'var(--accent)', key: 'current' },
          stats.hasVibration && { 
            label: 'FFT PEAK', 
            val: (stats.vibration_freq || 0).toFixed(1), 
            unit: 'Hz', 
            color: '#a855f7', 
            key: 'vibration_freq' 
          }
        ].filter(Boolean).map((m, i) => (
          <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: 700 }}>{m.label}</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: m.color }}>{m.val}<span style={{ fontSize: '0.5rem', opacity: 0.6 }}>{m.unit}</span></div>
            <Sparkline data={history} dataKey={m.key} color={m.color} />
          </div>
        ))}
      </div>

      {/* ─── NEW: FAULT DIAGNOSIS ─── */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: (stats.bearing && stats.bearing !== 'NORMAL') ? 'rgba(255, 45, 85, 0.1)' : 'rgba(255,255,255,0.02)', 
        padding: '4px 8px', 
        borderRadius: '6px',
        border: `1px solid ${(stats.bearing && stats.bearing !== 'NORMAL') ? 'var(--danger)' : 'transparent'}`
      }}>
        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 700 }}>DIAGNOSTIC STATUS</div>
        <div style={{ 
          fontSize: '0.65rem', 
          fontWeight: 900, 
          color: (stats.bearing && stats.bearing !== 'NORMAL') ? 'var(--danger)' : 'var(--success)' 
        }}>
          {stats.bearing || 'NORMAL'}
        </div>
      </div>

      {/* ─── PREDICTION INFO ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '6px' }}>
        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 700 }}>EST. FAILURE</div>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: stats.ttfHours < 100 ? 'var(--danger)' : 'var(--success)' }}>
          {stats.ttfHours > 900 ? 'STABLE' : `IN ${stats.ttfHours.toFixed(0)}h`}
        </div>
      </div>

      {/* ─── MAINTENANCE PROGRESS ─── */}
      <div style={{ marginTop: '2px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.45rem', fontWeight: 800, marginBottom: '2px' }}>
          <span style={{ color: 'var(--text-muted)' }}>MAINTENANCE CYLE</span>
          <span style={{ color: (stats.maintenanceProgress || 0) > 90 ? 'var(--danger)' : 'var(--accent)' }}>
            {(stats.maintenance_due ?? 3000).toFixed(0)}h REMAINING
          </span>
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${stats.maintenanceProgress}%`, 
            height: '100%', 
            background: stats.maintenanceProgress > 90 ? 'var(--danger)' : 'var(--accent)',
            transition: 'width 1s ease'
          }} />
        </div>
      </div>

      {/* ─── POWER & ENERGY ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: 'rgba(0, 255, 136, 0.05)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0, 255, 136, 0.1)' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.45rem', color: 'var(--success)', fontWeight: 800 }}>REAL-TIME POWER</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>{stats.power.toFixed(0)}<span style={{ fontSize: '0.5rem', marginLeft: '2px', opacity: 0.7 }}>W</span></span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <span style={{ fontSize: '0.45rem', color: 'var(--success)', fontWeight: 800 }}>TOTAL ENERGY</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>{stats.energy.toFixed(3)}<span style={{ fontSize: '0.5rem', marginLeft: '2px', opacity: 0.7 }}>kWh</span></span>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '4px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={() => onViewDetails(machine)}
            style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#fff', fontSize: '0.55rem', fontWeight: 700, cursor: 'pointer' }}
          >
            ANALYTICS
          </button>
        </div>
        <button 
          onClick={() => onControl(machine, isActive ? 'OFF' : 'ON')}
          style={{ 
            padding: '4px 12px', 
            borderRadius: '6px', 
            background: stats.pendingCmdId ? 'rgba(255, 255, 255, 0.1)' : (isActive ? 'rgba(255, 45, 85, 0.2)' : 'rgba(0, 255, 136, 0.2)'), 
            border: `1px solid ${stats.pendingCmdId ? 'var(--border)' : (isActive ? 'var(--danger)' : 'var(--success)')}`, 
            color: stats.pendingCmdId ? 'var(--text-muted)' : (isActive ? 'var(--danger)' : 'var(--success)'), 
            fontSize: '0.6rem', 
            fontWeight: 900, 
            cursor: stats.pendingCmdId ? 'wait' : 'pointer',
            opacity: isLocked ? 0.7 : 1,
            animation: stats.pendingCmdId ? 'pulse 1.5s infinite' : 'none'
          }}
        >
          {stats.pendingCmdId ? (isActive ? 'STOPPING...' : 'STARTING...') : (isLocked ? '🔒' : isActive ? 'STOP' : 'START')}
        </button>
      </div>
    </div>
  );
}
