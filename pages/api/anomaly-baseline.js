import { getPool, initDb } from '../../lib/db';

const BASELINE_KEY = 'anomaly_baselines';

export default async function handler(req, res) {
  await initDb();
  const p = getPool();

  // GET — return stored baselines for all machines
  if (req.method === 'GET') {
    try {
      const { rows } = await p.query(
        `SELECT value FROM settings WHERE id = $1`,
        [BASELINE_KEY]
      );
      const baselines = rows.length > 0 ? JSON.parse(rows[0].value) : {};
      return res.status(200).json(baselines);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — upsert baselines object { pump: {...}, motor: {...}, fan: {...} }
  if (req.method === 'POST') {
    try {
      const incoming = req.body;
      if (!incoming || typeof incoming !== 'object') {
        return res.status(400).json({ error: 'Invalid baseline payload' });
      }

      // Merge with existing so we don't overwrite other machines
      const { rows } = await p.query(
        `SELECT value FROM settings WHERE id = $1`,
        [BASELINE_KEY]
      );
      const existing = rows.length > 0 ? JSON.parse(rows[0].value) : {};
      const merged = { ...existing, ...incoming };

      await p.query(
        `INSERT INTO settings (id, value) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value`,
        [BASELINE_KEY, JSON.stringify(merged)]
      );

      return res.status(200).json(merged);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
