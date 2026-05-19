import { acquireLock, releaseLock, getLock } from '../../lib/db';

export default async function handler(req, res) {
  const { method, query, body } = req;
  const machine = query.machine || body.machine;
  const user = body.user || query.user;

  if (!machine) {
    return res.status(400).json({ error: 'Machine parameter is required' });
  }

  try {
    switch (method) {
      case 'GET':
        const lock = await getLock(machine);
        return res.status(200).json({ locked: !!lock, lock });
        
      case 'POST':
        if (!user) {
          return res.status(400).json({ error: 'User parameter is required to acquire lock' });
        }
        const acquireResult = await acquireLock(machine, user);
        if (acquireResult.success) {
          return res.status(200).json(acquireResult);
        } else {
          return res.status(409).json({ error: 'Machine is locked', lockedBy: acquireResult.lockedBy });
        }
        
      case 'DELETE':
        if (!user) {
          return res.status(400).json({ error: 'User parameter is required to release lock' });
        }
        const released = await releaseLock(machine, user);
        return res.status(200).json({ success: released });
        
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Lock API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
