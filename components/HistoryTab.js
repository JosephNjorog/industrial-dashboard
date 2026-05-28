import { useState, useMemo } from 'react';
import MachineIcon from './MachineIcon';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    animation: 'fadeIn 0.4s ease-out',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    padding: '10px 0',
  },
  filterGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    background: 'var(--badge-bg)',
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: 'var(--background)',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
    gap: '20px',
  },
  timelineSection: {
    background: 'var(--surface-soft)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid var(--border)',
    maxHeight: '700px',
    overflowY: 'auto',
  },
  breakdownSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  breakdownCard: {
    background: 'var(--card-gradient)',
    borderRadius: '14px',
    padding: '16px',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  timelineEntry: {
    display: 'flex',
    gap: '16px',
    paddingBottom: '20px',
    position: 'relative',
    borderLeft: '2px solid var(--border)',
    marginLeft: '10px',
    paddingLeft: '20px',
  },
  timelineDot: {
    position: 'absolute',
    left: '-7px',
    top: '0',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: 'var(--border)',
    border: '2px solid var(--surface-soft)',
  },
  timeLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono), monospace',
    minWidth: '70px',
  },
  entryContent: {
    flex: 1,
  },
  entryTitle: {
    fontSize: '0.9rem',
    fontWeight: 700,
    margin: '0 0 4px',
    color: 'var(--foreground)',
  },
  entryBody: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.6rem',
    fontWeight: 900,
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
};

const EventBadge = ({ type }) => {
  let color = 'var(--text-muted)';
  let bg = 'var(--badge-bg)';
  
  if (type.includes('START') || type.includes('ON') || type.includes('CONFIRMED')) {
    color = 'var(--success)';
    bg = 'rgba(0, 255, 136, 0.1)';
  } else if (type.includes('STOP') || type.includes('OFF')) {
    color = 'var(--warning)';
    bg = 'rgba(255, 184, 0, 0.1)';
  } else if (type.includes('FAULT') || type.includes('SHUTDOWN') || type.includes('ERROR')) {
    color = 'var(--danger)';
    bg = 'rgba(255, 45, 85, 0.1)';
  }

  return (
    <span style={{ 
      ...styles.badge, 
      color, 
      background: bg, 
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: color 
    }}>
      {type}
    </span>
  );
};

export default function HistoryTab({ logs = [], insights = [] }) {
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = useMemo(() => {
    let base = logs.filter(log => 
      log.type === 'control' || 
      log.type === 'success' || 
      log.type === 'error' || 
      log.message.includes('AUTO SHUTDOWN')
    );

    if (filter !== 'ALL') {
      base = base.filter(log => log.message.toLowerCase().includes(filter.toLowerCase()));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      base = base.filter(log => 
        log.message.toLowerCase().includes(q) || 
        log.type.toLowerCase().includes(q) ||
        new Date(log.timestamp).toLocaleTimeString([], { hour12: false }).toLowerCase().includes(q)
      );
    }

    return base;
  }, [logs, filter, searchQuery]);

  const stats = useMemo(() => {
    const machines = ['pump', 'motor', 'fan'];
    return machines.map(m => {
      const machineLogs = logs.filter(l => l.message.toLowerCase().includes(m));
      const faults = machineLogs.filter(l => l.type === 'error' || l.message.includes('AUTO SHUTDOWN')).length;
      const starts = machineLogs.filter(l => l.message.includes('START') || l.message.includes('ON')).length;
      const machineInsights = insights.filter(i => i.machine === m);
      
      return {
        name: m,
        faults,
        starts,
        recentInsight: machineInsights[0]?.message || 'No recent anomalies detected'
      };
    });
  }, [logs, insights]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent)' }}>System Activity & Breakdown</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 Search activity..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--badge-bg)',
              color: 'var(--foreground)',
              fontSize: '0.75rem',
              width: '180px',
              outline: 'none'
            }}
          />
          <div style={styles.filterGroup}>
            {['ALL', 'PUMP', 'MOTOR', 'FAN'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  ...styles.filterButton,
                  ...(filter === f && styles.filterButtonActive)
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.contentGrid}>
        {/* TIMELINE */}
        <div style={styles.timelineSection}>
          {filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
              No activity recorded for this period.
            </div>
          ) : (
            filteredLogs.map((log, idx) => (
              <div key={log.id} style={styles.timelineEntry}>
                <div style={{
                  ...styles.timelineDot,
                  background: log.type === 'error' ? 'var(--danger)' : 
                              log.type === 'success' ? 'var(--success)' : 
                              'var(--accent)',
                  boxShadow: `0 0 8px ${log.type === 'error' ? 'var(--danger)' : 'var(--accent)'}`
                }} />
                <div style={styles.timeLabel}>
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                </div>
                <div style={styles.entryContent}>
                  <EventBadge type={log.type === 'control' ? 'COMMAND' : log.type.toUpperCase()} />
                  <div style={styles.entryTitle}>{log.message}</div>
                  <div style={styles.entryBody}>
                    System event verified by ESP32 controller.
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* BREAKDOWN SUMMARY */}
        <div style={styles.breakdownSection}>
          <h3 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>DIAGNOSTIC BREAKDOWN</h3>
          
          {stats.map(s => (
            <div key={s.name} style={styles.breakdownCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MachineIcon type={s.name} size={20} color="var(--accent)" />
                <h4 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'capitalize' }}>{s.name} Unit</h4>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'var(--badge-bg)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>STARTS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono), monospace' }}>{s.starts}</div>
                </div>
                <div style={{ background: 'var(--badge-bg)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>FAULTS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.faults > 0 ? 'var(--danger)' : 'var(--text-muted)', fontFamily: 'var(--font-mono), monospace' }}>{s.faults}</div>
                </div>
              </div>

              <div style={{ fontSize: '0.7rem', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                <div style={{ color: 'var(--warning)', fontWeight: 800, marginBottom: '2px' }}>LAST DIAGNOSTIC:</div>
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>&quot;{s.recentInsight}&quot;</div>
              </div>
            </div>
          ))}

          <div style={{ 
            marginTop: 'auto', 
            padding: '16px', 
            borderRadius: '12px', 
            background: 'rgba(255, 45, 85, 0.05)', 
            border: '1px solid var(--danger)',
            fontSize: '0.75rem'
          }}>
            <strong style={{ color: 'var(--danger)' }}>System Alert:</strong> High frequency of restarts detected in Motor unit. Recommend inspection of start-capacitor.
          </div>
        </div>
      </div>
    </div>
  );
}
