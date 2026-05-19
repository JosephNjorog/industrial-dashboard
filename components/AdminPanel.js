import { useState, useEffect } from 'react';

export default function AdminPanel({ addNotification }) {
  const [users, setUsers] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [error, setError] = useState('');
  
  const [processingAdd, setProcessingAdd] = useState(false);
  const [processingUser, setProcessingUser] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

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
              padding: '16px', background: 'var(--background)', borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '50%', background: u.role === 'admin' ? 'var(--accent)' : 'var(--badge-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem',
                  color: u.role === 'admin' ? '#000' : 'var(--foreground)'
                }}>
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{u.username}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{u.role}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              <form onSubmit={handleAddUser} style={{ display: 'flex', gap: '12px', flex: 1, alignItems: 'center' }}>
                <input 
                  type="text" placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} autoFocus
                  disabled={processingAdd}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-soft)', color: 'var(--foreground)', flex: 1 }}
                />
                <input 
                  type="password" placeholder="Passcode" value={newPasscode} onChange={e => setNewPasscode(e.target.value)}
                  disabled={processingAdd}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-soft)', color: 'var(--foreground)', flex: 1 }}
                />
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
    </div>
  );
}
