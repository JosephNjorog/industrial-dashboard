import { readDb, writeDb } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const db = await readDb();
    return res.status(200).json(db.settings || {});
  }

  if (req.method === 'POST') {
    try {
      const settings = req.body;
      const db = await readDb();
      db.settings = { ...db.settings, ...settings };
      await writeDb(db);
      return res.status(200).json(db.settings);
    } catch {
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
