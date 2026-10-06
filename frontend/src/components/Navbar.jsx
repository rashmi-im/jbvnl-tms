import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Home, FileText, PlusCircle, Inbox, Bell, LogOut, BarChart2, Settings } from 'lucide-react';



export function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, unreadCount } = useAuth();

  if (!user) return null;

  const isJE = user.role === 'JE';
  const isAE = user.role === 'AE' || user.role === 'ADMIN';
  const isAdmin = user.role === 'ADMIN';

  // Get user initials for avatar
  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  return (
    <>
      {/* Official Government Top Bar */}
      <div className="gov-top-bar">
        <div className="gov-top-bar-left">
          <div className="gov-flag-badge">
            <span>🏛️</span>
            <span>झारखण्ड सरकार | Govt. of Jharkhand</span>
          </div>
          <span style={{ opacity: 0.4 }}>|</span>
          <span>Jharkhand Bijli Vitran Nigam Limited (JBVNL)</span>
        </div>
        <div>
          <span>Helpline: 1800-345-6570 / 1912</span>
        </div>
      </div>

      {/* Main Header Bar with JBVNL Logo */}
      <header className="header-bar">
        <div className="logo-area" onClick={() => setActiveTab('home')}>
          <img src="/jbvnl_logo.png" alt="JBVNL Logo" className="logo-img" />
          <div>
            <div className="logo-text-title">
              झारखण्ड बिजली वितरण निगम लिमिटेड
            </div>
            <div className="logo-text-sub">
              <span>JBVNL</span>
              <span style={{ opacity: 0.5 }}>•</span>
              <span>Transformer Failure & Replacement System (TFMS)</span>
            </div>
          </div>
        </div>

        <div className="user-badge">
          <div className="user-info-box">
            <div className="user-name">{user.name}</div>
            <div className="user-meta">ID: {user.emp_id}</div>
          </div>
          <div className="user-avatar-circle">
            {initials}
          </div>
          <span className="user-role-pill">{user.role}</span>
          <button className="btn btn-sec btn-sm" onClick={logout} style={{ marginLeft: 6 }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Sub Navigation Bar */}
      <div className="nav-bar-container">
        <nav className="nav-bar">
          <button
            className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <Home size={16} /> Home Dashboard
          </button>

          {isJE && (
            <button
              className={`nav-btn ${activeTab === 'new-failure' ? 'active' : ''}`}
              onClick={() => setActiveTab('new-failure')}
            >
              <PlusCircle size={16} /> Report Failure
            </button>
          )}

          {isAE && (
            <button
              className={`nav-btn ${activeTab === 'inbox' ? 'active' : ''}`}
              onClick={() => setActiveTab('inbox')}
            >
              <Inbox size={16} /> Approval Inbox
            </button>
          )}

          <button
            className={`nav-btn ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => setActiveTab('records')}
          >
            <FileText size={16} /> Failure Records
          </button>

          <button
            className={`nav-btn ${activeTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily')}
          >
            <BarChart2 size={16} /> Daily Report
          </button>

          {isAdmin && (
            <button
              className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <Settings size={16} /> Admin Console
            </button>
          )}

          <button
            className={`nav-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={16} /> Notifications
            {unreadCount > 0 && (
              <span
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: '0.7rem',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontWeight: 800,
                  marginLeft: 4
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </>
  );
}
