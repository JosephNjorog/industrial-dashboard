import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import LogoIcon from '../components/LogoIcon';

export default function Login() {
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const user = localStorage.getItem('username');
    if (user) {
      router.push('/');
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !passcode.trim()) {
      setError('Username and passcode are required');
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), passcode })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('username', data.username);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('canOperate', data.can_operate ? 'true' : 'false');
        router.push('/');
      } else {
        setError(data.error || 'Authentication failed');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--background)',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        padding: '32px 24px',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <LogoIcon size={64} color="var(--accent)" />
          <h1 style={{ marginTop: '16px', fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)' }}>
            System Login
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Enter your credentials to access controls
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 45, 85, 0.1)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '10px 16px',
            borderRadius: '8px',
            width: '100%',
            marginBottom: '16px',
            fontSize: '0.85rem',
            textAlign: 'center',
            fontWeight: 600
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>OPERATOR ID (USERNAME)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. John Doe"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--surface-soft)',
                color: 'var(--foreground)',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>SECURITY PASSCODE</label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="••••"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--surface-soft)',
                color: 'var(--foreground)',
                fontSize: '1.2rem',
                letterSpacing: '4px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              background: isLoading ? 'var(--text-muted)' : 'var(--accent)',
              color: '#000',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: isLoading ? 'wait' : 'pointer',
              boxShadow: isLoading ? 'none' : '0 4px 12px var(--accent-glow)',
              transition: 'transform 0.1s ease, box-shadow 0.2s ease',
              animation: isLoading ? 'pulse 1.5s infinite' : 'none'
            }}
            onMouseOver={(e) => !isLoading && (e.target.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => !isLoading && (e.target.style.transform = 'translateY(0)')}
            onMouseDown={(e) => !isLoading && (e.target.style.transform = 'translateY(1px)')}
          >
            {isLoading ? 'AUTHENTICATING...' : 'ACCESS COMMAND CENTER'}
          </button>
        </form>
      </div>
    </div>
  );
}
