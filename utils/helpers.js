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

// ─── ADVANCED MATH & ENGINEERING FORMULAS ───

export const calculateLoadFactor = (current, machine) => {
  // 240V 0.5HP AC Motor ratings
  const ratedCurrent = machine === 'fan' ? 0.8 : 2.2; 
  if (!current) return 0;
  return Number(((current / ratedCurrent) * 100).toFixed(1));
};

export const calculateVelocityRMS = (accelerationG, frequencyHz = 50) => {
  if (!accelerationG || !frequencyHz) return 0;
  // Convert acceleration RMS (g) to velocity RMS (mm/s) at frequency f:
  // v_rms = (a_rms * 9.81 * 1000) / (2 * Math.PI * f)
  const velocityRMS = (accelerationG * 9.81 * 1000) / (2 * Math.PI * frequencyHz);
  return Number(velocityRMS.toFixed(2));
};

export const getISOSeverity = (velocityRMS) => {
  if (velocityRMS <= 1.12) return { status: 'GOOD', color: 'var(--success)' };
  if (velocityRMS <= 2.80) return { status: 'SATISFACTORY', color: 'var(--success)' };
  if (velocityRMS <= 7.10) return { status: 'UNSATISFACTORY', color: 'var(--warning)' };
  return { status: 'CRITICAL', color: 'var(--danger)' };
};

export const calculateThermalRateOfRise = (tempHistory) => {
  if (!tempHistory || tempHistory.length < 2) return 0;
  // Look at last 5 ticks (assuming 2 seconds interval per tick)
  const slice = tempHistory.slice(-5);
  const tFirst = slice[0].temp;
  const tLast = slice[slice.length - 1].temp;
  const timeDeltaMinutes = ((slice.length - 1) * 2) / 60; // 2 seconds per tick
  if (timeDeltaMinutes === 0) return 0;
  const rate = (tLast - tFirst) / timeDeltaMinutes;
  return Number(rate.toFixed(2)); // °C / minute
};

// ─── INTELLIGENCE ENGINE ─────────────────────────────────────────────────────

/**
 * FEATURE 1: Remaining Useful Life (RUL) Estimator
 * Uses linear regression on vibration slope + runtime to predict hours-to-failure.
 * Returns: { rulHours, confidence, trendSlope }
 */
export const calculateRUL = (machine, history) => {
  if (!history || history.length < 3) {
    return { rulHours: 999, confidence: 'LOW', trendSlope: 0 };
  }
  const vibHistory = history.filter(h => h.vibration != null).map(h => h.vibration);
  if (vibHistory.length < 3) return { rulHours: 999, confidence: 'LOW', trendSlope: 0 };

  // Simple linear regression on last 10 vibration readings
  const n = Math.min(vibHistory.length, 10);
  const slice = vibHistory.slice(-n);
  const xMean = (n - 1) / 2;
  const yMean = slice.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  slice.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) ** 2; });
  const slope = den === 0 ? 0 : num / den; // vibration increase per tick

  // Thresholds per machine (critical vibration level)
  const criticalVib = { pump: 5, motor: 8, fan: 3 }[machine] || 5;
  const currentVib = slice[slice.length - 1];
  const remaining = criticalVib - currentVib;

  if (slope <= 0 || remaining <= 0) {
    const rulHours = remaining <= 0 ? 0 : 9999;
    return { rulHours: Math.min(rulHours, 9999), confidence: remaining <= 0 ? 'CRITICAL' : 'HIGH', trendSlope: slope };
  }

  // Ticks to reach critical vibration × 2 sec per tick → hours
  const ticksRemaining = remaining / slope;
  const rulHours = Number(((ticksRemaining * 2) / 3600).toFixed(1));

  const confidence = history.length >= 10 ? 'HIGH' : history.length >= 5 ? 'MEDIUM' : 'LOW';
  return { rulHours: Math.min(rulHours, 9999), confidence, trendSlope: Number(slope.toFixed(4)) };
};

/**
 * FEATURE 2: Anomaly Baseline Learning
 * Maintains an EMA (exponential moving average) baseline per machine in localStorage.
 * Call on every new data point to keep baseline updated.
 */
const EMA_ALPHA = 0.05; // slow-learning — one week warmup at 2s interval

export const updateAnomalyBaseline = (machine, stats) => {
  if (typeof window === 'undefined') return;
  const key = `anomaly_baseline_${machine}`;
  const stored = localStorage.getItem(key);
  let baseline = stored ? JSON.parse(stored) : null;

  if (!baseline) {
    baseline = { temp: stats.temp, vibration: stats.vibration ?? 0, current: stats.current, count: 1 };
  } else {
    baseline.temp = EMA_ALPHA * stats.temp + (1 - EMA_ALPHA) * baseline.temp;
    baseline.vibration = EMA_ALPHA * (stats.vibration ?? 0) + (1 - EMA_ALPHA) * baseline.vibration;
    baseline.current = EMA_ALPHA * stats.current + (1 - EMA_ALPHA) * baseline.current;
    baseline.count = (baseline.count || 0) + 1;
  }
  localStorage.setItem(key, JSON.stringify(baseline));
  return baseline;
};

export const getAnomalyBaseline = (machine) => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(`anomaly_baseline_${machine}`);
  return stored ? JSON.parse(stored) : null;
};

