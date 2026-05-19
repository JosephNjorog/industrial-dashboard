import pg from 'pg';

const { Pool } = pg;

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        type TEXT,
        message TEXT,
        timestamp BIGINT
      );

      CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY,
        machine TEXT,
        severity TEXT,
        message TEXT,
        timestamp BIGINT
      );

      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS locks (
        machine TEXT PRIMARY KEY,
        "user" TEXT,
        expiresat BIGINT
      );
    `);
    console.log('Tables created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create tables:', err.message);
    process.exit(1);
  }
}

run();
