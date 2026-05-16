import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'dashboard.sqlite');
const MAX_RECORDS = 1000;

let dbInstance = null;

// Default Settings
const defaultSettings = {
  thresholds: {
    pump: { temp: 80, vibration: 5 },
    motor: { temp: 90, vibration: 8 },
    fan: { temp: 60, vibration: 3 }
  },
  maintenanceInterval: 3000
};

async function getDb() {
  if (dbInstance) return dbInstance;

  // Ensure data directory exists
  await fs.mkdir(DB_DIR, { recursive: true });

  dbInstance = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  // Initialize Schema
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      type TEXT,
      message TEXT,
      timestamp INTEGER
    );

    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      machine TEXT,
      severity TEXT,
      message TEXT,
      timestamp INTEGER
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Initialize default settings if not exists
  const row = await dbInstance.get(`SELECT value FROM settings WHERE id = 'app_settings'`);
  if (!row) {
    await dbInstance.run(
      `INSERT INTO settings (id, value) VALUES (?, ?)`,
      ['app_settings', JSON.stringify(defaultSettings)]
    );
  }

  return dbInstance;
}

export async function readDb() {
  const db = await getDb();

  // Fetch logs, ordered by newest first
  const logs = await db.all(`SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?`, [MAX_RECORDS]);
  
  // Fetch insights
  const insights = await db.all(`SELECT * FROM insights ORDER BY timestamp DESC LIMIT ?`, [MAX_RECORDS]);
  
  // Fetch settings
  const settingsRow = await db.get(`SELECT value FROM settings WHERE id = 'app_settings'`);
  const settings = settingsRow ? JSON.parse(settingsRow.value) : defaultSettings;

  // Return the exact data structure the frontend expects
  return {
    logs,
    insights,
    settings
  };
}

export async function writeDb(data) {
  const db = await getDb();

  if (data && data.settings) {
    await db.run(
      `UPDATE settings SET value = ? WHERE id = 'app_settings'`,
      [JSON.stringify(data.settings)]
    );
  }
}

export async function addLog(log) {
  const db = await getDb();
  
  // Ensure timestamp is integer
  const ts = log.timestamp ? new Date(log.timestamp).getTime() : Date.now();
  const id = log.id || `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  await db.run(
    `INSERT OR IGNORE INTO logs (id, type, message, timestamp) VALUES (?, ?, ?, ?)`,
    [id, log.type || 'system', log.message || '', ts]
  );

  // Auto-prune old records
  await db.run(
    `DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY timestamp DESC LIMIT ?)`,
    [MAX_RECORDS]
  );

  return await db.all(`SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?`, [MAX_RECORDS]);
}

export async function addInsight(insight) {
  const db = await getDb();
  
  const ts = insight.timestamp ? new Date(insight.timestamp).getTime() : Date.now();
  const id = insight.id || `insight-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  await db.run(
    `INSERT OR IGNORE INTO insights (id, machine, severity, message, timestamp) VALUES (?, ?, ?, ?, ?)`,
    [id, insight.machine || null, insight.severity || 'info', insight.message || '', ts]
  );

  // Auto-prune
  await db.run(
    `DELETE FROM insights WHERE id NOT IN (SELECT id FROM insights ORDER BY timestamp DESC LIMIT ?)`,
    [MAX_RECORDS]
  );

  return await db.all(`SELECT * FROM insights ORDER BY timestamp DESC LIMIT ?`, [MAX_RECORDS]);
}
