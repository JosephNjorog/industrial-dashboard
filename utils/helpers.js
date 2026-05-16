export const machineNames = ['pump', 'motor', 'fan'];
export const MAINTENANCE_INTERVAL = 3000; // hours

export const buildInitialMachineState = () => ({
  temp: 0,
  current: 0,
  vibration: 0,
  power: 0,
  energy: 0,
  rpm: 0,
  runtime: 0,
  status: 'Healthy',
  state: 'OFF',
  lastUpdate: null,
  lastCommand: null,
  tempTrend: 'stable',
  currTrend: 'stable',
  vibTrend: 'stable',
  maintenanceDue: false,
  emergencyShutdown: false,
  // Initial Risk Factors
  bearingRisk: 0,
  overheatRisk: 0,
  overloadRisk: 0,
  misalignRisk: 0,
  // 🔥 New Prediction Engine Metrics
  health: 100,
  failureProb: 0,
  ttfHours: 999,
  maintenance_due: 3000,
  maintenanceProgress: 0,
});

export const getMachineFromTopic = (topic) => {
  const parts = topic.split('/');
  if (parts.length !== 3) return null;
  const [root, machine, suffix] = parts;
  if (root !== 'factory' || suffix !== 'data') return null;
  return machine;
};

export const normalizeMachineData = (payload) => {
  const safePayload = typeof payload === 'string' ? JSON.parse(payload) : payload;

  const rawVibration = safePayload.vibration;
  const vibration = rawVibration === null || rawVibration === undefined || rawVibration === 'null'
    ? null
    : Number(rawVibration);


  const temp = Number(safePayload.temp ?? 0);
  const isSensorError = temp === -127;
  const maintenanceDueRemaining = safePayload.maintenance_due !== undefined ? Number(safePayload.maintenance_due) : null;
  const machineName = safePayload.machine;

  const rawState = safePayload.state; // RUNNING, OFF, FAULT
  const state = rawState === 'RUNNING' ? 'ON' : 'OFF';

  return {
    temp: isSensorError ? 0 : temp,
    isSensorError,
    current: Number(safePayload.current ?? 0),
    power: Number(safePayload.power ?? (Number(safePayload.current ?? 0) * 230)),
    energy: Number(safePayload.energy ?? 0),
    rpm: Number(safePayload.rpm ?? 0),
    vibration,
    vibration_freq: vibration,
    vibTrendValue: Number(safePayload.trend ?? 0),
    bearing: safePayload.fault || 'NORMAL',
    hasVibration: machineName !== 'fan',
    runtime: Number(safePayload.runtime ?? 0),
    maintenance_due: maintenanceDueRemaining,
    maintenanceProgress: maintenanceDueRemaining !== null 
      ? ((MAINTENANCE_INTERVAL - maintenanceDueRemaining) / MAINTENANCE_INTERVAL) * 100 
      : null,
    status: rawState === 'FAULT' 
      ? 'Critical' 
      : (safePayload.fault && safePayload.fault !== 'NORMAL') ? 'Warning' : 'Healthy',
    state, 
    rawState, // For precise label rendering in UI
    // 🔥 New Predictive Metrics from Prediction Engine
    health: Number(safePayload.health ?? 100),
    failureProb: Number(safePayload.failure ?? safePayload.failureProb ?? 0),
    ttfHours: Number(safePayload.ttf ?? safePayload.ttfHours ?? 999),

    // Calculate risks matching the ESP32 logic if not explicitly provided
    bearingRisk: Number(safePayload.bearingRisk ?? (vibration !== null ? Math.min(Math.max((vibration - 0.7) * 40, 0), 30) : 0)),
    overheatRisk: Number(safePayload.overheatRisk ?? Math.min(Math.max((temp - 45) * 4, 0), 40)),
    overloadRisk: Number(safePayload.overloadRisk ?? Math.min(Math.max((Number(safePayload.current ?? 0) - 2) * 10, 0), 40)),
    misalignRisk: Number(safePayload.misalignRisk ?? (vibration !== null ? Math.min(Math.max((vibration - 0.5) * 50, 0), 40) : 0)),
  };
};

export const formatMetric = (value, unit) => {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value !== 'number' || Number.isNaN(value)) return `0 ${unit}`;
  return `${value.toFixed(1)} ${unit}`;
};

export const getMaintenanceProgress = (runtime) => {
  const progress = (runtime % MAINTENANCE_INTERVAL) / MAINTENANCE_INTERVAL;
  return Math.min(Math.max(progress * 100, 0), 100);
};

// --- Heuristic Diagnostic Engine ---
export const runDiagnostics = (machine, stats, history, thresholds) => {
  if (history.length < 1) return null; // Need at least one previous point

  const current = stats;
  const previous = history[history.length - 1];
  
  // Calculate averages based on available history (max 5)
  const windowSize = Math.min(history.length, 5);
  const historyWindow = history.slice(-windowSize);
  
  const avgVib = historyWindow.reduce((sum, p) => sum + (p.vibration || 0), 0) / windowSize;
  const avgTemp = historyWindow.reduce((sum, p) => sum + (p.temp || 0), 0) / windowSize;
  
  const limit = thresholds?.[machine] || { temp: 80, vibration: 5 };

  // 1. Bearing/Mechanical Wear Check
  if (current.vibration > avgVib * 1.5 && current.temp > avgTemp * 1.1) {
    return {
      severity: 'warning',
      message: `Abnormal vibration/temp correlation detected. Possible bearing wear or lubrication failure.`
    };
  }

  // 2. Mechanical Blockage / Overload
  if (current.current > previous.current * 1.3 && current.rpm < previous.rpm * 0.9) {
    return {
      severity: 'critical',
      message: `Current surge with RPM drop detected. High probability of mechanical blockage or conveyor overload.`
    };
  }

  // 3. No-Load / Belt Slippage
  if (current.rpm >= previous.rpm && current.power < previous.power * 0.7 && current.state === 'ON') {
    return {
      severity: 'warning',
      message: `RPM is stable but power draw dropped significantly. Possible belt slippage or pump cavitation (no-load).`
    };
  }

  // 4. Cooling System Failure
  if (current.temp > avgTemp * 1.2 && current.power <= previous.power) {
    return {
      severity: 'warning',
      message: `Temperature rising despite steady load. Inspect cooling fans or ventilation for obstruction.`
    };
  }

  // 5. Threshold Breaches
  if (current.temp > limit.temp) {
    return {
      severity: 'critical',
      message: `Critical temperature threshold (${limit.temp}°C) breached. Immediate inspection required.`
    };
  }

  if (current.vibration > limit.vibration) {
    return {
      severity: 'critical',
      message: `Excessive vibration detected (${current.vibration.toFixed(2)}g). Check structural stability.`
    };
  }

  return null;
};