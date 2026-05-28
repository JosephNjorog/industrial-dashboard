import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import MachineCard from '../components/MachineCard';
import MachineIcon from '../components/MachineIcon';
import LogoIcon from '../components/LogoIcon';
import DateTimeCard from '../components/DateTimeCard';
import ThemeToggle from '../components/ThemeToggle';
import Modal from '../components/Modal';
import AnalyticsModal from '../components/AnalyticsModal';
import { initMqtt, publishControl, getMqttStatus } from '../lib/mqtt';
import {
  buildInitialMachineState,
  buildInitialMachineHistory,
  getMachineFromTopic,
  machineNames,
  normalizeMachineData,
  getMaintenanceProgress,
  runDiagnostics,
  calculateLoadFactor,
  calculateVelocityRMS,
  getISOSeverity,
  calculateThermalRateOfRise,
  updateAnomalyBaseline,
  classifyFailurePattern,
} from '../utils/helpers';
import HistoryTab from '../components/HistoryTab';
import AdminPanel from '../components/AdminPanel';
import IntelligencePanel from '../components/IntelligencePanel';
import CorrelationHeatmap from '../components/CorrelationHeatmap';
import MtbfTracker from '../components/MtbfTracker';

const machineTitles = {
  pump: 'Pump',
  motor: 'Motor',
  fan: 'Fan',
};

const pageStyles = {
  page: {
    minHeight: '100vh',
    padding: 0,
    background: 'var(--background)',
    color: 'var(--foreground)',
    fontFamily: 'Inter, system-ui, sans-serif',
    transition: 'background-color 0.3s ease, color 0.3s ease',
  },
  container: {
    maxWidth: '1600px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '8px',
    paddingBottom: '4px',
    borderBottom: '1px solid var(--border)',
  },
  titleGroup: {
    width: '100%',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '24px',
  },
  titleContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  pageTitle: {
    margin: 0,
    fontSize: '1.5rem',
    letterSpacing: '-0.03em',
  },
  description: {
    marginTop: '8px',
    color: 'var(--text-muted)',
    lineHeight: 1.6,
    maxWidth: '760px',
  },
  statusBadge: {
    padding: '8px 16px',
    borderRadius: '999px',
    fontWeight: 600,
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
    gap: '12px',
  },
  notifications: {
    position: 'fixed',
    top: '24px',
    right: '24px',
    width: '360px',
    maxHeight: '500px',
    overflowY: 'auto',
    zIndex: 1000,
  },
  logPanel: {
    background: 'var(--surface-soft)',
    borderRadius: '12px',
    padding: '20px',
    maxHeight: '700px',
    overflowY: 'auto',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    color: 'var(--foreground)',
    border: '1px solid var(--border)',
  },
  logTitle: {
    margin: '0 0 20px',
    fontSize: '1.4rem',
    color: 'var(--accent)',
    fontWeight: 700,
  },
  logEntry: {
    padding: '2px 0',
    borderBottom: 'none',
    fontSize: '0.8rem',
    color: 'var(--foreground)',
    display: 'block',
  },
  logMessage: {
    flex: 1,
  },
  tabs: {
    display: 'flex',
    gap: '6px',
    marginBottom: '8px',
    overflowX: 'auto',
    whiteSpace: 'nowrap',
    paddingBottom: '4px',
  },
  tabButton: {
    padding: '4px 12px',
    borderRadius: '6px',
    border: '1px solid var(--accent)',
    background: 'transparent',
    color: 'var(--accent)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  tabButtonActive: {
    background: 'var(--accent)',
    color: 'var(--background)',
  },
  insightsContainer: {
    background: 'var(--surface-soft)',
    borderRadius: '12px',
    padding: '20px',
    maxHeight: '600px',
    overflowY: 'auto',
  },
  insightGrid: {
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  },
  insightCard: {
    background: 'var(--insight-card)',
    borderRadius: '14px',
    border: '1px solid var(--border)',
    padding: '18px',
    minHeight: '180px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  insightCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  insightCardTitle: {
    margin: 0,
    fontSize: '1rem',
    color: 'var(--foreground)',
    letterSpacing: '-0.02em',
    textTransform: 'uppercase',
  },
  insightCount: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  insightItem: {
    padding: '12px',
    borderRadius: '10px',
    background: 'var(--insight-item)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
  },
  insightMessage: {
    fontSize: '1rem',
    color: 'var(--foreground)',
    fontWeight: 500,
  },
  insightTime: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  notification: {
    background: 'var(--surface-soft)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '14px 18px',
    marginBottom: '10px',
    fontSize: '0.9rem',
    color: 'var(--foreground)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
  },
  notificationControl: {
    background: 'var(--accent)',
    color: 'var(--background)',
  },
  notificationData: {
    background: 'var(--success)',
    color: 'var(--background)',
  },
  notificationError: {
    background: 'var(--danger)',
    color: 'var(--background)',
  },
};

