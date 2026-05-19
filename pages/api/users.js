import { getUsers, addUser, grantControl } from '../../lib/db';

export default async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        const users = await getUsers();
        return res.status(200).json(users);
        
      case 'POST':
        const { username, passcode, role } = req.body;
        if (!username || !passcode) {
          return res.status(400).json({ error: 'Username and passcode are required.' });
        }
        try {
          const updatedUsers = await addUser(username, passcode, role || 'operator');
          return res.status(201).json(updatedUsers);
        } catch (error) {
          if (error.message.includes('Maximum user limit')) {
            return res.status(403).json({ error: error.message });
          } else if (error.message.includes('Username already exists')) {
            return res.status(409).json({ error: error.message });
          }
          throw error;
        }

      case 'PUT':
        const { targetUser } = req.body;
        if (!targetUser) {
          return res.status(400).json({ error: 'Target user is required to grant control.' });
        }
        try {
          const updatedUsersList = await grantControl(targetUser);
          return res.status(200).json(updatedUsersList);
        } catch (error) {
          return res.status(404).json({ error: error.message });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Users API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
