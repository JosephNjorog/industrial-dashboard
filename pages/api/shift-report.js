import { getPool, initDb } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await initDb();
  const p = getPool();

  // Shift window = last 8 hours
  const now = Date.now();
  const shiftStart = now - 8 * 60 * 60 * 1000;

  try {
    // All logs in the last 8h
    const { rows: logs } = await p.query(
      `SELECT * FROM logs WHERE timestamp >= $1 ORDER BY timestamp ASC`,
      [shiftStart]
    );

    // All maintenance actions in the last 8h
    const { rows: maintLogs } = await p.query(
      `SELECT * FROM maintenance_logs WHERE timestamp >= $1 ORDER BY timestamp ASC`,
      [shiftStart]
    );

    // Alarm counts by severity keywords
    const alarmLogs = logs.filter(l =>
      /critical|alarm|fault|emergency|warning/i.test(l.message)
    );

    // Unique operators who logged maintenance
    const operators = [...new Set(maintLogs.map(m => m.operator))];

    // Machines that had activity
    const machines = ['pump', 'motor', 'fan'];
    const machineActivity = machines.map(machine => {
      const machineLogs = logs.filter(l => l.message?.toLowerCase().includes(machine));
      const machineAlarms = alarmLogs.filter(l => l.message?.toLowerCase().includes(machine));
      const machineMaint = maintLogs.filter(m => m.machine === machine);
      return {
        machine,
        eventCount: machineLogs.length,
        alarmCount: machineAlarms.length,
        maintenanceCount: machineMaint.length,
      };
    });

    // Shift metadata
    const shiftStartISO = new Date(shiftStart).toISOString();
    const shiftEndISO = new Date(now).toISOString();

    return res.status(200).json({
      shiftStart: shiftStartISO,
      shiftEnd: shiftEndISO,
      totalEvents: logs.length,
      totalAlarms: alarmLogs.length,
      totalMaintenance: maintLogs.length,
      operators,
      machineActivity,
      recentAlarms: alarmLogs.slice(-5).reverse(),
    });
  } catch (err) {
    console.error('[shift-report]', err);
    return res.status(500).json({ error: err.message });
  }
}
