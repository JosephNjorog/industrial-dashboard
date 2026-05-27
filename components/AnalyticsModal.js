import React, { useState, useEffect } from 'react';
import Chart from './Chart';
import MachineIcon from './MachineIcon';
import { calculateLoadFactor, calculateVelocityRMS, getISOSeverity, calculateThermalRateOfRise } from '../utils/helpers';

const AnalyticsModal = ({ isOpen, onClose, machine, title, history, logs = [] }) => {
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [actionTaken, setActionTaken] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [maintError, setMaintError] = useState('');

  const fetchMaintenanceLogs = async () => {
    if (!machine) return;
    try {
      const res = await fetch(`/api/maintenance?machine=${machine}`);
      if (res.ok) {
        setMaintenanceLogs(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch maintenance logs:', err);
    }
  };

  useEffect(() => {
    if (isOpen && machine) {
      fetchMaintenanceLogs();
      setActionTaken('');
      setPartsReplaced('');
      setMaintError('');
    }
  }, [isOpen, machine]);

  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    if (!actionTaken.trim()) return;
    setIsSubmitting(true);
    setMaintError('');
    try {
      const operator = localStorage.getItem('username') || 'Operator';
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine,
          operator,
          action_taken: actionTaken.trim(),
          parts_replaced: partsReplaced.trim()
        })
      });
      if (res.ok) {
        const updatedLogs = await res.json();
        setMaintenanceLogs(updatedLogs);
        setActionTaken('');
        setPartsReplaced('');
      } else {
        const data = await res.json();
        setMaintError(data.error || 'Failed to add log');
      }
    } catch (err) {
      setMaintError('Network error');
    }
    setIsSubmitting(false);
  };

  const latestStats = history.length > 0 ? history[history.length - 1] : { temp: 0, current: 0, vibration: 0 };
  const velocityRMS = calculateVelocityRMS(latestStats.vibration, 50);
  const iso = getISOSeverity(velocityRMS);
  const loadFactor = calculateLoadFactor(latestStats.current, machine);
  const tempRateOfRise = calculateThermalRateOfRise(history);
  const crestFactor = latestStats.vibration > 0.8 ? 6.2 : latestStats.vibration > 0.5 ? 4.8 : 3.1;

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        background: 'var(--card-gradient)',
        borderRadius: '24px',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
        animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--badge-bg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <MachineIcon type={machine} size={32} color="var(--accent)" />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--foreground)' }}>{title} Analytics</h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Historical Performance Data</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'var(--badge-bg)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: 'var(--foreground)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ 
          padding: '24px', 
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: '24px'
        }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <Chart data={history} dataKey="temp" label="Temperature Trend (°C)" color="var(--danger)" />
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <Chart data={history} dataKey="energy" label="Energy Consumption (kWh)" color="var(--warning)" />
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <Chart data={history} dataKey="vibration" label="Vibration Analysis (g)" color="var(--accent)" />
          </div>
           <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <Chart data={history} dataKey="rpm" label="Motor Speed (RPM)" color="#4fc3f7" />
          </div>
          
          {/* Advanced Engineering Diagnostics Card */}
          <div style={{ 
            gridColumn: '1 / -1', 
            background: 'var(--badge-bg)', 
            padding: '20px', 
            borderRadius: '16px', 
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--accent)', margin: 0, textTransform: 'uppercase' }}>📊 Advanced Engineering Diagnostics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              
              {/* Load Factor */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>Motor Load Factor</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: loadFactor > 100 ? 'var(--danger)' : 'var(--success)' }}>
                  {loadFactor}%
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {loadFactor > 100 ? 'Overloaded' : loadFactor < 15 ? 'Dry Running / No-Load' : 'Optimal Capacity'}
                </div>
              </div>

              {/* ISO 10816 Severity */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>Vib Velocity (ISO 10816)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: iso.color }}>
                  {velocityRMS} <span style={{ fontSize: '0.9rem' }}>mm/s</span>
                </div>
                <span style={{ 
                  display: 'inline-block',
                  marginTop: '4px',
                  padding: '2px 8px', 
                  borderRadius: '4px', 
                  fontSize: '0.6rem', 
                  fontWeight: 900, 
                  background: iso.color + '20', 
                  color: iso.color,
                  border: `1px solid ${iso.color}`
                }}>
                  {iso.status}
                </span>
              </div>

              {/* Crest Factor */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>Bearing Crest Factor</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: crestFactor > 5.0 ? 'var(--danger)' : 'var(--success)' }}>
                  {crestFactor.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {crestFactor > 5.0 ? 'Early Bearing Wear' : 'Healthy Ball Bearings'}
                </div>
              </div>

              {/* Thermal rate of rise */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>Thermal Rate of Rise</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: Math.abs(tempRateOfRise) > 1.5 ? 'var(--warning)' : 'var(--success)' }}>
                  {tempRateOfRise > 0 ? `+${tempRateOfRise}` : tempRateOfRise} <span style={{ fontSize: '0.9rem' }}>°C/m</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {Math.abs(tempRateOfRise) > 1.5 ? 'Rapid Heat Delta' : 'Thermally Stable'}
                </div>
              </div>

            </div>
          </div>

          {/* Command Audit Trail */}
          <div style={{ 
            gridColumn: '1 / -1', 
            background: 'var(--badge-bg)', 
            padding: '20px', 
            borderRadius: '16px', 
            border: '1px solid var(--border)' 
          }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--accent)', marginBottom: '12px', textTransform: 'uppercase' }}>Recent Command History</h3>
            {logs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No recent control commands recorded for this machine.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {logs.slice(0, 5).map((log, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--accent)' }}>{log.message}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collaborative Maintenance Log */}
          <div style={{ 
            gridColumn: '1 / -1', 
            background: 'var(--badge-bg)', 
            padding: '20px', 
            borderRadius: '16px', 
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--accent)', margin: 0, textTransform: 'uppercase' }}>🔧 Maintenance Service Records</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>{maintenanceLogs.length} LOGS</span>
            </div>

            {/* Add Log Form */}
            <form onSubmit={handleAddMaintenance} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--foreground)' }}>RECORD NEW MAINTENANCE SERVICE</div>
              {maintError && <div style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{maintError}</div>}
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  placeholder="Action taken (e.g. Lubricated bearings, cleared fault)" 
                  value={actionTaken} 
                  onChange={(e) => setActionTaken(e.target.value)}
                  style={{ 
                    flex: 2, 
                    padding: '10px 14px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)', 
                    background: 'var(--surface-soft)', 
                    color: 'var(--foreground)',
                    fontSize: '0.85rem',
                    minWidth: '200px'
                  }}
                  required
                />
                <input 
                  type="text" 
                  placeholder="Parts replaced (optional)" 
                  value={partsReplaced} 
                  onChange={(e) => setPartsReplaced(e.target.value)}
                  style={{ 
                    flex: 1, 
                    padding: '10px 14px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)', 
                    background: 'var(--surface-soft)', 
                    color: 'var(--foreground)',
                    fontSize: '0.85rem',
                    minWidth: '150px'
                  }}
                />
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: isSubmitting ? 'var(--text-muted)' : 'var(--accent)',
                    color: '#000',
                    border: 'none',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'wait' : 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {isSubmitting ? 'SAVING...' : 'SAVE RECORD'}
                </button>
              </div>
            </form>

            {/* List past logs */}
            {maintenanceLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>No maintenance logs recorded for this unit yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                {maintenanceLogs.map((log) => (
                  <div key={log.id} style={{ 
                    background: 'rgba(0,0,0,0.15)', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                      <span style={{ color: 'var(--accent)' }}>BY: {log.operator.toUpperCase()}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--foreground)', fontWeight: 500 }}>
                      {log.action_taken}
                    </div>
                    {log.parts_replaced && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>
                        <strong>Replaced:</strong> {log.parts_replaced}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: '12px',
              background: 'var(--accent)',
              color: '#000',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            CLOSE ANALYTICS
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsModal;