export default function Dashboard() {
  const router = useRouter();
  const [username, setUsername] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [canOperate, setCanOperate] = useState(false);

  const [machineStats, setMachineStats] = useState(() =>
    machineNames.reduce((accumulator, machine) => {
      accumulator[machine] = buildInitialMachineState();
      return accumulator;
    }, {})
  );

  const [machineHistory, setMachineHistory] = useState(() =>
    machineNames.reduce((accumulator, machine) => {
      accumulator[machine] = [];
      return accumulator;
    }, {})
  );

  const [isConnected, setIsConnected] = useState(false);
  const [espStatus, setEspStatus] = useState('OFFLINE');
  const [wifiSignal, setWifiSignal] = useState(null); // New state for RSSI
  const [brokerMessage, setBrokerMessage] = useState('Connecting to MQTT broker...');
  const [notifications, setNotifications] = useState([]);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [insights, setInsights] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'alert', onConfirm: null });
  const [isLocked, setIsLocked] = useState(true); // Locked by default
  const [settings, setSettings] = useState({ thresholds: {}, maintenanceInterval: 3000 });
  const lastDiagnostics = useRef({}); // Track last sent diagnostic per machine
  const telemetryTimeoutRef = useRef(null); // Timeout to detect offline status
  const recentAlerts = useRef({}); // Alert suppressor registry
  const escalationTimers = useRef({}); // Escalation chain timers

  const [analyticsMachine, setAnalyticsMachine] = useState(null);
  const [prefilledAction, setPrefilledAction] = useState('');
  const [wastedKesh, setWastedKesh] = useState(145.2);

  const getLiveRecommendations = useCallback(() => {
    const recs = [];
    machineNames.forEach(m => {
      const stats = machineStats[m];
      const history = machineHistory[m] || [];
      if (!stats) return;

      const velocityRMS = calculateVelocityRMS(stats.vibration, 50);
      const iso = getISOSeverity(velocityRMS);
      const loadFactor = calculateLoadFactor(stats.current, m);
      const tempRateOfRise = calculateThermalRateOfRise(history);

      if (iso.status === 'CRITICAL') {
        recs.push({
          machine: m,
          severity: 'critical',
          title: `${machineTitles[m] || m} Critical Vibration`,
          message: `Vibration velocity reached ${velocityRMS} mm/s, exceeding ISO 10816 limits. Immediate shutdown advised to prevent severe bearing damage.`,
          time: new Date().toLocaleTimeString([], { hour12: false }),
          remediation: `Inspect structural coupling, check mounting bolts, and align shafts on ${machineTitles[m] || m}.`
        });
      } else if (iso.status === 'UNSATISFACTORY') {
        recs.push({
          machine: m,
          severity: 'warning',
          title: `${machineTitles[m] || m} Vibration Warning`,
          message: `Vibration velocity is ${velocityRMS} mm/s (ISO 10816 warning zone). Lubricate bearings or check shaft alignment during the next shift change.`,
          time: new Date().toLocaleTimeString([], { hour12: false }),
          remediation: `Perform bearing lubrication and verify coupling balance on ${machineTitles[m] || m}.`
        });
      }

      if (loadFactor > 110) {
        recs.push({
          machine: m,
          severity: 'critical',
          title: `${machineTitles[m] || m} Motor Overload`,
          message: `Current draw (${stats.current}A) represents ${loadFactor}% load factor. Check for mechanical binding or pump jam.`,
          time: new Date().toLocaleTimeString([], { hour12: false }),
          remediation: `Perform inspection for mechanical blockages / clear binding obstructions on ${machineTitles[m] || m}.`
        });
      } else if (loadFactor < 15 && stats.state === 'ON') {
        recs.push({
          machine: m,
          severity: 'warning',
          title: `${machineTitles[m] || m} Under-load Detected`,
          message: m === 'pump' 
            ? `Pump running dry at ${loadFactor}% load factor. Cavitation warning: shut off pump to protect seals.`
            : `Motor running with no resistance (${loadFactor}% load factor). Inspect for a broken drive belt or loose coupling.`,
          time: new Date().toLocaleTimeString([], { hour12: false }),
          remediation: m === 'pump'
            ? `Re-prime pump inlet suction line, inspect suction strainer, and check fluid supply.`
            : `Check belt tension, inspect pulley alignment, and verify drive shaft integrity.`
        });
      }

      if (tempRateOfRise > 1.5) {
        recs.push({
          machine: m,
          severity: 'warning',
          title: `${machineTitles[m] || m} Stator Overheating`,
          message: `Winding temperature rising at +${tempRateOfRise}°C/minute. Inspect air vents and cooling fan operation immediately.`,
          time: new Date().toLocaleTimeString([], { hour12: false }),
          remediation: `Clean cooling ventilation grills and check stator fan blades on ${machineTitles[m] || m}.`
        });
      }
    });

    return recs;
  }, [machineStats, machineHistory]);

  const openModal = useCallback((config) => {
    setModal({
      isOpen: true,
      title: config.title || 'Notification',
      message: config.message || '',
      type: config.type || 'alert',
      onConfirm: (val) => {
        if (config.onConfirm) config.onConfirm(val);
        setModal(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        if (config.onCancel) config.onCancel();
        setModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, []);

  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    const timestamp = new Date().toISOString();
    const msgKey = message.slice(0, 60); // Dedup key

    // Feature 7: Alert Fatigue Suppressor
    const now = Date.now();
    const existing = recentAlerts.current[msgKey];
    if (existing && now - existing.firstTime < 30 * 60 * 1000) {
      existing.count++;
      // Suppress duplicates; escalate on 3rd occurrence
      if (existing.count === 3) {
        const escalatedMsg = `🔁 [x${existing.count}] Repeated: ${message}`;
        const notification = { id, message: escalatedMsg, type, timestamp };
        setNotifications(prev => [notification, ...prev].slice(0, 100));
        fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notification)
        }).catch(() => {});
      }
      // Silently suppress further dupes
      return;
    }
    // New alert — register it
    recentAlerts.current[msgKey] = { count: 1, firstTime: now };
    // Clear registration after 30 minutes
    setTimeout(() => { delete recentAlerts.current[msgKey]; }, 30 * 60 * 1000);

    const notification = { id, message, type, timestamp };
    setNotifications(prev => [notification, ...prev].slice(0, 100)); // Keep last 100 in UI

    // Post to database in background
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification)
    }).catch(() => console.error('Failed to save log'));

    // Feature 8: Escalation Chain for critical alerts
    if (type === 'error' || message.toLowerCase().includes('critical') || message.toLowerCase().includes('emergency')) {
      const escalationKey = msgKey;
      // Clear any existing escalation timer for this alert
      if (escalationTimers.current[escalationKey]) {
        clearTimeout(escalationTimers.current[escalationKey]);
      }
      escalationTimers.current[escalationKey] = setTimeout(async () => {
        // Log escalation to DB
        try {
          const escId = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
          const escNotification = {
            id: escId,
            message: `🚨 ESCALATION: ${message}`,
            type: 'error',
            timestamp: new Date().toISOString()
          };
          setNotifications(prev => [escNotification, ...prev].slice(0, 100));
          await fetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(escNotification)
          });
        } catch (_) {}
        delete escalationTimers.current[escalationKey];
      }, 2 * 60 * 1000); // 2 minutes
    }
  }, []);

  const addInsight = useCallback((message, machine, severity = 'info') => {
    const id = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    const timestamp = new Date().toISOString();
    const insight = { id, message, timestamp, machine, severity };
    setInsights(prev => [insight, ...prev].slice(0, 20)); // Keep last 20 in UI

    // Post to database in background
    fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(insight)
    }).catch(() => console.error('Failed to save insight'));
  }, []);

  const toggleLock = useCallback(() => {
    if (!isLocked) {
      setIsLocked(true);
      addNotification('Dashboard control system locked', 'control');
    } else {
      openModal({
        title: 'Unlock Controls',
        message: 'Enter security passcode to enable machine controls',
        type: 'prompt',
        onConfirm: (val) => {
          if (val === '1234') {
            setIsLocked(false);
            addNotification('Dashboard controls unlocked', 'success');
          } else {
            addNotification('Access Denied: Incorrect Passcode', 'error');
          }
        }
      });
    }
  }, [isLocked, addNotification, openModal]);



  const downloadLogsAsCSV = useCallback(() => {
    if (notifications.length === 0) return;
    
    const headers = ['Timestamp', 'Type', 'Message'];
    const rows = notifications.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.type.toUpperCase(),
      log.message.replace(/,/g, ';') // Avoid CSV breaking on commas
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `factory_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addNotification('Logs exported to CSV successfully', 'success');
  }, [notifications, addNotification]);

  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') {
      return;
    }

    const storedHistory = window.localStorage.getItem('machineHistory');
    if (storedHistory) {
      try {
        setMachineHistory(JSON.parse(storedHistory));
      } catch (error) {
        console.warn('Failed to parse stored machine history', error);
      }
    }

    // Load initial data from DB
    fetch('/api/insights')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setInsights(data.slice(0, 20));
      })
      .catch(err => console.error('Failed to load insights from DB', err));

    fetch('/api/logs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setNotifications(data.slice(0, 100));
      })
      .catch(err => console.error('Failed to load logs from DB', err));

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.thresholds) setSettings(data);
      })
      .catch(err => console.error('Failed to load settings from DB', err));

    // Auth guard
    const user = localStorage.getItem('username');
    if (!user) {
      router.push('/login');
    } else {
      setUsername(user);
      setUserRole(localStorage.getItem('userRole'));
      setCanOperate(localStorage.getItem('canOperate') === 'true');
      
      // Poll for user permission changes
      const authInterval = setInterval(() => {
        fetch('/api/users')
          .then(res => res.json())
          .then(users => {
            if (Array.isArray(users)) {
              const currentUser = users.find(u => u.username === user);
              if (currentUser && currentUser.role !== 'admin') {
                const operate = currentUser.can_operate;
                if (operate !== (localStorage.getItem('canOperate') === 'true')) {
                  localStorage.setItem('canOperate', operate ? 'true' : 'false');
                  setCanOperate(operate);
                }
              }
            }
          })
          .catch(() => {});
      }, 2000);

      return () => clearInterval(authInterval);
    }
  }, [router]);

  // ── Anomaly Baseline DB Sync ──
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const MACHINES = ['pump', 'motor', 'fan'];

    const loadBaselines = async () => {
      try {
        const res = await fetch('/api/anomaly-baseline');
        if (!res.ok) return;
        const baselines = await res.json();
        MACHINES.forEach(m => {
          if (baselines[m]) {
            localStorage.setItem(`anomaly_baseline_${m}`, JSON.stringify(baselines[m]));
          }
        });
      } catch (_) {}
    };

    const syncToDb = async () => {
      try {
        const payload = {};
        MACHINES.forEach(m => {
          const stored = localStorage.getItem(`anomaly_baseline_${m}`);
          if (stored) payload[m] = JSON.parse(stored);
        });
        if (Object.keys(payload).length === 0) return;
        await fetch('/api/anomaly-baseline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (_) {}
    };

    loadBaselines();
    const syncInterval = setInterval(syncToDb, 5 * 60 * 1000); // sync every 5 min
    window.addEventListener('beforeunload', syncToDb);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('beforeunload', syncToDb);
    };
  }, [mounted]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem('machineHistory', JSON.stringify(machineHistory));
  }, [machineHistory]);

  useEffect(() => {
    const timer = setInterval(() => {
      let wasteWatts = 0;
      machineNames.forEach(m => {
        const stats = machineStats[m];
        if (stats && stats.state === 'ON') {
          const loadFactor = calculateLoadFactor(stats.current, m);
          if (loadFactor < 15) {
            wasteWatts += m === 'fan' ? 33 : 100;
          }
        }
      });
      if (wasteWatts > 0) {
        const wastedKwh = (wasteWatts / 1000) / 3600;
        const costKesh = wastedKwh * 30; // 30 KES/kWh
        setWastedKesh(prev => prev + costKesh);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [machineStats]);

  useEffect(() => {
    let activeClient = null;
    let mounted = true;

    const handleConnect = () => {
      const status = getMqttStatus();
      setIsConnected(status.connected);
      const brokerName = 'HiveMQ Cloud';
      setBrokerMessage(`Connected to MQTT ${brokerName} • live updates enabled`);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setBrokerMessage('Reconnecting to MQTT broker...');
      setEspStatus('OFFLINE');
      setWifiSignal(null);
      if (telemetryTimeoutRef.current) {
        clearTimeout(telemetryTimeoutRef.current);
        telemetryTimeoutRef.current = null;
      }
    };

    const handleMessage = (topic, payload) => {
      // 1. Handle ESP32 Global Status
      if (topic === 'factory/status' || topic === 'factory/system/status') {
        const isOnline = payload === 'ONLINE';
        setEspStatus(isOnline ? 'ONLINE' : 'OFFLINE');
        if (!isOnline) {
          setWifiSignal(null);
          if (telemetryTimeoutRef.current) clearTimeout(telemetryTimeoutRef.current);
        } else {
          // If online status received, reset heartbeat timeout
          if (telemetryTimeoutRef.current) clearTimeout(telemetryTimeoutRef.current);
          telemetryTimeoutRef.current = setTimeout(() => {
            setEspStatus('OFFLINE');
            setWifiSignal(null);
          }, 15000); // 15 seconds heartbeat timeout
        }
        return;
      }

      // 2. Handle Heartbeat
      if (topic === 'factory/system/heartbeat') {
        setEspStatus('ONLINE');
        if (telemetryTimeoutRef.current) clearTimeout(telemetryTimeoutRef.current);
        telemetryTimeoutRef.current = setTimeout(() => {
          setEspStatus('OFFLINE');
          setWifiSignal(null);
        }, 15000); // 15 seconds heartbeat timeout

        if (payload) {
          if (payload.wifi !== undefined) setWifiSignal(payload.wifi);
          else if (payload.wifi_rssi !== undefined) setWifiSignal(payload.wifi_rssi);
        }
        return;
      }

      if (topic === 'factory/insights' || topic === 'factory/insights/global' || topic.endsWith('/insights')) {
        try {
          const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
          
          // Format energy reports into readable text if they come as raw data
          let message = parsed.msg || parsed.message || parsed.insight;
          let severity = parsed.severity || 'info';

          if (parsed.type === 'energy' && !message) {
            message = `Energy Report: Avg ${Number(parsed.avg_power || 0).toFixed(1)}W | Peak ${Number(parsed.max_power || 0).toFixed(1)}W`;
            severity = 'info';
          }

          if (message) {
            addInsight(message, parsed.machine, severity);
          }
        } catch (error) {
          console.warn('Failed to parse insight', error);
        }
        return;
      }

      // 3. Handle Direct Hardware Alerts/Maintenance
      if (topic === 'factory/system/logs') {
        const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
        addNotification(`>_ ${msg}`, 'system');
        return;
      }

      if (topic === 'factory/alerts' || topic === 'factory/maintenance') {
        const severity = topic.endsWith('alerts') ? 'danger' : 'warning';
        addInsight(String(payload), null, severity);
        return;
      }

      // 4. Handle Command ACKs
      if (topic === 'factory/ack') {
        try {
          const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
          const machine = parsed.machine;
          const status = parsed.status;
          const cmdId = parsed.cmdId;

          if (machine && status) {
            const machineTitle = machineTitles[machine];
            const isSuccess = status === 'ACK';
            
            addNotification(
              `${isSuccess ? '✅ CONFIRMED' : '❌ FAILED'}: Command for ${machineTitle} (${status})`, 
              isSuccess ? 'success' : 'error'
            );

            // Update machine state based on ACK
            if (isSuccess) {
              setMachineStats(prev => {
                const machineData = prev[machine];
                return {
                  ...prev,
                  [machine]: {
                    ...machineData,
                    lastAck: cmdId,
                    pendingCmdId: null, 
                    state: machineData.pendingState || machineData.state, // Use requested state
                    pendingState: null,
                    status: 'Healthy'
                  }
                };
              });
            } else {
              // On NACK, clear pending so they can try again
              setMachineStats(prev => ({
                ...prev,
                [machine]: {
                  ...prev[machine],
                  pendingCmdId: null,
                  pendingState: null
                }
              }));
            }
          }
        } catch (error) {
          console.warn('Failed to parse ACK', error);
        }
        return;
      }

      const machine = getMachineFromTopic(topic);
      if (!machine) {
        return;
      }

      // 🛡️ Auto-Online Detection: Decoupled telemetry data from online checking to prevent data grouping from affecting status

      try {
        // payload is already parsed by lib/mqtt.js, but handle string fallback just in case
        const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
        const normalized = normalizeMachineData(parsed);
        const time = new Date().toLocaleTimeString([], { hour12: false });

        // Feature 2: Update anomaly baseline continuously
        try {
          updateAnomalyBaseline(machine, normalized);
        } catch (_) {}

        setMachineStats((previousState) => {
          const prevMachine = previousState[machine];

          // Feature 3: Failure pattern recognition — fire alert if a pattern is found
          try {
            const fp = classifyFailurePattern(normalized, prevMachine);
            if (fp.severity !== 'ok') {
              // Delayed to avoid setState-during-render warning
              setTimeout(() => addNotification(`${machine.toUpperCase()}: ${fp.pattern.replace(/_/g,' ')} — ${fp.description}`, fp.severity === 'critical' ? 'error' : 'info'), 0);
            }
          } catch (_) {}
          // If we are waiting for an ACK, preserve the current state to prevent telemetry flickering
          const finalState = prevMachine.pendingCmdId 
            ? prevMachine.state 
            : (normalized.state !== undefined ? normalized.state : prevMachine.state);
          const finalMaintProgress = normalized.maintenanceProgress !== null ? normalized.maintenanceProgress : prevMachine.maintenanceProgress;
          const finalMaintDue = normalized.maintenance_due !== null ? normalized.maintenance_due : prevMachine.maintenance_due;
          
          const newPower = normalized.power || (normalized.current * 230);
          
          const hoursElapsed = 0.2 / 3600; // 200ms loop timing
          const energyIncrement = (newPower * hoursElapsed) / 1000;
          const newEnergy = (prevMachine.energy || 0) + energyIncrement;

          // 📈 Calculate Trends
          const getTrend = (curr, prev) => {
            if (!prev) return 'stable';
            if (curr > prev * 1.05) return 'rising';
            if (curr < prev * 0.95) return 'falling';
            return 'stable';
          };

          // 🧠 Run Diagnostic Engine
          const diagnostic = runDiagnostics(machine, normalized, machineHistory[machine] || [], settings.thresholds);

          return {
            ...previousState,
            [machine]: {
              ...prevMachine,
              ...normalized,
              state: finalState,
              maintenance_due: finalMaintDue,
              maintenanceProgress: finalMaintProgress,
              pendingCmdId: prevMachine.pendingCmdId, // Let ACK or Timeout clear this
              pendingState: prevMachine.pendingState,
              power: newPower,
              energy: newEnergy,
              lastUpdate: time,
              tempTrend: getTrend(normalized.temp, prevMachine.temp),
              currTrend: getTrend(normalized.current, prevMachine.current),
              vibTrend: getTrend(normalized.vibration, prevMachine.vibration),
              diagnosticReason: diagnostic ? diagnostic.message : null
            },
          };
        });

        setMachineHistory((previousHistory) => ({
          ...previousHistory,
          [machine]: [
            ...previousHistory[machine],
            {
              time,
              temp: normalized.temp,
              current: normalized.current,
              vibration: normalized.vibration,
            },
          ].slice(-20),
        }));

        const machineTitle = machineTitles[machine];
        const statusText = normalized.status !== 'Healthy' ? ` (${normalized.status})` : '';
        addNotification(`Received data from ${machineTitle}${statusText}`, 'data');

        // --- 3. Run Diagnostic Engine ---
        const finding = runDiagnostics(machine, normalized, machineHistory[machine] || [], settings.thresholds);
        if (finding && lastDiagnostics.current[machine] !== finding.message) {
          addInsight(finding.message, machine, finding.severity);
          lastDiagnostics.current[machine] = finding.message;
          
          // Debounce same diagnostic for 2 minutes to prevent spam
          setTimeout(() => {
            if (lastDiagnostics.current[machine] === finding.message) {
              lastDiagnostics.current[machine] = null;
            }
          }, 120000);
        }
      } catch (error) {
        console.warn('Failed to parse MQTT payload for', topic, error);
      }
    };

    const handleRealMessage = (event) => {
      const { topic, payload } = event.detail;
      handleMessage(topic, payload);
    };

    const setupMqttClient = () => {
      try {
        const client = initMqtt();
        if (!mounted || !client) {
          return;
        }

        activeClient = client;

        client.on('connect', handleConnect);
        client.on('reconnect', handleDisconnect);
        client.on('close', handleDisconnect);

        // Listen for real MQTT messages from lib/mqtt.js
        if (typeof window !== 'undefined') {
          window.addEventListener('mqtt-message', handleRealMessage);
        }
      } catch (error) {
        console.error('MQTT initialization failed', error);
      }
    };

    setupMqttClient();

    return () => {
      mounted = false;
      if (activeClient) {
        activeClient.removeListener('connect', handleConnect);
        activeClient.removeListener('reconnect', handleDisconnect);
        activeClient.removeListener('close', handleDisconnect);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('mqtt-message', handleRealMessage);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const handleControl = async (machine, state) => {
    if (espStatus === 'OFFLINE') {
      openModal({
        title: 'Hardware Offline',
        message: `Cannot change ${machineTitles[machine]} state. The ESP32 is currently OFFLINE. Please check the physical power and network connection.`,
        type: 'alert'
      });
      addNotification(`ERROR: Cannot send ${state} command to ${machineTitles[machine]}. ESP32 is offline.`, 'error');
      return;
    }

    if (userRole !== 'admin' && !canOperate) {
      openModal({
        title: 'Access Denied',
        message: 'You do not have the active operation token to control machines. Please contact an Administrator.',
        type: 'alert'
      });
      addNotification('ACCESS DENIED: Insufficient privileges to operate machines', 'error');
      return;
    }

    if (isLocked) {
      toggleLock();
      return;
    }

    // Try to acquire the machine lock for control
    try {
      const res = await fetch('/api/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine, user: username })
      });
      
      const lockData = await res.json();
      
      if (!res.ok) {
        openModal({
          title: 'Machine Locked',
          message: `Cannot change ${machineTitles[machine]} state. It is currently locked by: ${lockData.lockedBy || 'Another User'}.`,
          type: 'alert'
        });
        addNotification(`ACCESS DENIED: ${machineTitles[machine]} is locked by ${lockData.lockedBy}`, 'error');
        return;
      }
    } catch (error) {
      addNotification(`Lock Check Failed: ${error.message}`, 'error');
      return;
    }

    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    const cmdId = publishControl(machine, state);
    
    setMachineStats((previousState) => ({
      ...previousState,
      [machine]: {
        ...previousState[machine],
        pendingCmdId: cmdId,
        pendingState: state, // Store the state we WANT to achieve
        lastCommand: timestamp,
      },
    }));

    // Auto-clear pending state after 5 seconds if no ACK/telemetry confirmation received
    setTimeout(() => {
      setMachineStats((previousState) => {
        const current = previousState[machine];
        if (current && current.pendingCmdId === cmdId) {
          addNotification(`⚠️ TIMEOUT: Command for ${machineTitles[machine]} timed out`, 'warning');
          return {
            ...previousState,
            [machine]: {
              ...current,
              pendingCmdId: null,
              pendingState: null,
            }
          };
        }
        return previousState;
      });
    }, 5000);

    const machineTitle = machineTitles[machine];
    addNotification(`SENT: ${state} command to ${machineTitle} (ID: ${cmdId})`, 'control');
  };

  if (!mounted || !username) {
    return (
      <div style={pageStyles.page}>
        <div style={pageStyles.container}>
          <header style={pageStyles.header}>
            <div style={pageStyles.titleGroup}>
              <div style={pageStyles.titleSection}>
                <LogoIcon size={52} color="#4ce7ff" />
                <div style={pageStyles.titleContent}>
                  <h1 style={pageStyles.pageTitle}>Industrial Machine Guard</h1>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#8da0b6', letterSpacing: '0.02em' }}>
                    Smart Factory Monitoring & Control Platform
                  </p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <DateTimeCard />
                  <ThemeToggle />
                </div>
              </div>
              <span
                style={{
                  ...pageStyles.statusBadge,
                  backgroundColor: 'var(--warning)',
                  color: 'var(--background)',
                }}
              >
                Connecting to MQTT broker...
              </span>
            </div>
          </header>
        </div>
      </div>
    );
  }

  const insightsByMachine = machineNames.reduce((group, machine) => {
    group[machine] = [];
    return group;
  }, {});
  const unknownInsights = [];

  insights.forEach((insight) => {
    if (insight.machine && insightsByMachine[insight.machine]) {
      insightsByMachine[insight.machine].push(insight);
    } else {
      unknownInsights.push(insight);
}
  });

  return (
    <div className="dashboard-page-wrapper" style={pageStyles.page}>
      <div className="dashboard-layout">
        {/* Left Sidebar Navigation */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <LogoIcon size={32} color="var(--accent)" />
            <div>
              <h1 style={{ ...pageStyles.pageTitle, fontSize: '1.05rem', margin: 0, fontWeight: 800 }}>Command Center</h1>
              <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Real-Time SCADA System</div>
            </div>
          </div>

          <div className="sidebar-menu">
            <button
              className={`sidebar-menu-btn ${currentTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentTab('dashboard')}
            >
              <span style={{ fontSize: '1.15rem' }}>📊</span>
              <span>Dashboard</span>
            </button>
            <button
              className={`sidebar-menu-btn ${currentTab === 'insights' ? 'active' : ''}`}
              onClick={() => setCurrentTab('insights')}
            >
              <span style={{ fontSize: '1.15rem' }}>💡</span>
              <span>Insights</span>
            </button>
            <button
              className={`sidebar-menu-btn ${currentTab === 'floorplan' ? 'active' : ''}`}
              onClick={() => setCurrentTab('floorplan')}
            >
              <span style={{ fontSize: '1.15rem' }}>🗺️</span>
              <span>Floor Plan</span>
            </button>
            <button
              className={`sidebar-menu-btn ${currentTab === 'history' ? 'active' : ''}`}
              onClick={() => setCurrentTab('history')}
            >
              <span style={{ fontSize: '1.15rem' }}>🕒</span>
              <span>History</span>
            </button>
            <button
              className={`sidebar-menu-btn ${currentTab === 'logs' ? 'active' : ''}`}
              onClick={() => setCurrentTab('logs')}
            >
              <span style={{ fontSize: '1.15rem' }}>📃</span>
              <span>Logs</span>
            </button>
            <button
              className={`sidebar-menu-btn ${currentTab === 'intelligence' ? 'active' : ''}`}
              onClick={() => setCurrentTab('intelligence')}
            >
              <span style={{ fontSize: '1.15rem' }}>🧠</span>
              <span>Intelligence</span>
            </button>
            {userRole === 'admin' && (
              <button
                className={`sidebar-menu-btn ${currentTab === 'admin' ? 'active' : ''}`}
                onClick={() => setCurrentTab('admin')}
              >
                <span style={{ fontSize: '1.15rem' }}>⚙️</span>
                <span>Admin</span>
              </button>
            )}
          </div>

          <div className="sidebar-footer">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div className="sidebar-user-info">
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--foreground)' }}>{username}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{userRole}</span>
              </div>
              
              {(userRole === 'admin' || canOperate) && (
                <button
                  onClick={toggleLock}
                  title={isLocked ? "System Locked" : "System Unlocked"}
                  style={{
                    background: isLocked ? 'var(--danger)' : 'var(--success)',
                    border: 'none',
                    borderRadius: '6px',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: isLocked ? '0 0 8px var(--danger)' : '0 0 8px var(--success)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: '0.85rem' }}>{isLocked ? '🔒' : '🔓'}</span>
                </button>
              )}
            </div>

            <button
              onClick={() => {
                localStorage.removeItem('username');
                router.push('/login');
              }}
              style={{
                background: 'rgba(255, 45, 85, 0.08)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--danger)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 45, 85, 0.08)';
                e.currentTarget.style.color = 'var(--danger)';
              }}
            >
              <span>🚪</span> LOGOUT
            </button>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <div className="main-viewport">
          <header className="viewport-header">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ 
                ...pageStyles.statusBadge, 
                padding: '4px 10px', 
                margin: 0,
                fontSize: '0.7rem',
                backgroundColor: isConnected ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 45, 85, 0.1)',
                color: isConnected ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${isConnected ? 'var(--success)' : 'var(--danger)'}`
              }}>
                BROKER: {isConnected ? 'READY' : 'ERROR'}
              </div>
              
              <div style={{ 
                ...pageStyles.statusBadge, 
                padding: '4px 10px', 
                margin: 0,
                fontSize: '0.7rem',
                backgroundColor: espStatus === 'ONLINE' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 45, 85, 0.1)',
                color: espStatus === 'ONLINE' ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${espStatus === 'ONLINE' ? 'var(--success)' : 'var(--danger)'}`
              }}>
                ESP32: {espStatus} {wifiSignal && `(${wifiSignal}dBm)`}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <DateTimeCard />
              <ThemeToggle />
            </div>
          </header>

          <div className="viewport-content">

        {currentTab === 'dashboard' && (
          <main style={{ padding: '16px', maxWidth: '1600px', margin: '0 auto' }}>
            {/* KPI Overview Section */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', 
              gap: '16px', 
              marginBottom: '24px' 
            }}>
              <div className="glass-panel" style={{ 
                padding: '12px 16px', 
                borderRadius: '12px', 
                background: 'var(--card-gradient)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Machines</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)' }}>
                    {Object.values(machineStats).filter(m => m.state === 'ON').length}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/ {machineNames.length}</span>
                </div>
              </div>

              <div className="glass-panel" style={{ 
                padding: '12px 16px', 
                borderRadius: '12px', 
                background: 'var(--card-gradient)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Factory Energy Usage</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--warning)' }}>
                    {Object.values(machineStats).reduce((sum, m) => sum + (m.energy || 0), 0).toFixed(2)}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>kWh</span>
                </div>
              </div>



              <div className="glass-panel" style={{ 
                padding: '12px 16px', 
                borderRadius: '12px', 
                background: 'var(--card-gradient)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Factory Uptime</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>
                    {((Object.values(machineStats).filter(m => m.state === 'ON').length / machineNames.length) * 100).toFixed(0)}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>%</span>
                </div>
              </div>
            </div>

            <div style={pageStyles.grid}>
            {machineNames.map((machine) => (
              <MachineCard
                key={machine}
                machine={machine}
                title={machineTitles[machine]}
                stats={machineStats[machine]}
                history={machineHistory[machine]}
                onControl={handleControl}
                openModal={openModal}
                isLocked={isLocked}
                onViewDetails={(m) => setAnalyticsMachine(m)}
                settings={settings}
                canOperate={userRole === 'admin' || canOperate}
              />
            ))}
            </div>
          </main>
        )}

        {currentTab === 'insights' && (() => {
          const liveRecs = getLiveRecommendations();
          return (
            <div style={pageStyles.insightsContainer}>
              <h2 style={{ margin: '0 0 20px', color: 'var(--accent)' }}>Machine Insights</h2>

              {/* Advanced Summary Widgets */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
                gap: '20px',
                marginBottom: '24px'
              }}>
                {/* 1. OEE Dashboard Widget */}
                {(() => {
                  const avgHealth = machineNames.reduce((sum, m) => sum + (machineStats[m]?.health ?? 100), 0) / 3;
                  const availability = Math.round(avgHealth * 0.95);
                  
                  let runningLoads = [];
                  machineNames.forEach(m => {
                    const stats = machineStats[m];
                    if (stats && stats.state === 'ON') {
                      runningLoads.push(calculateLoadFactor(stats.current, m));
                    }
                  });
                  const performance = runningLoads.length > 0 
                    ? Math.round(Math.min(100, runningLoads.reduce((s, l) => s + l, 0) / runningLoads.length))
                    : 100;
                    
                  const anomalyCount = machineNames.filter(m => {
                    const stats = machineStats[m];
                    return stats && (stats.overheatRisk > 10 || stats.overloadRisk > 10 || stats.misalignRisk > 10);
                  }).length;
                  const quality = Math.round(((3 - anomalyCount) / 3) * 100);
                  
                  const oee = Math.round((availability * performance * quality) / 10000);

                  return (
                    <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>PLANT EFFECTIVENESS</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 8px', background: 'rgba(0,255,136,0.1)', color: 'var(--success)', borderRadius: '6px' }}>OEE ANALYSIS</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="80" height="80" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="var(--border)"
                              strokeWidth="3.5"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="var(--accent)"
                              strokeDasharray={`${oee}, 100`}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                            />
                          </svg>
                          <div style={{ position: 'absolute', fontSize: '1.2rem', fontWeight: 900, color: 'var(--foreground)' }}>
                            {oee}%
                          </div>
                        </div>
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, marginBottom: '2px' }}>
                              <span>AVAILABILITY</span>
                              <span style={{ color: 'var(--foreground)' }}>{availability}%</span>
                            </div>
                            <div style={{ height: '4px', background: 'var(--badge-bg)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${availability}%`, height: '100%', background: 'var(--accent)' }} />
                            </div>
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, marginBottom: '2px' }}>
                              <span>PERFORMANCE</span>
                              <span style={{ color: 'var(--foreground)' }}>{performance}%</span>
                            </div>
                            <div style={{ height: '4px', background: 'var(--badge-bg)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${performance}%`, height: '100%', background: 'var(--success)' }} />
                            </div>
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, marginBottom: '2px' }}>
                              <span>QUALITY</span>
                              <span style={{ color: 'var(--foreground)' }}>{quality}%</span>
                            </div>
                            <div style={{ height: '4px', background: 'var(--badge-bg)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${quality}%`, height: '100%', background: 'var(--warning)' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. KES Cost & Idle Energy Waste Widget */}
                {(() => {
                  let activeWasteRate = 0;
                  machineNames.forEach(m => {
                    const stats = machineStats[m];
                    if (stats && stats.state === 'ON') {
                      const loadFactor = calculateLoadFactor(stats.current, m);
                      if (loadFactor < 15) {
                        activeWasteRate += m === 'fan' ? 33 : 100;
                      }
                    }
                  });
                  const hourlyCostRate = (activeWasteRate / 1000) * 30; // 30 KES/kWh

                  return (
                    <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>FINANCIAL ENERGY WASTE</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {hourlyCostRate > 0 && (
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 8px var(--danger)' }} />
                          )}
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 8px', background: hourlyCostRate > 0 ? 'rgba(255,0,85,0.1)' : 'rgba(255,255,255,0.05)', color: hourlyCostRate > 0 ? 'var(--danger)' : 'var(--text-muted)', borderRadius: '6px' }}>
                            {hourlyCostRate > 0 ? 'ACTIVE LOSS' : 'NO LOSS'}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: hourlyCostRate > 0 ? 'var(--danger)' : 'var(--foreground)' }}>
                          {wastedKesh.toFixed(2)} <span style={{ fontSize: '1rem', fontWeight: 500 }}>KES</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Estimated cumulative loss from idle runs
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                          <span>Tariff Rate: 30 KES/kWh</span>
                          <span>Idle Waste: {hourlyCostRate.toFixed(2)} KES/hr</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={pageStyles.insightGrid}>
                {machineNames.map((machine) => (
                  <div key={machine} style={pageStyles.insightCard}>
                    <div style={pageStyles.insightCardHeader}>
                      <MachineIcon type={machine} size={28} color="var(--accent)" />
                      <div>
                        <h3 style={pageStyles.insightCardTitle}>{machineTitles[machine]}</h3>
                        <div style={pageStyles.insightCount}>
                          {insightsByMachine[machine].length} insight{insightsByMachine[machine].length === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>

                    {insightsByMachine[machine].length === 0 ? (
                      <p style={{ color: '#7f8fa4', margin: 0 }}>No insights for this machine yet.</p>
                    ) : (
                      insightsByMachine[machine].map((insight, index) => (
                        <div key={`${insight.id}-${index}`} style={pageStyles.insightItem}>
                          <div style={pageStyles.insightMessage}>{insight.message}</div>
                          <div style={pageStyles.insightTime}>
                            {new Date(insight.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ))}

                {unknownInsights.length > 0 && (
                  <div style={pageStyles.insightCard}>
                    <div style={pageStyles.insightCardHeader}>
                      <MachineIcon type="unknown" size={28} color="var(--warning)" />
                      <div>
                        <h3 style={pageStyles.insightCardTitle}>General Insights</h3>
                        <div style={pageStyles.insightCount}>
                          {unknownInsights.length} insight{unknownInsights.length === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>
                    {unknownInsights.map((insight, index) => (
                      <div key={`${insight.id}-${index}`} style={pageStyles.insightItem}>
                        <div style={pageStyles.insightMessage}>{insight.message}</div>
                        <div style={pageStyles.insightTime}>
                          {new Date(insight.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Real-Time Predictive Recommendations */}
                <div style={{ ...pageStyles.insightCard, gridColumn: '1 / -1', border: '1px solid var(--accent)' }}>
                  <div style={pageStyles.insightCardHeader}>
                    <span style={{ fontSize: '1.5rem' }}>💡</span>
                    <div>
                      <h3 style={{ ...pageStyles.insightCardTitle, color: 'var(--accent)' }}>Automated Decision Support Advisories</h3>
                      <div style={pageStyles.insightCount}>
                        {liveRecs.length === 0 ? 'All systems operating within optimal thresholds' : `${liveRecs.length} active recommendation${liveRecs.length === 1 ? '' : 's'}`}
                      </div>
                    </div>
                  </div>
                  
                  {liveRecs.length === 0 ? (
                    <div style={{ color: 'var(--success)', fontSize: '0.85rem', padding: '16px', background: 'rgba(0,255,136,0.05)', borderRadius: '10px', border: '1px solid rgba(0,255,136,0.15)' }}>
                      ✓ **No anomalies detected**: Temperature slopes, electrical loads, and ISO vibration severity grades are all within green zones.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {liveRecs.map((rec, index) => (
                        <div key={index} style={{ 
                          ...pageStyles.insightItem, 
                          border: `1px solid ${rec.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'}`,
                          background: rec.severity === 'critical' ? 'rgba(255, 0, 85, 0.05)' : 'rgba(255, 184, 0, 0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.85rem', color: rec.severity === 'critical' ? 'var(--danger)' : 'var(--warning)', textTransform: 'uppercase' }}>
                              ⚠️ {rec.title}
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rec.time}</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--foreground)' }}>
                            {rec.message}
                          </div>
                          {rec.remediation && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                              <button 
                                onClick={() => {
                                  setAnalyticsMachine(rec.machine);
                                  setPrefilledAction(rec.remediation);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  color: 'var(--accent)',
                                  border: '1px solid var(--accent)',
                                  fontSize: '0.72rem',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                🔧 Log Maintenance Action
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {currentTab === 'history' && (
          <HistoryTab logs={notifications} insights={insights} />
        )}

        {currentTab === 'floorplan' && (
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', overflowX: 'auto' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', minWidth: '800px' }}>
                <div>
                  <h2 style={{ ...pageStyles.logTitle, margin: 0 }}>Factory Digital Twin</h2>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Isometric Spatial Mapping</div>
                </div>
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.7rem', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }} /> NOMINAL</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 10px var(--danger)' }} /> CRITICAL</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--warning)', animation: 'pulse 1s infinite' }} /> ANOMALY</span>
                </div>
              </div>
              
              <div style={{ 
                background: 'url(/images/floor-map.png) center/cover no-repeat', 
                borderRadius: '16px', 
                border: '1px solid var(--border)',
                position: 'relative',
                height: '600px',
                minWidth: '800px',
                overflow: 'hidden',
                boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)'
              }}>

                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  
                  {/* ─── PRODUCTION LINE PATH ─── */}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
                    <line x1="25%" y1="65%" x2="75%" y2="35%" stroke="var(--border)" strokeWidth="8" />
                    <line x1="25%" y1="65%" x2="75%" y2="35%" stroke="var(--accent)" strokeWidth="2" strokeDasharray="8, 8" opacity="0.8">
                      <animate attributeName="stroke-dashoffset" from="16" to="0" dur="1s" repeatCount="indefinite" />
                    </line>
                    {/* Connection Nodes */}
                    <circle cx="25%" cy="65%" r="12" fill="var(--surface-soft)" stroke="var(--border)" strokeWidth="2" />
                    <circle cx="50%" cy="50%" r="12" fill="var(--surface-soft)" stroke="var(--border)" strokeWidth="2" />
                    <circle cx="75%" cy="35%" r="12" fill="var(--surface-soft)" stroke="var(--border)" strokeWidth="2" />
                  </svg>

                  {machineNames.map((m, i) => {
                    const stats = machineStats[m];
                    const pos = i === 0 ? { left: '25%', top: '65%' } : i === 1 ? { left: '50%', top: '50%' } : { left: '75%', top: '35%' };
                    const isAlert = stats.status === 'Critical' || (stats.bearing && stats.bearing !== 'NORMAL');
                    const color = isAlert ? 'var(--danger)' : stats.state === 'ON' ? 'var(--success)' : 'var(--text-muted)';
                    
                    return (
                      <div 
                        key={m}
                        style={{
                          position: 'absolute',
                          left: pos.left,
                          top: pos.top,
                          transform: 'translate(-50%, -50%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                          zIndex: 10 - i
                        }}
                        onClick={() => setAnalyticsMachine(m)}
                      >
                        {/* ─── 3D MACHINE IMAGE ─── */}
                        <div style={{ position: 'relative', width: '140px', height: '140px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          {/* Floor Shadow & Glow */}
                          <div style={{
                            position: 'absolute', bottom: '0px', width: '100px', height: '40px',
                            background: 'rgba(0,0,0,0.9)',
                            borderRadius: '50%',
                            filter: 'blur(8px)',
                            zIndex: 0
                          }} />
                          <div style={{
                            position: 'absolute', bottom: '15px', width: '70px', height: '20px',
                            background: stats.state === 'ON' ? color : 'transparent',
                            borderRadius: '50%',
                            filter: 'blur(10px)',
                            opacity: stats.state === 'ON' ? 0.9 : 0,
                            animation: stats.state === 'ON' ? 'pulse 2.5s infinite' : 'none',
                            zIndex: 0
                          }} />

                          {/* Mounting Base */}
                          <div style={{
                            position: 'absolute', bottom: '15px', width: '80px', height: '24px',
                            background: 'linear-gradient(180deg, var(--surface-soft) 0%, var(--surface) 100%)',
                            border: '1px solid var(--border)',
                            borderBottomWidth: '4px',
                            borderBottomColor: '#05070a',
                            borderRadius: '50%',
                            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.05)',
                            zIndex: 1
                          }} />
                          
                          <img 
                            src={`/images/${m}.png`} 
                            alt={m} 
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'contain', 
                              position: 'relative',
                              zIndex: 2,
                              filter: stats.state === 'ON' 
                                ? `drop-shadow(0 0 10px ${color}) brightness(1.2)` 
                                : isAlert 
                                  ? 'drop-shadow(0 0 15px var(--danger)) grayscale(0.5)'
                                  : 'grayscale(0.8) brightness(0.7)'
                            }} 
                          />
                        </div>

                        {/* ─── HOLOGRAPHIC DATA TAGS ─── */}
                        <div style={{
                          marginTop: '25px',
                          padding: '10px 14px',
                          background: 'rgba(10, 15, 24, 0.85)',
                          backdropFilter: 'blur(12px)',
                          border: `1px solid ${color}`,
                          borderRadius: '10px',
                          minWidth: '140px',
                          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 15px ${color}22`,
                          animation: 'slideUp 0.6s cubic-bezier(0.23, 1, 0.32, 1)'
                        }}>
                          <div style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: 900, 
                            color: 'var(--foreground)', 
                            textAlign: 'center', 
                            marginBottom: '8px',
                            borderBottom: '1px solid var(--border)',
                            paddingBottom: '4px',
                            letterSpacing: '0.05em'
                          }}>
                            {m.toUpperCase()}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                              <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>TEMP</div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: stats.temp > 75 ? 'var(--danger)' : 'var(--foreground)' }}>
                                {stats.isSensorError ? 'ERR' : `${stats.temp.toFixed(1)}°C`}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>LOAD</div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: stats.current > 2.2 ? 'var(--warning)' : 'var(--foreground)' }}>
                                {stats.current.toFixed(1)}A
                              </div>
                            </div>
                          </div>
                          <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>PREDICTION</div>
                             <div style={{ fontSize: '0.7rem', fontWeight: 900, color: stats.health > 80 ? 'var(--success)' : 'var(--danger)' }}>
                                {stats.health}%
                             </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
          </div>
        )}

        {currentTab === 'logs' && (
          <div className="glass-panel" style={pageStyles.logPanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ ...pageStyles.logTitle, margin: 0 }}>System Activity Logs</h2>
              <button 
                onClick={downloadLogsAsCSV}
                style={{
                  padding: '8px 16px',
                  background: 'var(--badge-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}
              >
                📥 EXPORT CSV
              </button>
            </div>
            
            {notifications.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
                No activity logs recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {notifications.map((notification, index) => (
                  <div 
                    key={`${notification.id}-${index}`} 
                    style={{
                      ...pageStyles.logEntry,
                      padding: '12px',
                      background: 'var(--badge-bg)',
                      borderRadius: '6px',
                      borderLeft: `4px solid ${
                        notification.type === 'error' ? 'var(--danger)' : 
                        notification.type === 'system' ? '#7f8fa4' :
                        notification.type === 'control' ? 'var(--accent)' : 'var(--success)'
                      }`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', opacity: 0.7, fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                        {notification.type}
                      </span>
                      <span>{new Date(notification.timestamp).toLocaleString()}</span>
                    </div>
                    <div style={pageStyles.logMessage}>{notification.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentTab === 'intelligence' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px' }}>
            <IntelligencePanel machineStats={machineStats} />
            <CorrelationHeatmap machineHistory={machineHistory} />
            <MtbfTracker />
          </div>
        )}

        {currentTab === 'admin' && userRole === 'admin' && (
          <AdminPanel addNotification={addNotification} />
        )}
          </div> {/* Closing viewport-content */}
        </div> {/* Closing main-viewport */}
      </div> {/* Closing dashboard-layout */}

      {/* Notifications Panel */}
      
      <Modal 
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
      />

      <AnalyticsModal 
        isOpen={!!analyticsMachine}
        onClose={() => setAnalyticsMachine(null)}
        machine={analyticsMachine}
        title={machineTitles[analyticsMachine]}
        history={machineHistory[analyticsMachine] || []}
        logs={notifications.filter(n => n.message.includes(machineTitles[analyticsMachine]) && n.type === 'control')}
        prefilledAction={prefilledAction}
        clearPrefilledAction={() => setPrefilledAction('')}
      />
    </div>
  );
}
