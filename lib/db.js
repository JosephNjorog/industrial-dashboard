import { Pool } from 'pg';

const MAX_RECORDS = 1000;
const MAX_USERS = 5;

let pool;
let isInitialized = false;
let initPromise = null;

// Default Settings
export const defaultSettings = {
  thresholds: {
    pump: { temp: 80, vibration: 5 },
    motor: { temp: 90, vibration: 8 },
    fan: { temp: 60, vibration: 3 }
  },
  maintenanceInterval: 3000
};

export function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is missing. Please configure it in your environment variables.');
  }

  if (!global.pgPool) {
    const useSsl = connectionString.includes('supabase') || connectionString.includes('pooler');
    global.pgPool = new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: 3, // Constrain connections to avoid Supabase session limits
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 5000
    });
  }
  return global.pgPool;
}

export async function initDb() {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const p = getPool();
    
    // Initialize Schema
    await p.query(`
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

      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        passcode TEXT,
        role TEXT,
        can_operate BOOLEAN
      );

      CREATE TABLE IF NOT EXISTS maintenance_logs (
        id TEXT PRIMARY KEY,
        machine TEXT,
        operator TEXT,
        action_taken TEXT,
        parts_replaced TEXT,
        timestamp BIGINT
      );
    `);

    // Initialize default settings if not exists
    const { rows: settingsRows } = await p.query(`SELECT value FROM settings WHERE id = 'app_settings'`);
    if (settingsRows.length === 0) {
      await p.query(
        `INSERT INTO settings (id, value) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        ['app_settings', JSON.stringify(defaultSettings)]
      );
    }

    // Initialize default admin user if no users exist
    const { rows: userRows } = await p.query(`SELECT COUNT(*) as count FROM users`);
    if (parseInt(userRows[0].count) === 0) {
      await p.query(
        `INSERT INTO users (username, passcode, role, can_operate) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        ['admin', '1234', 'admin', true]
      );
    }
    isInitialized = true;
  })();

  return initPromise;
}

export async function authenticateUser(username, passcode) {
  await initDb();
  const p = getPool();
  const { rows } = await p.query(`SELECT username, role, can_operate FROM users WHERE username = $1 AND passcode = $2`, [username, passcode]);
  return rows[0] || null;
}

export async function getUsers() {
  await initDb();
  const p = getPool();
  const { rows } = await p.query(`SELECT username, role, can_operate FROM users ORDER BY role ASC, username ASC`);
  return rows;
}

export async function addUser(username, passcode, role = 'operator') {
  await initDb();
  const p = getPool();

  const { rows: countRows } = await p.query(`SELECT COUNT(*) as count FROM users`);
  if (parseInt(countRows[0].count) >= MAX_USERS) {
    throw new Error('Maximum user limit (4) reached.');
  }

  const { rows: existing } = await p.query(`SELECT username FROM users WHERE username = $1`, [username]);
  if (existing.length > 0) {
    throw new Error('Username already exists.');
  }

  await p.query(
    `INSERT INTO users (username, passcode, role, can_operate) VALUES ($1, $2, $3, false)`,
    [username, passcode, role]
  );
  
  return await getUsers();
}

