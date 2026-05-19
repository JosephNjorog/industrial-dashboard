import MachineIcon from './MachineIcon';
import { getMaintenanceProgress } from '../utils/helpers';

import Gauge from './Gauge';

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
          <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: 'var(--foreground)' }}>{title}</h3>
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
        <div style={{ height: '6px', background: 'var(--badge-bg)', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ 
            width: `${stats.health}%`, 
            height: '100%', 
            background: stats.health > 80 ? 'var(--success)' : stats.health > 50 ? 'var(--warning)' : 'var(--danger)',
            boxShadow: `0 0 10px ${stats.health > 80 ? 'var(--success)' : 'var(--danger)'}`,
            transition: 'width 1s ease'
          }} />
        </div>
      </div>

      {/* ─── INSTRUMENT CLUSTER (GAUGES) ─── */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        justifyContent: 'space-around', 
        alignItems: 'center',
        gap: '8px', 
        marginTop: '8px',
        marginBottom: '12px',
        padding: '16px 8px',
        background: 'rgba(0,0,0,0.5)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.8)'
      }}>
        <Gauge 
          value={stats.isSensorError ? 0 : Number(stats.temp.toFixed(0))} 
          min={0} max={100} 
          label="TEMP" unit="°C" 
          color={stats.isSensorError ? 'var(--danger)' : 'var(--warning)'} 
          size={75}
        />
        <Gauge 
          value={Number(stats.current.toFixed(1))} 
          min={0} max={10} 
          label="LOAD" unit="A" 
          color="var(--accent)" 
          size={75}
        />
        {machine !== 'fan' && (
          <Gauge 
            value={Number((stats.vibration_freq || 0).toFixed(0))} 
            min={0} max={1000} 
            label="FFT PEAK" unit="Hz" 
            color="#e879f9" 
            size={75}
          />
        )}
        <Gauge 
          value={Number(stats.power.toFixed(0))} 
          min={0} max={5000} 
          label="POWER" unit="W" 
          color="var(--success)" 
          size={75}
        />
        <Gauge 
          value={Number((stats.maintenance_due ?? 3000).toFixed(0))} 
          min={0} max={3000} 
          label="MAINT." unit="h" 
          color={(stats.maintenanceProgress || 0) > 90 ? 'var(--danger)' : 'var(--accent)'} 
          size={75}
        />
      </div>

      {/* ─── MINI-CARDS GRID ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '4px' }}>
        {/* Diagnostic Status */}
        <div style={{ 
          background: (stats.bearing && stats.bearing !== 'NORMAL') ? 'rgba(255, 0, 85, 0.15)' : 'var(--badge-bg)', 
          padding: '8px 4px', 
          borderRadius: '8px',
          border: `1px solid ${(stats.bearing && stats.bearing !== 'NORMAL') ? 'var(--danger)' : 'var(--border)'}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center'
        }}>
          <span style={{ fontSize: '0.45rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '2px' }}>DIAGNOSTIC</span>
          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: (stats.bearing && stats.bearing !== 'NORMAL') ? 'var(--danger)' : 'var(--success)' }}>
            {stats.bearing || 'NORMAL'}
          </span>
        </div>

        {/* Est. Failure */}
        <div style={{ 
          background: 'var(--badge-bg)', 
          padding: '8px 4px', 
          borderRadius: '8px',
          border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center'
        }}>
          <span style={{ fontSize: '0.45rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '2px' }}>EST. FAILURE</span>
          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: stats.ttfHours < 100 ? 'var(--danger)' : 'var(--success)' }}>
            {stats.ttfHours > 900 ? 'STABLE' : `IN ${stats.ttfHours.toFixed(0)}h`}
          </span>
        </div>

        {/* Total Energy */}
        <div style={{ 
          background: 'rgba(0, 255, 136, 0.05)', 
          padding: '8px 4px', 
          borderRadius: '8px',
          border: '1px solid rgba(0, 255, 136, 0.2)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center'
        }}>
          <span style={{ fontSize: '0.45rem', color: 'var(--success)', fontWeight: 800, marginBottom: '2px' }}>ENERGY</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--foreground)' }}>
            {stats.energy.toFixed(2)}<span style={{ fontSize: '0.45rem', opacity: 0.7 }}>kWh</span>
          </span>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '4px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={() => onViewDetails(machine)}
            style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--badge-bg)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.55rem', fontWeight: 700, cursor: 'pointer' }}
          >
            ANALYTICS
          </button>
        </div>
        <button 
          onClick={() => onControl(machine, isActive ? 'OFF' : 'ON')}
          style={{ 
            padding: '4px 12px', 
            borderRadius: '6px', 
            background: stats.pendingCmdId ? 'var(--badge-bg)' : (isActive ? 'rgba(255, 45, 85, 0.2)' : 'rgba(0, 255, 136, 0.2)'), 
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
