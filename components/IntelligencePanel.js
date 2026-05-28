import React, { useState, useEffect } from 'react';
import { calculateCostPerHour, calculateMaintenanceROI } from '../utils/helpers';
import MachineIcon from './MachineIcon';

const MACHINE_TITLES = { pump: 'Pump', motor: 'Motor', fan: 'Fan' };

function formatKES(v) {
  if (v >= 1000000) return `KES ${(v / 1000000).toFixed(2)}M`;
  if (v >= 1000)    return `KES ${(v / 1000).toFixed(1)}K`;
  return `KES ${v.toFixed(0)}`;
}

export default function IntelligencePanel({ machineStats }) {
  const [shiftReport, setShiftReport] = useState(null);
  const [loadingShift, setLoadingShift] = useState(true);

  useEffect(() => {
    const fetchShift = async () => {
      setLoadingShift(true);
      try {
        const res = await fetch('/api/shift-report');
        if (res.ok) setShiftReport(await res.json());
      } catch {}
      setLoadingShift(false);
    };
    fetchShift();
    // Refresh every 5 minutes
    const timer = setInterval(fetchShift, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Cost per machine
  const machineCosts = Object.entries(machineStats).map(([machine, stats]) => ({
    machine,
    costPerHour: calculateCostPerHour(stats.power || 0),
    powerW: stats.power || 0,
  }));
  const totalCostPerHour = machineCosts.reduce((s, m) => s + m.costPerHour, 0);
  const dailyCost = totalCostPerHour * 24;
  const weeklyCost = dailyCost * 7;

  // Maintenance ROI (using defaults)
  const roi = calculateMaintenanceROI(5000, 8, 15000);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Shift Performance Report ── */}
      <div style={{ background: 'var(--badge-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--accent)', textTransform: 'uppercase' }}>
            📋 Current Shift Performance (Last 8 Hours)
          </h3>
          {shiftReport && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {new Date(shiftReport.shiftStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} →{' '}
              {new Date(shiftReport.shiftEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {loadingShift ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px', textAlign: 'center' }}>
            Loading shift data...
          </div>
        ) : shiftReport ? (
          <>
            {/* Summary KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '12px', marginBottom: '16px' }}>
              {[
                { label: 'Total Events', value: shiftReport.totalEvents, color: 'var(--accent)' },
                { label: 'Alarms Fired', value: shiftReport.totalAlarms, color: shiftReport.totalAlarms > 0 ? 'var(--danger)' : 'var(--success)' },
                { label: 'Maintenance Actions', value: shiftReport.totalMaintenance, color: 'var(--warning)' },
                { label: 'Active Operators', value: shiftReport.operators.length || '—', color: 'var(--foreground)' },
              ].map(kpi => (
                <div key={kpi.label} style={{
                  background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '10px',
                  border: '1px solid var(--border)', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase' }}>{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Per-machine breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '10px' }}>
              {shiftReport.machineActivity?.map(m => (
                <div key={m.machine} style={{
                  background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '10px',
                  border: `1px solid ${m.alarmCount > 0 ? 'var(--danger)' : 'var(--border)'}`,
                  display: 'flex', flexDirection: 'column', gap: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MachineIcon type={m.machine} size={16} color="var(--accent)" />
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>{MACHINE_TITLES[m.machine]}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>{m.eventCount} events</span>
                    <span style={{ color: m.alarmCount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {m.alarmCount} alarm{m.alarmCount !== 1 ? 's' : ''}
                    </span>
                    <span style={{ color: m.maintenanceCount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {m.maintenanceCount} maintenance
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent alarms */}
            {shiftReport.recentAlarms?.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Recent Alarms This Shift:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {shiftReport.recentAlarms.map((a, i) => (
                    <div key={i} style={{
                      fontSize: '0.75rem', padding: '6px 10px', background: 'rgba(255,0,85,0.07)',
                      borderRadius: '6px', border: '1px solid rgba(255,0,85,0.15)',
                      display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap'
                    }}>
                      <span style={{ color: 'var(--foreground)' }}>{a.message}</span>
                      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                        {new Date(a.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No shift data available.</div>
        )}
      </div>

      {/* ── Cost Per Hour Tracker ── */}
      <div style={{ background: 'var(--badge-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: 'var(--accent)', textTransform: 'uppercase' }}>
          💰 Real-Time Energy Cost Tracker (1 kWh = KES 30)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '12px', marginBottom: '16px' }}>
          {machineCosts.map(({ machine, costPerHour, powerW }) => (
            <div key={machine} style={{
              background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px',
              border: '1px solid var(--border)', textAlign: 'center'
            }}>
              <MachineIcon type={machine} size={20} color="var(--accent)" />
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '6px 0 2px', textTransform: 'uppercase' }}>
                {MACHINE_TITLES[machine]}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--warning)', lineHeight: 1 }}>
                {formatKES(costPerHour)}/hr
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {powerW.toFixed(0)} W draw
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '10px' }}>
          {[
            { label: 'Per Hour (All)', value: formatKES(totalCostPerHour), color: 'var(--warning)' },
            { label: 'Daily Projection', value: formatKES(dailyCost), color: 'var(--danger)' },
            { label: 'Weekly Projection', value: formatKES(weeklyCost), color: 'var(--danger)' },
          ].map(item => (
            <div key={item.label} style={{
              background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '10px',
              border: '1px solid var(--border)', textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Maintenance ROI Calculator ── */}
      <div style={{ background: 'var(--badge-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: 'var(--accent)', textTransform: 'uppercase' }}>
          📈 Maintenance ROI Calculator
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Estimated value of proactive maintenance vs. unplanned failure cost.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '12px' }}>
          {[
            { label: 'Maintenance Cost', value: formatKES(roi.maintCost), color: 'var(--danger)', icon: '🔧' },
            { label: 'Production Loss Avoided', value: formatKES(roi.valueSaved), color: 'var(--success)', icon: '🏭' },
            { label: 'Net Benefit', value: formatKES(roi.netBenefit), color: 'var(--success)', icon: '✅' },
            { label: 'ROI', value: `${roi.roi}%`, color: roi.roi > 0 ? 'var(--success)' : 'var(--danger)', icon: '📊' },
          ].map(item => (
            <div key={item.label} style={{
              background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px',
              border: '1px solid var(--border)', textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{item.icon}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase' }}>{item.label}</div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '12px', padding: '10px 14px', background: 'rgba(0,255,136,0.06)',
          borderRadius: '8px', border: '1px solid rgba(0,255,136,0.2)', fontSize: '0.75rem', color: 'var(--text-muted)'
        }}>
          Assumes: KES 5,000 maintenance cost · 8 hrs downtime avoided · KES 15,000/hr production rate.
          Adjust these in Admin Settings for your actual figures.
        </div>
      </div>

    </div>
  );
}
