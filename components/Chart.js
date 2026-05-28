import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const chartStyles = {
  wrapper: {
    borderRadius: '22px',
    background: 'var(--surface-soft)',
    border: '1px solid var(--border)',
    padding: '18px',
    minHeight: '240px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(10px)',
  },
  label: {
    color: 'var(--foreground)',
    fontSize: '0.95rem',
    fontWeight: 800,
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(11, 17, 23, 0.9)',
        border: '1px solid var(--border)',
        padding: '12px',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)'
      }}>
        <p style={{ color: 'var(--text-muted)', margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 600 }}>{label}</p>
        <p style={{ color: payload[0].stroke, margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono), monospace' }}>
          {payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export default function Chart({ data = [], dataKey, label, color }) {
  const chartData = data.length ? data : [{ time: '00:00:00', [dataKey]: 0 }];
  const gradientId = `color-${dataKey}`;

  return (
    <div style={chartStyles.wrapper}>
      <div style={chartStyles.label}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
        {label}
      </div>
      <div style={{ width: '100%', height: '220px' }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'var(--font-mono), monospace' }} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'var(--font-mono), monospace' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              strokeWidth={3}
              activeDot={{ r: 6, strokeWidth: 0, fill: '#fff', boxShadow: '0 0 10px #fff' }}
              isAnimationActive={false} // Disable animation for real-time feel
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
