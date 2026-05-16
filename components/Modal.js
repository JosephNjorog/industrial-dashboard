import React, { useEffect, useState } from 'react';

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px',
  },
  content: {
    width: '100%',
    maxWidth: '420px',
    borderRadius: '20px',
    padding: '24px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
  },
  title: {
    margin: '0 0 12px',
    fontSize: '1.5rem',
    color: 'var(--accent)',
    fontWeight: 700,
  },
  message: {
    margin: '0 0 24px',
    fontSize: '1.05rem',
    color: 'var(--foreground)',
    lineHeight: 1.6,
    opacity: 1,
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  btn: {
    padding: '10px 24px',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  },
  cancelBtn: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--foreground)',
    border: '1px solid var(--border)',
  },
  confirmBtn: {
    background: 'var(--accent)',
    color: 'var(--background)',
    flex: 1,
  }
};

const Modal = ({ isOpen, title, message, onConfirm, onCancel, type = 'alert' }) => {
  const [show, setShow] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setShow(true), 0);
    } else {
      const timer = setTimeout(() => setShow(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !show) return null;

  return (
    <div 
      style={{
        ...modalStyles.overlay,
        opacity: isOpen ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && type === 'alert') onConfirm();
      }}
    >
      <div 
        className="glass-panel" 
        style={{
          ...modalStyles.content,
          transform: isOpen ? 'scale(1)' : 'scale(0.9)',
          opacity: isOpen ? 1 : 0,
          transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <h2 style={modalStyles.title}>{title}</h2>
        <p style={modalStyles.message}>{message}</p>
        
        {type === 'prompt' && (
          <div style={{ marginBottom: '24px' }}>
            <input 
              type="password"
              placeholder="Enter passcode"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'rgba(0,0,0,0.2)',
                color: '#fff',
                fontSize: '1rem',
                textAlign: 'center',
                letterSpacing: '0.5em'
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirm(inputValue);
              }}
            />
          </div>
        )}

        <div style={modalStyles.actions}>
          {type === 'confirm' && (
            <button 
              style={{ ...modalStyles.btn, ...modalStyles.cancelBtn }} 
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          <button 
            style={{ ...modalStyles.btn, ...modalStyles.confirmBtn }} 
            onClick={() => onConfirm(inputValue)}
            autoFocus={type !== 'prompt'}
          >
            {type === 'confirm' ? 'Proceed' : type === 'prompt' ? 'Unlock' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
