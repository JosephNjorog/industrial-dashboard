import React, { useMemo } from 'react';

/**
 * Pearson correlation between two arrays of numbers
 */
function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const a = xs.slice(-n), b = ys.slice(-n);
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, denA = 0, denB = 0;
  for (let i = 0; i < n; i++) {
    num  += (a[i] - meanA) * (b[i] - meanB);
    denA += (a[i] - meanA) ** 2;
    denB += (b[i] - meanB) ** 2;
  }
  if (denA === 0 || denB === 0) return 0;
  return Number((num / Math.sqrt(denA * denB)).toFixed(2));
}

function corrColor(r) {
  const abs = Math.abs(r);
  if (abs >= 0.75) return r > 0 ? '#ff4060' : '#4060ff';
  if (abs >= 0.5)  return r > 0 ? '#ff8c42' : '#42a5f5';
  if (abs >= 0.25) return r > 0 ? '#ffd700' : '#81d4fa';
  return '#3ddc84';
}

const MACHINES = ['pump', 'motor', 'fan'];
const METRICS  = ['temp', 'vibration', 'current'];
const LABELS   = { temp: 'Temp', vibration: 'Vibration', current: 'Current' };

// Build NxN correlation matrix for pairs: machine×metric vs machine×metric
const pairs = [];
MACHINES.forEach(m => METRICS.forEach(k => pairs.push({ m, k, label: `${m[0].toUpperCase()}.${LABELS[k]}` })));

export default function CorrelationHeatmap({ machineHistory }) {
  // Build flat time-series per machine per metric
  const series = useMemo(() => {
    const out = {};
    MACHINES.forEach(m => {
      out[m] = {};
      METRICS.forEach(k => {
        out[m][k] = (machineHistory[m] || [])
          .map(h => (h[k] == null ? 0 : h[k]))
          .filter((_, i, arr) => i < arr.length); // all points
      });
    });
    return out;
  }, [machineHistory]);

  const matrix = useMemo(() => {
    return pairs.map(a => pairs.map(b => {
      if (a.m === b.m && a.k === b.k) return 1;
      const xs = series[a.m]?.[a.k] || [];
      const ys = series[b.m]?.[b.k] || [];
      return pearson(xs, ys);
    }));
  }, [series]);

  const cellSize = 46;

  return (
    <div style={{ background: 'var(--badge-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--accent)', textTransform: 'uppercase' }}>
          📊 Cross-Machine Correlation Heatmap
        </h3>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.7rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ff4060', display: 'inline-block' }} /> Strong +
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#3ddc84', display: 'inline-block' }} /> No correlation
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#4060ff', display: 'inline-block' }} /> Strong −
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.65rem' }}>
          <thead>
            <tr>
              <th style={{ width: cellSize, minWidth: cellSize }} />
              {pairs.map((p, ci) => (
                <th key={ci} style={{
                  width: cellSize, minWidth: cellSize, height: cellSize,
                  color: 'var(--text-muted)', fontWeight: 700,
                  writingMode: 'vertical-rl', textOrientation: 'mixed',
                  padding: '4px 0', textAlign: 'left', verticalAlign: 'bottom'
                }}>
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, ri) => (
              <tr key={ri}>
                <td style={{
                  color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.65rem',
                  paddingRight: '8px', whiteSpace: 'nowrap', textAlign: 'right'
                }}>
                  {pairs[ri].label}
                </td>
                {row.map((r, ci) => (
                  <td key={ci} style={{
                    width: cellSize, height: cellSize, minWidth: cellSize,
                    background: ri === ci ? 'rgba(76,231,255,0.15)' : `${corrColor(r)}22`,
                    border: `1px solid ${ri === ci ? 'rgba(76,231,255,0.3)' : 'rgba(255,255,255,0.05)'}`,
                    textAlign: 'center', verticalAlign: 'middle',
                    color: corrColor(r),
                    fontWeight: 900,
                    cursor: 'default',
                    transition: 'background 0.2s',
                    title: `${pairs[ri].label} vs ${pairs[ci].label}: r=${r}`
                  }}>
                    {ri === ci ? '—' : r.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ margin: '12px 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        Values close to <strong>±1</strong> indicate strong correlation. Computed from last 20 data points per machine. Needs live data to populate.
      </p>
    </div>
  );
}
