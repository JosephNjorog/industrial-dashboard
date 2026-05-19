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
} from '../utils/helpers';
import HistoryTab from '../components/HistoryTab';
import AdminPanel from '../components/AdminPanel';

const machineTitles = {
  pump: 'Pump',
  motor: 'Motor',
  fan: 'Fan',
};

const pageStyles = {
  page: {
    minHeight: '100vh',
    padding: '4px 8px',
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

  const [analyticsMachine, setAnalyticsMachine] = useState(null);

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
    const notification = { id, message, type, timestamp };
    setNotifications(prev => [notification, ...prev].slice(0, 100)); // Keep last 100 in UI

    // Post to database in background
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification)
    }).catch(() => console.error('Failed to save log'));
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem('machineHistory', JSON.stringify(machineHistory));
  }, [machineHistory]);

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
    };

    const handleMessage = (topic, payload) => {
      // 1. Handle ESP32 Global Status
      if (topic === 'factory/status' || topic === 'factory/system/status') {
        setEspStatus(payload === 'ONLINE' ? 'ONLINE' : 'OFFLINE');
        if (payload === 'OFFLINE') setWifiSignal(null);
        return;
      }

      // 2. Handle Heartbeat
      if (topic === 'factory/system/heartbeat') {
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

      // 🛡️ Auto-Online Detection: If we get any data, the ESP must be ONLINE
      setEspStatus('ONLINE');

      // Reset the offline timeout. If no data arrives for 3 seconds, mark as OFFLINE
      if (telemetryTimeoutRef.current) clearTimeout(telemetryTimeoutRef.current);
      telemetryTimeoutRef.current = setTimeout(() => {
        setEspStatus('OFFLINE');
      }, 3000);

      try {
        // payload is already parsed by lib/mqtt.js, but handle string fallback just in case
        const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
        const normalized = normalizeMachineData(parsed);
        const time = new Date().toLocaleTimeString([], { hour12: false });

        setMachineStats((previousState) => {
          const prevMachine = previousState[machine];
          // Preserve current state if the new payload doesn't provide it
          const finalState = normalized.state !== undefined ? normalized.state : prevMachine.state;
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

          const isPendingResolved = prevMachine.pendingState && finalState === prevMachine.pendingState;

          return {
            ...previousState,
            [machine]: {
              ...prevMachine,
              ...normalized,
              state: finalState,
              maintenance_due: finalMaintDue,
              maintenanceProgress: finalMaintProgress,
              pendingCmdId: isPendingResolved ? null : prevMachine.pendingCmdId,
              pendingState: isPendingResolved ? null : prevMachine.pendingState,
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
    <div style={pageStyles.page}>
      <div style={pageStyles.container}>
        <header className="dashboard-header" style={pageStyles.header}>
          <div className="header-left">
            <LogoIcon size={32} color="var(--accent)" />
            <div>
              <h1 style={{ ...pageStyles.pageTitle, fontSize: '1.1rem', margin: 0 }}>Industrial Command Center</h1>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Factory Real-Time Monitoring</div>
            </div>
          </div>

          <div className="header-right">
            <div style={{ 
              ...pageStyles.statusBadge, 
              padding: '4px 10px', 
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
              fontSize: '0.7rem',
              backgroundColor: espStatus === 'ONLINE' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 45, 85, 0.1)',
              color: espStatus === 'ONLINE' ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${espStatus === 'ONLINE' ? 'var(--success)' : 'var(--danger)'}`
            }}>
              ESP32: {espStatus} {wifiSignal && `(${wifiSignal}dBm)`}
            </div>

            <DateTimeCard />
            
            {(userRole === 'admin' || canOperate) && (
              <button
                onClick={toggleLock}
                style={{
                  background: isLocked ? 'var(--danger)' : 'var(--success)',
                  border: 'none',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{isLocked ? '🔒' : '🔓'}</span>
              </button>
            )}
            <ThemeToggle />
            
            <div className="auth-panel">
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>{username}</span>
              <button
                onClick={() => {
                  localStorage.removeItem('username');
                  router.push('/login');
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--danger)',
                  color: 'var(--danger)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'var(--danger)';
                  e.target.style.color = '#fff';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = 'var(--danger)';
                }}
              >
                LOGOUT
              </button>
            </div>
          </div>
        </header>

        <div style={pageStyles.tabs}>
          <button
            style={{
              ...pageStyles.tabButton,
              ...(currentTab === 'dashboard' && pageStyles.tabButtonActive),
            }}
            onClick={() => setCurrentTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            style={{
              ...pageStyles.tabButton,
              ...(currentTab === 'insights' && pageStyles.tabButtonActive),
            }}
            onClick={() => setCurrentTab('insights')}
          >
            Insights
          </button>
          <button
            style={{
              ...pageStyles.tabButton,
              ...(currentTab === 'floorplan' && pageStyles.tabButtonActive),
            }}
            onClick={() => setCurrentTab('floorplan')}
          >
            Floor Plan
          </button>
          <button
            style={{
              ...pageStyles.tabButton,
              ...(currentTab === 'history' && pageStyles.tabButtonActive),
            }}
            onClick={() => setCurrentTab('history')}
          >
            History
          </button>
          <button
            style={{
              ...pageStyles.tabButton,
              ...(currentTab === 'logs' && pageStyles.tabButtonActive),
            }}
            onClick={() => setCurrentTab('logs')}
          >
            Logs
          </button>
          {userRole === 'admin' && (
            <button
              style={{
                ...pageStyles.tabButton,
                ...(currentTab === 'admin' && pageStyles.tabButtonActive),
              }}
              onClick={() => setCurrentTab('admin')}
            >
              Admin
            </button>
          )}
        </div>

        {currentTab === 'dashboard' && (
          <main style={{ padding: '16px', maxWidth: '1600px', margin: '0 auto' }}>
            {/* KPI Overview Section */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', 
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

        {currentTab === 'insights' && (
          <div style={pageStyles.insightsContainer}>
            <h2 style={{ margin: '0 0 20px', color: 'var(--accent)' }}>Machine Insights</h2>
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
            </div>
          </div>
        )}

        {currentTab === 'history' && (
          <HistoryTab logs={notifications} insights={insights} />
        )}

        {currentTab === 'floorplan' && (
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', overflow: 'hidden' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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

        {currentTab === 'admin' && userRole === 'admin' && (
          <AdminPanel addNotification={addNotification} />
        )}
      </div>

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
      />
    </div>
  );
}
