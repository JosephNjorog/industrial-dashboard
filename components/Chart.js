import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

const chartStyles = {
  wrapper: {
    borderRadius: '22px',
    background: '#0e1420',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    padding: '18px',
    minHeight: '240px',
  },
  label: {
    color: '#dfe6ef',
    fontSize: '0.95rem',
    fontWeight: 700,
    marginBottom: '10px',
  },
};

export default function Chart({ data = [], dataKey, label, color }) {
  const chartData = data.length ? data : [{ time: '00:00:00', [dataKey]: 0 }];

  return (
    <div style={chartStyles.wrapper}>
      <div style={chartStyles.label}>{label}</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1d293b" strokeDasharray="4 4" />
          <XAxis dataKey="time" stroke="#8f9bb3" tick={{ fontSize: 11 }} />
          <YAxis stroke="#8f9bb3" tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            contentStyle={{
              background: '#111825',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#f8fbff',
            }}
            labelStyle={{ color: '#cbd5e1' }}
          />
          <Legend wrapperStyle={{ color: '#f5f7fb', fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
