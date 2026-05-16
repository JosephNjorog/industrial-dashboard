import { readDb, addLog } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const db = await readDb();
    return res.status(200).json(db.logs);
  }

  if (req.method === 'POST') {
    try {
      const log = req.body;
      if (!log || !log.id) {
        return res.status(400).json({ error: 'Invalid log object' });
      }
      const updatedLogs = await addLog(log);
      return res.status(201).json(updatedLogs);
    } catch {
      return res.status(500).json({ error: 'Failed to write log' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
