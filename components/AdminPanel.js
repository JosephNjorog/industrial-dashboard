import { useState, useEffect } from 'react';

export default function AdminPanel({ addNotification }) {
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!newUsername || !newPasscode) {
      setError('Username and passcode required');
      return;
    }

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
        addNotification(`User ${newUsername} created`, 'success');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleGrantControl = async (username) => {
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
        
        // If the admin is granting control to themselves, update local storage
        if (username === localStorage.getItem('username')) {
          localStorage.setItem('canOperate', 'true');
          // We could force reload or rely on a polling mechanism, but for now just reload
          window.location.reload();
        } else if (localStorage.getItem('canOperate') === 'true') {
          // If admin had control and gave it away
          localStorage.setItem('canOperate', 'false');
          window.location.reload();
        }
      } else {
        addNotification(data.error, 'error');
      }
    } catch (err) {
      addNotification('Network error', 'error');
    }
  };

  return (
    <div style={{ padding: '24px', background: 'var(--surface-soft)', borderRadius: '12px' }}>
      <h2 style={{ margin: '0 0 20px', color: 'var(--accent)' }}>User & Access Management</h2>
      
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div className="glass-panel" style={{ flex: 1, minWidth: '300px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ marginTop: 0 }}>Registered Users ({users.length}/4)</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {users.map(u => (
              <div key={u.username} style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                padding: '12px', background: 'var(--background)', borderRadius: '8px',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{u.username}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Role: {u.role.toUpperCase()}</div>
                </div>
                <div>
                  {u.can_operate ? (
                    <span style={{ 
                      padding: '4px 8px', background: 'rgba(0,255,136,0.2)', color: 'var(--success)', 
                      borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' 
                    }}>
                      ACTIVE OPERATOR
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleGrantControl(u.username)}
                      style={{
                        padding: '6px 12px', background: 'transparent', border: '1px solid var(--accent)',
                        color: 'var(--accent)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
                      }}
                    >
                      GRANT CONTROL
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ flex: 1, minWidth: '300px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ marginTop: 0 }}>Add New Operator</h3>
          
          {error && <div style={{ color: 'var(--danger)', marginBottom: '12px', fontSize: '0.9rem' }}>{error}</div>}
          
          <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Username" 
              value={newUsername} 
              onChange={e => setNewUsername(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
            />
            <input 
              type="password" 
              placeholder="Passcode" 
              value={newPasscode} 
              onChange={e => setNewPasscode(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
            />
            <button 
              type="submit" 
              disabled={users.length >= 4}
              style={{
                padding: '10px', background: users.length >= 4 ? 'var(--text-muted)' : 'var(--accent)',
                border: 'none', borderRadius: '6px', color: '#000', fontWeight: 'bold', cursor: users.length >= 4 ? 'not-allowed' : 'pointer'
              }}
            >
              CREATE USER
            </button>
            {users.length >= 4 && <div style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>Maximum of 4 users reached.</div>}
          </form>
        </div>
      </div>
    </div>
  );
}
