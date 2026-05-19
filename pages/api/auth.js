import { authenticateUser } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { username, passcode } = req.body;

  if (!username || !passcode) {
    return res.status(400).json({ error: 'Username and passcode are required.' });
  }

  try {
    const user = await authenticateUser(username, passcode);
    
    if (user) {
      // Pass the user info back (do NOT send passcode)
      return res.status(200).json(user);
    } else {
      return res.status(401).json({ error: 'Invalid username or passcode.' });
    }
  } catch (error) {
    console.error('Auth Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
