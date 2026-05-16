import mqtt from 'mqtt';

// ================= HIVE MQTT CLOUD =================
const MQTT_URL =
  'wss://0ee0abac33d941ffb2f36010af47ec16.s1.eu.hivemq.cloud:8884/mqtt';

const MQTT_OPTIONS = {
  username: 'machineguard',
  password: 'Kenrah@24',

  clean: true,
  connectTimeout: 10000,
  reconnectPeriod: 3000,
  keepalive: 60,

  clientId: `scada-web-${Math.random().toString(16).slice(2, 10)}`,
};

// ================= TOPICS =================
export const TOPICS = {
  TELEMETRY: 'factory/+/data',
  INSIGHTS: 'factory/insights',
  GLOBAL_INSIGHTS: 'factory/insights/global',
  CONTROL: 'factory/+/control',
  RESET: 'factory/+/reset',
  STATUS: 'factory/status',
  HEARTBEAT: 'factory/system/heartbeat',
  ALERTS: 'factory/alerts',
  MAINTENANCE: 'factory/maintenance',
  ACK: 'factory/ack',
  SYSTEM_LOGS: 'factory/system/logs',
};

// ================= CLIENT =================
let client = null;
let isConnecting = false;

// ================= INIT =================
export const initMqtt = () => {
  if (client && client.connected) return client;
  if (isConnecting) return client;

  isConnecting = true;

  client = mqtt.connect(MQTT_URL, MQTT_OPTIONS);

  // ───────────────── CONNECT ─────────────────
  client.on('connect', () => {
    console.log('✅ MQTT Connected to HiveMQ Cloud');

    isConnecting = false;

    client.subscribe(TOPICS.TELEMETRY, { qos: 1 });
    client.subscribe(TOPICS.INSIGHTS, { qos: 1 });
    client.subscribe(TOPICS.GLOBAL_INSIGHTS, { qos: 1 });
    client.subscribe(TOPICS.STATUS, { qos: 1 });
    client.subscribe(TOPICS.HEARTBEAT, { qos: 1 });
    client.subscribe(TOPICS.ALERTS, { qos: 1 });
    client.subscribe(TOPICS.MAINTENANCE, { qos: 1 });
    client.subscribe(TOPICS.ACK, { qos: 1 });
    client.subscribe(TOPICS.SYSTEM_LOGS, { qos: 1 });

    console.log('📡 Subscribed to topics');
  });

  // ───────────────── MESSAGE HANDLER ─────────────────
  client.on('message', (topic, message) => {
    const rawMessage = message.toString();
    let payload;

    try {
      payload = JSON.parse(rawMessage);
    } catch {
      // If not JSON, use as raw string (e.g. "ONLINE")
      payload = rawMessage;
    }

    window.dispatchEvent(
      new CustomEvent('mqtt-message', {
        detail: {
          topic,
          payload,
        },
      })
    );
  });

  // ───────────────── CONNECTION EVENTS ─────────────────
  client.on('error', (err) => {
    console.error('❌ MQTT error:', err.message);
  });

  client.on('reconnect', () => {
    console.log('🔄 MQTT reconnecting...');
  });

  client.on('offline', () => {
    console.log('⚠️ MQTT offline');
  });

  client.on('close', () => {
    console.log('🔌 MQTT connection closed');
  });

  return client;
};

// ================= CONTROL PUBLISH =================
export const publishControl = (machine, state) => {
  if (!client?.connected) {
    console.warn('MQTT not connected');
    return;
  }

  const topic = `factory/${machine}/control`;
  const cmdId = `cmd-${Date.now()}`;

  const payload = JSON.stringify({
    cmd: state === 'ON' ? 'ON' : 'OFF',
    id: cmdId,
    machine: machine
  });

  client.publish(
    topic,
    payload,
    { qos: 1 },
    (err) => {
      if (err) console.error('Publish error:', err);
      else console.log(`📤 ${topic} → ${payload}`);
    }
  );

  return cmdId; // Return ID so UI can track ACK
};

// ================= RESET COMMAND =================
export const publishReset = (machine) => {
  if (!client?.connected) return;

  const topic = `factory/${machine}/reset`;

  client.publish(topic, 'RESET', { qos: 1 }, (err) => {
    if (err) console.error('Reset publish failed:', err);
    else console.log(`🔄 Reset sent → ${machine}`);
  });
};

// ================= STATUS =================
export const getMqttStatus = () => ({
  connected: client?.connected || false,
});
