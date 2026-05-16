import { readDb, addInsight } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const db = await readDb();
    return res.status(200).json(db.insights);
  }

  if (req.method === 'POST') {
    try {
      const insight = req.body;
      if (!insight || !insight.id) {
        return res.status(400).json({ error: 'Invalid insight object' });
      }
      const updatedInsights = await addInsight(insight);
      return res.status(201).json(updatedInsights);
    } catch {
      return res.status(500).json({ error: 'Failed to write insight' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
