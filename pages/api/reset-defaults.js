import { resetDefaults } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await resetDefaults();
    return res.status(200).json({ message: 'Database restored to factory defaults.' });
  } catch (err) {
    console.error('[reset-defaults]', err);
    return res.status(500).json({ error: err.message || 'Failed to reset defaults' });
  }
}
