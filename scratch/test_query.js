/* eslint-disable */
const { Pool } = require('pg');
const fs = require('fs');

async function test() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const dbUrlLine = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='));
  const databaseUrl = dbUrlLine.split('=')[1].replace(/"/g, '').trim();

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const res = await pool.query('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 10');
    console.log('Latest Logs:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

test();