/**
 * Detect how many sigma away current reading is from baseline.
 * Returns { tempDev, vibDev, currentDev, isAnomaly }
 */
export const detectAnomalyDeviation = (machine, stats) => {
  const baseline = getAnomalyBaseline(machine);
  if (!baseline || baseline.count < 50) return { tempDev: 0, vibDev: 0, currentDev: 0, isAnomaly: false, warming: true };

  const tempDev = baseline.temp > 0 ? Math.abs(stats.temp - baseline.temp) / baseline.temp : 0;
  const vibDev = baseline.vibration > 0 ? Math.abs((stats.vibration ?? 0) - baseline.vibration) / baseline.vibration : 0;
  const currentDev = baseline.current > 0 ? Math.abs(stats.current - baseline.current) / baseline.current : 0;
  const isAnomaly = tempDev > 0.25 || vibDev > 0.5 || currentDev > 0.35;

  return {
    tempDev: Number((tempDev * 100).toFixed(1)),
    vibDev: Number((vibDev * 100).toFixed(1)),
    currentDev: Number((currentDev * 100).toFixed(1)),
    isAnomaly,
    warming: false,
    sampleCount: baseline.count
  };
};

/**
 * FEATURE 3: Failure Pattern Recognition
 * Returns a named diagnosis based on combined sensor signals.
 * Patterns: BEARING_FAILURE | LUBRICATION_ISSUE | CAVITATION | OVERLOAD | COOLING_FAILURE | NORMAL
 */
export const classifyFailurePattern = (stats, prevStats) => {
  if (!prevStats) return { pattern: 'NORMAL', description: 'Operating normally', severity: 'ok' };

  const vibRising = (stats.vibration ?? 0) > (prevStats.vibration ?? 0) * 1.3;
  const tempRising = stats.temp > prevStats.temp * 1.15;
  const currentSurge = stats.current > prevStats.current * 1.25;
  const rpmDrop = prevStats.rpm > 0 && stats.rpm < prevStats.rpm * 0.85;
  const powerDrop = prevStats.power > 0 && stats.power < prevStats.power * 0.7;
  const tempHighVibHigh = (stats.vibration ?? 0) > 2.5 && stats.temp > 55;

  if (vibRising && tempRising && tempHighVibHigh) {
    return { pattern: 'BEARING_FAILURE', description: 'Simultaneous vibration + thermal rise: likely bearing wear or seizure', severity: 'critical' };
  }
  if (tempRising && !vibRising && !currentSurge) {
    return { pattern: 'LUBRICATION_ISSUE', description: 'Temperature rising without load change: inspect lubrication system', severity: 'warning' };
  }
  if (currentSurge && rpmDrop) {
    return { pattern: 'OVERLOAD', description: 'Current surge with RPM drop: mechanical blockage or conveyor jam', severity: 'critical' };
  }
  if (powerDrop && !rpmDrop && stats.state === 'ON') {
    return { pattern: 'CAVITATION', description: 'Stable RPM with power drop: pump cavitation or belt slippage detected', severity: 'warning' };
  }
  if (tempRising && !currentSurge && prevStats.power > 0 && stats.power <= prevStats.power * 1.05) {
    return { pattern: 'COOLING_FAILURE', description: 'Temperature rising at steady load: blocked airflow or failed cooling', severity: 'warning' };
  }
  return { pattern: 'NORMAL', description: 'No abnormal sensor correlations detected', severity: 'ok' };
};

/**
 * FEATURE 10: MTBF Calculator
 * Given an array of maintenance log timestamps, returns MTBF in hours.
 */
export const calculateMTBF = (maintenanceLogs) => {
  if (!maintenanceLogs || maintenanceLogs.length < 2) return null;
  const sorted = [...maintenanceLogs].sort((a, b) => a.timestamp - b.timestamp);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    const gapHrs = (sorted[i].timestamp - sorted[i - 1].timestamp) / 3600000;
    if (gapHrs > 0) gaps.push(gapHrs);
  }
  if (gaps.length === 0) return null;
  const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const trend = gaps.length >= 2 ? (gaps[gaps.length - 1] - gaps[0]) / gaps[0] : 0;
  return { mtbfHours: Number(avg.toFixed(1)), trend: Number((trend * 100).toFixed(1)), gapCount: gaps.length };
};

/**
 * FEATURE 5: Cost Per Hour
 * Returns KES/hour for a machine given its current power draw in watts.
 * 1 kWh = 30 KES
 */
export const calculateCostPerHour = (powerWatts) => {
  const kwhPerHour = powerWatts / 1000;
  return Number((kwhPerHour * 30).toFixed(2)); // KES/hr
};

/**
 * FEATURE 6: Maintenance ROI
 * Estimated value of maintenance action vs cost of unplanned failure.
 * downtime: hours of unplanned downtime avoided (estimate)
 * laborCostPerHr: KES per hour of production lost
 */
export const calculateMaintenanceROI = (maintCostKES = 5000, downtimeHoursAvoided = 8, productionRateKESPerHr = 15000) => {
  const valueSaved = downtimeHoursAvoided * productionRateKESPerHr;
  const roi = ((valueSaved - maintCostKES) / maintCostKES) * 100;
  return {
    valueSaved,
    maintCost: maintCostKES,
    roi: Number(roi.toFixed(1)),
    netBenefit: valueSaved - maintCostKES
  };
};