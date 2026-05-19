import { initDb, readDb, addLog } from '../lib/db.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env.local' });

async function run() {
  try {
    console.log('Initializing DB...');
    await initDb();
    console.log('DB Initialized.');
    
    console.log('Adding a test log...');
    await addLog({ type: 'system', message: 'DB Connection test' });
    
    console.log('Reading DB...');
    const data = await readDb();
    console.log('Logs count:', data.logs.length);
    console.log('Success!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