export async function deleteUser(username) {
  await initDb();
  const p = getPool();
  const { rows } = await p.query(`SELECT role FROM users WHERE username = $1`, [username]);
  
  if (rows.length === 0) throw new Error('User not found.');
  if (rows[0].role === 'admin') {
    // Prevent deleting the last admin
    const { rows: adminCount } = await p.query(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`);
    if (parseInt(adminCount[0].count) <= 1) {
      throw new Error('Cannot delete the last admin user.');
    }
  }

  await p.query(`DELETE FROM users WHERE username = $1`, [username]);
  return await getUsers();
}

export async function grantControl(username) {
  await initDb();
  const p = getPool();
  
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    // Revoke from everyone
    await client.query(`UPDATE users SET can_operate = false`);
    // Grant to specific user
    const { rowCount } = await client.query(`UPDATE users SET can_operate = true WHERE username = $1`, [username]);
    if (rowCount === 0) {
      throw new Error('User not found.');
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  
  return await getUsers();
}

export async function readDb() {
  await initDb();
  const p = getPool();

  // Fetch logs, ordered by newest first
  const logsRes = await p.query(`SELECT * FROM logs ORDER BY timestamp DESC LIMIT $1`, [MAX_RECORDS]);
  
  // Fetch insights
  const insightsRes = await p.query(`SELECT * FROM insights ORDER BY timestamp DESC LIMIT $1`, [MAX_RECORDS]);
  
  // Fetch settings
  const settingsRes = await p.query(`SELECT value FROM settings WHERE id = 'app_settings'`);
  const settings = settingsRes.rows.length > 0 ? JSON.parse(settingsRes.rows[0].value) : defaultSettings;

  // Fetch users
  const usersRes = await p.query(`SELECT username, role, can_operate FROM users`);

  return {
    logs: logsRes.rows.map(row => ({
      ...row,
      timestamp: Number(row.timestamp)
    })),
    insights: insightsRes.rows.map(row => ({
      ...row,
      timestamp: Number(row.timestamp)
    })),
    settings,
    users: usersRes.rows
  };
}

export async function writeDb(data) {
  await initDb();
  const p = getPool();

  if (data && data.settings) {
    await p.query(
      `UPDATE settings SET value = $1 WHERE id = 'app_settings'`,
      [JSON.stringify(data.settings)]
    );
  }
}

export async function addLog(log) {
  await initDb();
  const p = getPool();
  
  const ts = log.timestamp ? new Date(log.timestamp).getTime() : Date.now();
  const id = log.id || `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  await p.query(
    `INSERT INTO logs (id, type, message, timestamp) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
    [id, log.type || 'system', log.message || '', ts]
  );

  await p.query(
    `DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY timestamp DESC LIMIT $1)`,
    [MAX_RECORDS]
  );

  const { rows } = await p.query(`SELECT * FROM logs ORDER BY timestamp DESC LIMIT $1`, [MAX_RECORDS]);
  return rows.map(row => ({
    ...row,
    timestamp: Number(row.timestamp)
  }));
}

export async function addInsight(insight) {
  await initDb();
  const p = getPool();
  
  const ts = insight.timestamp ? new Date(insight.timestamp).getTime() : Date.now();
  const id = insight.id || `insight-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  await p.query(
    `INSERT INTO insights (id, machine, severity, message, timestamp) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
    [id, insight.machine || null, insight.severity || 'info', insight.message || '', ts]
  );

  await p.query(
    `DELETE FROM insights WHERE id NOT IN (SELECT id FROM insights ORDER BY timestamp DESC LIMIT $1)`,
    [MAX_RECORDS]
  );

  const { rows } = await p.query(`SELECT * FROM insights ORDER BY timestamp DESC LIMIT $1`, [MAX_RECORDS]);
  return rows.map(row => ({
    ...row,
    timestamp: Number(row.timestamp)
  }));
}

export async function getLock(machine) {
  await initDb();
  const p = getPool();
  const { rows } = await p.query(`SELECT * FROM locks WHERE machine = $1`, [machine]);
  const lock = rows[0];
  
  if (lock && Number(lock.expiresat) < Date.now()) {
    await p.query(`DELETE FROM locks WHERE machine = $1`, [machine]);
    return null;
  }
  
  if (lock) {
    return {
      machine: lock.machine,
      user: lock.user,
      expiresAt: Number(lock.expiresat)
    };
  }
  
  return null;
}

export async function acquireLock(machine, user, durationMs = 120000) {
  await initDb();
  const p = getPool();
  
  // Verify that the user is allowed to operate BEFORE acquiring lock
  const { rows: userRows } = await p.query(`SELECT role, can_operate FROM users WHERE username = $1`, [user]);
  if (userRows.length === 0) {
    return { success: false, lockedBy: 'System (User not found)' };
  }
  
  if (userRows[0].role !== 'admin' && !userRows[0].can_operate) {
    return { success: false, lockedBy: 'System (No Operation Privileges)' };
  }

  const currentLock = await getLock(machine);
  
  if (currentLock && currentLock.user !== user) {
    return { success: false, lockedBy: currentLock.user };
  }
  
  const expiresAt = Date.now() + durationMs;
  await p.query(
    `INSERT INTO locks (machine, "user", expiresat) VALUES ($1, $2, $3)
     ON CONFLICT (machine) DO UPDATE SET "user" = EXCLUDED."user", expiresat = EXCLUDED.expiresat`,
    [machine, user, expiresAt]
  );
  
  return { success: true, user, expiresAt };
}

export async function releaseLock(machine, user) {
  await initDb();
  const p = getPool();
  const lock = await getLock(machine);
  if (lock && lock.user === user) {
    await p.query(`DELETE FROM locks WHERE machine = $1`, [machine]);
    return true;
  }
  return false;
}

export async function getMaintenanceLogs(machine = null) {
  await initDb();
  const p = getPool();
  let query = `SELECT * FROM maintenance_logs`;
  const params = [];
  
  if (machine) {
    query += ` WHERE machine = $1`;
    params.push(machine);
  }
  
  query += ` ORDER BY timestamp DESC`;
  const { rows } = await p.query(query, params);
  return rows.map(r => ({
    ...r,
    timestamp: Number(r.timestamp)
  }));
}

export async function addMaintenanceLog(machine, operator, action_taken, parts_replaced = '') {
  await initDb();
  const p = getPool();
  const id = `maint-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const timestamp = Date.now();
  
  await p.query(
    `INSERT INTO maintenance_logs (id, machine, operator, action_taken, parts_replaced, timestamp) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, machine, operator, action_taken, parts_replaced, timestamp]
  );
  
  return await getMaintenanceLogs(machine);
}

/**
 * Restore all database defaults in a single atomic transaction:
 *  - Settings → factory defaults (thresholds + maintenance interval)
 *  - Users     → delete all, recreate admin/1234
 *  - Locks     → clear all active machine locks
 */
export async function resetDefaults() {
  await initDb();
  const p = getPool();
  const client = await p.connect();

  try {
    await client.query('BEGIN');

    // 1. Restore settings
    await client.query(
      `INSERT INTO settings (id, value) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value`,
      ['app_settings', JSON.stringify(defaultSettings)]
    );

    // 2. Wipe all users and recreate default admin
    await client.query(`DELETE FROM users`);
    await client.query(
      `INSERT INTO users (username, passcode, role, can_operate) VALUES ($1, $2, $3, $4)`,
      ['admin', '1234', 'admin', true]
    );

    // 3. Release all machine locks
    await client.query(`DELETE FROM locks`);

    await client.query('COMMIT');
    return { ok: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
