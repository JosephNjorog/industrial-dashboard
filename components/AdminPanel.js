import { useState, useEffect } from 'react';

export default function AdminPanel({ addNotification }) {
  const [users, setUsers] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [error, setError] = useState('');
  
  const [processingAdd, setProcessingAdd] = useState(false);
  const [processingUser, setProcessingUser] = useState(null);

  // Settings states
  const [pumpTemp, setPumpTemp] = useState(80);
  const [pumpVib, setPumpVib] = useState(5);
  const [motorTemp, setMotorTemp] = useState(90);
  const [motorVib, setMotorVib] = useState(8);
  const [fanTemp, setFanTemp] = useState(60);
  const [fanVib, setFanVib] = useState(3);
  const [maintInterval, setMaintInterval] = useState(3000);
  
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Restore defaults state
  const [isResettingDefaults, setIsResettingDefaults] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.thresholds) {
          setPumpTemp(data.thresholds.pump?.temp ?? 80);
          setPumpVib(data.thresholds.pump?.vibration ?? 5);
          setMotorTemp(data.thresholds.motor?.temp ?? 90);
          setMotorVib(data.thresholds.motor?.vibration ?? 8);
          setFanTemp(data.thresholds.fan?.temp ?? 60);
          setFanVib(data.thresholds.fan?.vibration ?? 3);
        }
        setMaintInterval(data.maintenanceInterval ?? 3000);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => { 
    fetchUsers(); 
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccess('');
    setSettingsError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thresholds: {
            pump: { temp: Number(pumpTemp), vibration: Number(pumpVib) },
            motor: { temp: Number(motorTemp), vibration: Number(motorVib) },
            fan: { temp: Number(fanTemp), vibration: Number(fanVib) }
          },
          maintenanceInterval: Number(maintInterval)
        })
      });
      if (res.ok) {
        setSettingsSuccess('Configuration updated successfully in database!');
        addNotification('System thresholds updated in database', 'success');
      } else {
        const data = await res.json();
        setSettingsError(data.error || 'Failed to update settings');
      }
    } catch (err) {
      setSettingsError('Network error');
    }
    setIsSavingSettings(false);
  };

  const handleRestoreDefaults = async () => {
    if (resetConfirmText !== 'RESET') return;
    setIsResettingDefaults(true);
    try {
      const res = await fetch('/api/reset-defaults', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        addNotification('Database restored to factory defaults', 'success');
        // Refresh settings form
        await fetchSettings();
        await fetchUsers();
        setShowResetConfirm(false);
        setResetConfirmText('');
        // Force re-login since users were wiped
        setTimeout(() => {
          localStorage.clear();
          window.location.reload();
        }, 1500);
      } else {
        addNotification(data.error || 'Reset failed', 'error');
      }
    } catch {
      addNotification('Network error during reset', 'error');
    }
    setIsResettingDefaults(false);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    if (!newUsername || !newPasscode) {
      setError('Username and passcode required');
      return;
    }
    setProcessingAdd(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, passcode: newPasscode, role: 'operator' })
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
        setNewUsername('');
        setNewPasscode('');
        setIsAdding(false);
        addNotification(`Operator ${newUsername} added`, 'success');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Network error');
    }
    setProcessingAdd(false);
  };

  const handleRemoveUser = async (username) => {
    if (!confirm(`Are you sure you want to remove operator ${username}?`)) return;
    setProcessingUser(`remove-${username}`);
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
        addNotification(`Operator ${username} removed`, 'success');
      } else {
        addNotification(data.error, 'error');
      }
    } catch (err) {
      addNotification('Network error', 'error');
    }
    setProcessingUser(null);
  };

  const handleGrantControl = async (username) => {
    setProcessingUser(`grant-${username}`);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUser: username })
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
        addNotification(`Control granted to ${username}`, 'control');
        if (username === localStorage.getItem('username')) {
          localStorage.setItem('canOperate', 'true');
          window.location.reload();
        } else if (localStorage.getItem('canOperate') === 'true') {
          localStorage.setItem('canOperate', 'false');
          window.location.reload();
        }
      } else {
        addNotification(data.error, 'error');
      }
    } catch (err) {
      addNotification('Network error', 'error');
    }
    setProcessingUser(null);
  };

  return (
    <div style={{ padding: '24px', background: 'var(--surface-soft)', borderRadius: '12px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: 'var(--accent)' }}>Operator Access Management</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
          {users.length} / 5 USERS
        </span>
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', padding: '10px', background: 'rgba(255,0,85,0.1)', borderRadius: '8px', border: '1px solid var(--danger)' }}>{error}</div>}
      
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {users.map(u => (
            <div key={u.username} style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              flexWrap: 'wrap', gap: '12px',
              padding: '16px', background: 'var(--background)', borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '50%', background: u.role === 'admin' ? 'var(--accent)' : 'var(--badge-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem',
                  color: u.role === 'admin' ? '#000' : 'var(--foreground)',
                  flexShrink: 0
                }}>
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{u.username}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{u.role}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {u.can_operate ? (
                  <span style={{ 
                    padding: '6px 12px', background: 'rgba(0,255,136,0.1)', color: 'var(--success)', 
                    borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid var(--success)' 
                  }}>
                    ACTIVE OPERATOR
                  </span>
                ) : (
                  <button 
                    onClick={() => handleGrantControl(u.username)}
                    disabled={processingUser === `grant-${u.username}`}
                    style={{
                      padding: '6px 12px', background: 'transparent', border: '1px solid var(--accent)',
                      color: processingUser === `grant-${u.username}` ? 'var(--text-muted)' : 'var(--accent)', 
                      borderRadius: '6px', cursor: processingUser === `grant-${u.username}` ? 'wait' : 'pointer', 
                      fontSize: '0.8rem', fontWeight: 'bold',
                      animation: processingUser === `grant-${u.username}` ? 'pulse 1.5s infinite' : 'none'
                    }}
                  >
                    {processingUser === `grant-${u.username}` ? 'GRANTING...' : 'GRANT CONTROL'}
                  </button>
                )}
                
                {u.role !== 'admin' && (
                  <button 
                    onClick={() => handleRemoveUser(u.username)}
                    title="Remove Operator"
                    disabled={processingUser === `remove-${u.username}`}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,0,85,0.1)',
                      border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '1.2rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      cursor: processingUser === `remove-${u.username}` ? 'wait' : 'pointer',
                      animation: processingUser === `remove-${u.username}` ? 'pulse 1.5s infinite' : 'none'
                    }}
                  >
                    {processingUser === `remove-${u.username}` ? '⋯' : '−'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {isAdding ? (
            <div style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              padding: '16px', background: 'var(--background)', borderRadius: '8px',
              border: '1px dashed var(--accent)', gap: '16px'
            }}>
              <form onSubmit={handleAddUser} style={{ display: 'flex', gap: '12px', flex: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <input 
                  type="text" placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} autoFocus
                  disabled={processingAdd}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-soft)', color: 'var(--foreground)', flex: 1, minWidth: '120px' }}
                />
                <input 
                  type="password" placeholder="Passcode" value={newPasscode} onChange={e => setNewPasscode(e.target.value)}
                  disabled={processingAdd}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-soft)', color: 'var(--foreground)', flex: 1, minWidth: '120px' }}
                />
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button 
                    type="submit" title="Save Operator"
                    disabled={processingAdd}
                    style={{
                      width: '36px', height: '36px', borderRadius: '6px', background: processingAdd ? 'var(--text-muted)' : 'var(--success)',
                      border: 'none', color: '#000', fontSize: '1.2rem', fontWeight: 'bold', 
                      cursor: processingAdd ? 'wait' : 'pointer',
                      animation: processingAdd ? 'pulse 1.5s infinite' : 'none'
                    }}
                  >
                    {processingAdd ? '⋯' : '✓'}
                  </button>
                  <button 
                    type="button" onClick={() => setIsAdding(false)} title="Cancel"
                    disabled={processingAdd}
                    style={{
                      width: '36px', height: '36px', borderRadius: '6px', background: 'var(--badge-bg)',
                      border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '1.2rem', cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </form>
            </div>
          ) : (
            users.length < 5 && (
              <button 
                onClick={() => setIsAdding(true)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '16px', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '8px',
                  border: '1px dashed var(--accent)', color: 'var(--accent)', cursor: 'pointer',
                  fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>+</span> ADD NEW OPERATOR
              </button>
            )
          )}
        </div>
      </div>

      {/* Settings Panel Card */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
        <h3 style={{ margin: '0 0 16px', color: 'var(--accent)', fontSize: '1.1rem', textTransform: 'uppercase' }}>⚙️ System Alarm Thresholds & Configurations</h3>
        
        {settingsSuccess && <div style={{ color: 'var(--success)', marginBottom: '16px', padding: '10px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px', border: '1px solid var(--success)', fontSize: '0.85rem' }}>{settingsSuccess}</div>}
        {settingsError && <div style={{ color: 'var(--danger)', marginBottom: '16px', padding: '10px', background: 'rgba(255,0,85,0.1)', borderRadius: '8px', border: '1px solid var(--danger)', fontSize: '0.85rem' }}>{settingsError}</div>}
        
        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
            
            {/* Pump Group */}
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>PUMP LIMITS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  Temp Limit (°C):
                  <input 
                    type="number" value={pumpTemp} onChange={e => setPumpTemp(e.target.value)} 
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-soft)', color: 'var(--foreground)' }}
                    required
                  />
                </label>
                <label style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  Vibration Limit (g):
                  <input 
                    type="number" step="0.1" value={pumpVib} onChange={e => setPumpVib(e.target.value)} 
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-soft)', color: 'var(--foreground)' }}
                    required
                  />
                </label>
              </div>
            </div>

            {/* Motor Group */}
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>MOTOR LIMITS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  Temp Limit (°C):
                  <input 
                    type="number" value={motorTemp} onChange={e => setMotorTemp(e.target.value)} 
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-soft)', color: 'var(--foreground)' }}
                    required
                  />
                </label>
                <label style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  Vibration Limit (g):
                  <input 
                    type="number" step="0.1" value={motorVib} onChange={e => setMotorVib(e.target.value)} 
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-soft)', color: 'var(--foreground)' }}
                    required
                  />
                </label>
              </div>
            </div>

            {/* Fan Group */}
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>FAN LIMITS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  Temp Limit (°C):
                  <input 
                    type="number" value={fanTemp} onChange={e => setFanTemp(e.target.value)} 
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-soft)', color: 'var(--foreground)' }}
                    required
                  />
                </label>
                <label style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  Vibration Limit (g):
                  <input 
                    type="number" step="0.1" value={fanVib} onChange={e => setFanVib(e.target.value)} 
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-soft)', color: 'var(--foreground)' }}
                    required
                  />
                </label>
              </div>
            </div>

          </div>

          {/* Maintenance Group */}
          <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>GLOBAL MAINTENANCE PARAMETERS</div>
            <label style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '240px' }}>
              Maintenance Interval (Hours):
              <input 
                type="number" value={maintInterval} onChange={e => setMaintInterval(e.target.value)} 
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-soft)', color: 'var(--foreground)' }}
                required
              />
            </label>
          </div>

          <div style={{ textAlign: 'right' }}>
            <button 
              type="submit" disabled={isSavingSettings}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                background: isSavingSettings ? 'var(--text-muted)' : 'var(--accent)',
                color: '#000',
                fontWeight: 700,
                border: 'none',
                cursor: isSavingSettings ? 'wait' : 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {isSavingSettings ? 'SAVING CONFIG...' : 'SAVE CONFIGURATION'}
            </button>
          </div>

        </form>
      </div>

      {/* ── Danger Zone ─────────────────────────────────────────── */}
      <div style={{
        padding: '20px', borderRadius: '12px', marginTop: '24px',
        border: '1px solid var(--danger)', background: 'rgba(255,0,85,0.05)'
      }}>
        <h3 style={{ margin: '0 0 6px', color: 'var(--danger)', fontSize: '1.1rem', textTransform: 'uppercase' }}>⚠️ Danger Zone</h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <strong>Restore Defaults</strong> will reset all alarm thresholds, delete every operator account, and release all machine locks.
          The system will log out immediately after. This cannot be undone.
        </p>

        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            style={{
              padding: '10px 22px', borderRadius: '8px',
              background: 'transparent', border: '1px solid var(--danger)',
              color: 'var(--danger)', fontWeight: 700, fontSize: '0.88rem',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            RESTORE FACTORY DEFAULTS
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '360px' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--danger)', fontWeight: 'bold' }}>
              Type <code style={{ background: 'rgba(255,0,85,0.15)', padding: '2px 6px', borderRadius: '4px' }}>RESET</code> to confirm:
            </p>
            <input
              type="text"
              value={resetConfirmText}
              onChange={e => setResetConfirmText(e.target.value)}
              placeholder="Type RESET here"
              autoFocus
              style={{
                padding: '10px', borderRadius: '6px',
                border: '1px solid var(--danger)',
                background: 'var(--surface-soft)', color: 'var(--foreground)',
                letterSpacing: '0.08em', fontWeight: 'bold'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleRestoreDefaults}
                disabled={resetConfirmText !== 'RESET' || isResettingDefaults}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  background: resetConfirmText === 'RESET' && !isResettingDefaults ? 'var(--danger)' : 'rgba(255,0,85,0.3)',
                  border: 'none', color: '#fff', fontWeight: 700,
                  cursor: resetConfirmText === 'RESET' && !isResettingDefaults ? 'pointer' : 'not-allowed',
                  fontSize: '0.88rem', transition: 'all 0.2s'
                }}
              >
                {isResettingDefaults ? 'RESETTING...' : 'CONFIRM RESET'}
              </button>
              <button
                onClick={() => { setShowResetConfirm(false); setResetConfirmText(''); }}
                disabled={isResettingDefaults}
                style={{
                  padding: '10px 18px', borderRadius: '8px',
                  background: 'var(--badge-bg)', border: '1px solid var(--border)',
                  color: 'var(--foreground)', cursor: 'pointer', fontSize: '0.88rem'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
