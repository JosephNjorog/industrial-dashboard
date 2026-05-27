import { getMaintenanceLogs, addMaintenanceLog } from '../../lib/db';

export default async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET': {
        const { machine } = req.query;
        const logs = await getMaintenanceLogs(machine || null);
        return res.status(200).json(logs);
      }

      case 'POST': {
        const { machine, operator, action_taken, parts_replaced } = req.body;
        
        if (!machine || !operator || !action_taken) {
          return res.status(400).json({ error: 'Machine, operator name, and action taken are required.' });
        }

        const updatedLogs = await addMaintenanceLog(machine, operator, action_taken, parts_replaced || '');
        return res.status(201).json(updatedLogs);
      }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Maintenance API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
