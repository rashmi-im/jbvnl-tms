import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, UserCheck, ShieldCheck, Zap, Lock, Building2 } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(empId, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (id, pwd = 'ChangeMe@123') => {
    setError('');
    setLoading(true);
    try {
      await login(id, pwd);
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 20%, #0f274c 0%, #05142e 100%)',
        padding: 24,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Decorative Blur Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '20%',
          width: 350,
          height: 350,
          background: 'rgba(0, 82, 204, 0.15)',
          filter: 'blur(90px)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '20%',
          width: 400,
          height: 400,
          background: 'rgba(245, 158, 11, 0.12)',
          filter: 'blur(100px)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}
      />

      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 20,
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          padding: 32,
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* JBVNL Header Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ marginBottom: 12 }}>
            <img
              src="/jbvnl_logo.png"
              alt="JBVNL Logo"
              style={{
                width: 84,
                height: 84,
                objectFit: 'contain',
                background: '#ffffff',
                borderRadius: '50%',
                padding: 4,
                boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
                border: '3px solid #f59e0b',
                display: 'inline-block'
              }}
            />
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#d97706',
              textTransform: 'uppercase',
              marginBottom: 4
            }}
          >
            झारखण्ड सरकार | GOVT. OF JHARKHAND
          </div>

          <h1
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: '#091e42',
              lineHeight: 1.25,
              fontFamily: "'Outfit', sans-serif"
            }}
          >
            झारखण्ड बिजली वितरण निगम लिमिटेड
          </h1>
          <h2 style={{ fontSize: '0.925rem', fontWeight: 700, color: '#0052cc', marginTop: 2 }}>
            Jharkhand Bijli Vitran Nigam Limited
          </h2>

          <div
            style={{
              display: 'inline-block',
              marginTop: 10,
              padding: '4px 14px',
              background: '#e6effc',
              borderRadius: 20,
              fontSize: '0.775rem',
              fontWeight: 700,
              color: '#0052cc'
            }}
          >
            Transformer Failure & Replacement Portal
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label required">Employee ID / User ID</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                placeholder="Enter Employee ID (e.g. je1, ae1, admin)"
                required
                style={{ paddingLeft: 40 }}
              />
              <Building2
                size={18}
                color="#64748b"
                style={{ position: 'absolute', left: 14, top: 12 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ paddingLeft: 40 }}
              />
              <Lock
                size={18}
                color="#64748b"
                style={{ position: 'absolute', left: 14, top: 12 }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn"
            style={{
              width: '100%',
              padding: '12px 20px',
              fontSize: '0.975rem',
              fontWeight: 700,
              marginTop: 8,
              borderRadius: 10
            }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        {/* Quick Demo Sign-in switcher */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
          <div
            style={{
              fontSize: '0.725rem',
              fontWeight: 800,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 12,
              textAlign: 'center'
            }}
          >
            Quick Officer Sign-In
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="btn btn-sec btn-sm" onClick={() => demoLogin('je1')}>
              <UserCheck size={14} color="#0052cc" /> JE Sahibganj
            </button>
            <button className="btn btn-sec btn-sm" onClick={() => demoLogin('ae1')}>
              <ShieldCheck size={14} color="#059669" /> AE Sahibganj
            </button>
            <button className="btn btn-sec btn-sm" onClick={() => demoLogin('div1')}>
              Division Officer
            </button>
            <button className="btn btn-sec btn-sm" onClick={() => demoLogin('admin')}>
              System Admin
            </button>
          </div>
        </div>
      </div>

      {/* Official Footer Banner */}
      <div style={{ marginTop: 24, textAlign: 'center', color: '#94a3b8', fontSize: '0.775rem', zIndex: 2 }}>
        <div>© 2026 Jharkhand Bijli Vitran Nigam Limited (JBVNL). All Rights Reserved.</div>
        <div style={{ marginTop: 4, opacity: 0.8 }}>Authorized Personnel & Officer Portal</div>
      </div>
    </div>
  );
}
