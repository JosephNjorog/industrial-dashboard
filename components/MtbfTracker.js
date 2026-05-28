import React, { useEffect, useState } from 'react';
import { calculateMTBF } from '../utils/helpers';
import MachineIcon from './MachineIcon';

const MACHINES = ['pump', 'motor', 'fan'];
const MACHINE_TITLES = { pump: 'Pump', motor: 'Motor', fan: 'Fan' };

export default function MtbfTracker() {
  const [mtbfData, setMtbfData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const results = {};
      await Promise.all(MACHINES.map(async (machine) => {
        try {
          const res = await fetch(`/api/maintenance?machine=${machine}`);
          if (res.ok) {
            const logs = await res.json();
            results[machine] = { logs, mtbf: calculateMTBF(logs) };
          } else {
            results[machine] = { logs: [], mtbf: null };
          }
        } catch {
          results[machine] = { logs: [], mtbf: null };
        }
      }));
      setMtbfData(results);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const trendIcon = (trend) => {
    if (trend === null || trend === undefined) return '—';
    if (trend > 5) return '📈'; // MTBF increasing = getting better
    if (trend < -5) return '📉'; // MTBF decreasing = getting worse
    return '➡️';
  };

  const trendColor = (trend) => {
    if (trend === null || trend === undefined) return 'var(--text-muted)';
    if (trend > 5) return 'var(--success)';
    if (trend < -5) return 'var(--danger)';
    return 'var(--warning)';
  };

  return (
    <div style={{ background: 'var(--badge-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: 'var(--accent)', textTransform: 'uppercase' }}>
        🔁 Mean Time Between Failures (MTBF)
      </h3>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
          Loading maintenance data...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px' }}>
          {MACHINES.map(machine => {
            const d = mtbfData[machine] || {};
            const mtbf = d.mtbf;
            const logCount = d.logs?.length || 0;

            return (
              <div key={machine} style={{
                background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px',
                border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MachineIcon type={machine} size={22} color="var(--accent)" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--foreground)', textTransform: 'uppercase' }}>
                    {MACHINE_TITLES[machine]}
                  </span>
                </div>

                {mtbf ? (
                  <>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent)', lineHeight: 1, fontFamily: 'var(--font-mono), monospace' }}>
                        {mtbf.mtbfHours < 24
                          ? `${mtbf.mtbfHours}h`
                          : `${(mtbf.mtbfHours / 24).toFixed(1)}d`}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        AVG TIME BETWEEN MAINTENANCE
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}><span style={{ fontFamily: 'var(--font-mono), monospace', fontWeight: 'bold' }}>{logCount}</span> service events</span>
                      <span style={{ color: trendColor(mtbf.trend), fontWeight: 700, fontFamily: 'var(--font-mono), monospace' }}>
                        {trendIcon(mtbf.trend)} {Math.abs(mtbf.trend)}%
                      </span>
                    </div>

                    <div style={{
                      fontSize: '0.7rem', padding: '6px 10px', borderRadius: '6px',
                      background: mtbf.trend > 5 ? 'rgba(0,255,136,0.08)' : mtbf.trend < -5 ? 'rgba(255,0,85,0.08)' : 'rgba(255,200,0,0.08)',
                      color: trendColor(mtbf.trend), fontWeight: 600
                    }}>
                      {mtbf.trend > 5 ? '✓ Reliability improving — maintenance intervals lengthening' :
                       mtbf.trend < -5 ? '⚠ Reliability degrading — failures becoming more frequent' :
                       '→ Maintenance frequency is stable'}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>—</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {logCount < 2 ? `Need ≥2 service records (have ${logCount})` : 'No data'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
