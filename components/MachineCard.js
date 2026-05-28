import MachineIcon from './MachineIcon';
import { getMaintenanceProgress, calculateLoadFactor, calculateVelocityRMS, getISOSeverity } from '../utils/helpers';

import Gauge from './Gauge';

export default function MachineCard({ machine, title, stats, history = [], onControl, isLocked, onViewDetails, openModal, canOperate = true }) {
  const isActive = stats.state === 'ON';
  const isAlert = stats.status === 'Critical' || stats.status === 'Warning';
  
  const velocityRMS = calculateVelocityRMS(stats.vibration, 50);
  const iso = getISOSeverity(velocityRMS);
  const loadFactor = calculateLoadFactor(stats.current, machine);

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
      minHeight: '400px',
      boxShadow: 'var(--card-shadow)',
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
          <span style={{ color: stats.health > 80 ? 'var(--success)' : stats.health > 50 ? 'var(--warning)' : 'var(--danger)', fontFamily: 'var(--font-mono), monospace' }}>
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
        
        {/* Predictive Diagnostics */}
        {(() => {
          const hoursLeft = Math.max(0, stats.maintenance_due ?? 3000);
          
          let rulEstimate = `${hoursLeft.toFixed(0)}h until scheduled maintenance`;
          let rulColor = 'var(--text-muted)';
          
          if (iso.status === 'CRITICAL') {
            rulEstimate = `CRITICAL VIB: ${velocityRMS} mm/s (ISO SEVERITY)`;
            rulColor = 'var(--danger)';
          } else if (loadFactor > 110) {
            rulEstimate = `MOTOR OVERLOAD: ${loadFactor}% LOAD FACTOR`;
            rulColor = 'var(--danger)';
          } else if (stats.temp > 75) {
            rulEstimate = 'THERMAL OVERLOAD: CHECK VENTILATION';
            rulColor = 'var(--warning)';
          } else if (iso.status === 'UNSATISFACTORY') {
            rulEstimate = `VIB WARNING: ${velocityRMS} mm/s (ISO 10816)`;
            rulColor = 'var(--warning)';
          } else if (loadFactor < 15 && stats.state === 'ON') {
            rulEstimate = machine === 'pump' ? 'PUMP CAVITATION / DRY RUN' : 'NO LOAD / DRIVE BELT SLIPPAGE';
            rulColor = 'var(--warning)';
          } else if (hoursLeft < 200) {
            rulEstimate = `SERVICE DUE IN ${hoursLeft.toFixed(0)}h`;
            rulColor = 'var(--warning)';
          }
          
          return (
            <div style={{ 
              marginTop: '4px', 
              fontSize: '0.58rem', 
              fontWeight: 800, 
              color: rulColor, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.02em'
            }}>
              <span>⚡</span>
              <span style={{ animation: (rulColor === 'var(--danger)' || rulColor === 'var(--warning)') ? 'pulse 1s infinite' : 'none' }}>
                {rulEstimate}
              </span>
            </div>
          );
        })()}
      </div>

      {/* ─── INSTRUMENT CLUSTER (GAUGES) ─── */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'nowrap',
        justifyContent: 'space-between', 
        alignItems: 'center',
        gap: '4px', 
        marginTop: '8px',
        marginBottom: '12px',
        padding: '12px 6px',
        background: 'var(--instrument-bg)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--instrument-shadow)',
        overflowX: 'auto'
      }}>
        <Gauge 
          value={stats.isSensorError ? 0 : Number(stats.temp.toFixed(0))} 
          min={0} max={100} 
          label="TEMP" unit="°C" 
          color={stats.isSensorError ? 'var(--danger)' : 'var(--warning)'} 
          size={58}
        />
        <Gauge 
          value={Number(stats.current.toFixed(1))} 
          min={0} max={10} 
          label="LOAD" unit="A" 
          color="var(--accent)" 
          size={58}
        />
        {machine !== 'fan' && (
          <Gauge 
            value={Number((stats.vibration_freq || 0).toFixed(0))} 
            min={0} max={1000} 
            label="FFT PEAK" unit="Hz" 
            color="#e879f9" 
            size={58}
          />
        )}
        <Gauge 
          value={Number(stats.power.toFixed(0))} 
          min={0} max={5000} 
          label="POWER" unit="W" 
          color="var(--success)" 
          size={58}
        />
        <Gauge 
          value={Number((stats.maintenance_due ?? 3000).toFixed(0))} 
          min={0} max={3000} 
          label="MAINT." unit="h" 
          color={(stats.maintenanceProgress || 0) > 90 ? 'var(--danger)' : 'var(--accent)'} 
          size={58}
        />
      </div>

      {/* ─── MINI-CARDS GRID ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        {/* Diagnostic Status */}
        <div style={{ 
          background: iso.status === 'CRITICAL' ? 'rgba(255, 0, 85, 0.15)' : iso.status === 'UNSATISFACTORY' ? 'rgba(255, 184, 0, 0.15)' : 'var(--badge-bg)', 
          padding: '16px 8px', 
          borderRadius: '8px',
          border: `1px solid ${iso.status === 'CRITICAL' ? 'var(--danger)' : iso.status === 'UNSATISFACTORY' ? 'var(--warning)' : 'var(--border)'}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          minHeight: '80px'
        }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ISO 10816</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: iso.color, textShadow: '0 2px 4px rgba(0,0,0,0.2)', fontFamily: 'var(--font-mono), monospace' }}>
            {iso.status}
          </span>
        </div>

        {/* Est. Failure */}
        <div style={{ 
          background: 'var(--badge-bg)', 
          padding: '16px 8px', 
          borderRadius: '8px',
          border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          minHeight: '80px'
        }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EST. FAILURE</span>
          <span style={{ fontSize: '1rem', fontWeight: 900, color: stats.ttfHours < 100 ? 'var(--danger)' : 'var(--success)', textShadow: '0 2px 4px rgba(0,0,0,0.2)', fontFamily: 'var(--font-mono), monospace' }}>
            {stats.ttfHours > 900 ? 'STABLE' : `IN ${stats.ttfHours.toFixed(0)}h`}
          </span>
        </div>

        {/* Total Energy */}
        <div style={{ 
          background: 'rgba(0, 255, 136, 0.05)', 
          padding: '16px 8px', 
          borderRadius: '8px',
          border: '1px solid rgba(0, 255, 136, 0.2)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          minHeight: '80px'
        }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ENERGY</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--foreground)', textShadow: '0 2px 4px rgba(0,0,0,0.2)', fontFamily: 'var(--font-mono), monospace' }}>
            {stats.energy.toFixed(2)}<span style={{ fontSize: '0.7rem', opacity: 0.7, marginLeft: '2px', fontFamily: 'var(--font-sans), sans-serif' }}>kWh</span>
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
        {canOperate && (
          <button 
            onClick={() => onControl(machine, isActive ? 'OFF' : 'ON')}
            disabled={!!stats.pendingCmdId}
            className={`control-btn ${stats.pendingCmdId ? 'pending' : (isActive ? 'active-state' : 'inactive-state')}`}
            style={{ 
              opacity: isLocked ? 0.7 : 1,
            }}
          >
            {stats.pendingCmdId ? (isActive ? 'STOPPING...' : 'STARTING...') : (isLocked ? '🔒' : isActive ? 'STOP' : 'START')}
          </button>
        )}
      </div>
    </div>
  );
}
