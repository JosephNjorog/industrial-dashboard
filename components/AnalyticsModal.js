import React from 'react';
import Chart from './Chart';
import MachineIcon from './MachineIcon';

const AnalyticsModal = ({ isOpen, onClose, machine, title, history, logs = [] }) => {
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
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <MachineIcon type={machine} size={32} color="var(--accent)" />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>{title} Analytics</h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Historical Performance Data</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: '#fff',
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
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
          
          {/* Command Audit Trail */}
          <div style={{ 
            gridColumn: '1 / -1', 
            background: 'rgba(255,255,255,0.02)', 
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
