import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FailuresPage } from './pages/FailuresPage';
import { FailureFormPage } from './pages/FailureFormPage';
import { FailureDetailPage } from './pages/FailureDetailPage';
import { DailyReportPage } from './pages/DailyReportPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AdminPage } from './pages/AdminPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedFailureId, setSelectedFailureId] = useState(null);
  const [editFailureId, setEditFailureId] = useState(null);
  const [failuresFilterParams, setFailuresFilterParams] = useState({});

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#091e42', color: '#ffffff' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/jbvnl_logo.png" alt="JBVNL" style={{ width: 64, height: 64, borderRadius: '50%', marginBottom: 16 }} />
          <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>झारखण्ड बिजली वितरण निगम लिमिटेड</div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>Loading JBVNL Portal...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const navigateToTab = (tab, params = {}) => {
    setFailuresFilterParams(params);
    setSelectedFailureId(null);
    setEditFailureId(null);
    setActiveTab(tab);
  };

  const handleSelectRecord = (id) => {
    setSelectedFailureId(id);
    setActiveTab('detail');
  };

  const handleEditRecord = (id) => {
    setEditFailureId(id);
    setActiveTab('edit-failure');
  };

  const handleFormSuccess = (id) => {
    setSelectedFailureId(id);
    setActiveTab('detail');
  };

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} setActiveTab={navigateToTab} />
      <main className="main-content">
        {activeTab === 'home' && <DashboardPage onNavigate={navigateToTab} />}
        {activeTab === 'records' && (
          <FailuresPage initialParams={failuresFilterParams} onSelectRecord={handleSelectRecord} />
        )}
        {activeTab === 'inbox' && (
          <FailuresPage initialParams={{ inbox: true }} onSelectRecord={handleSelectRecord} />
        )}
        {activeTab === 'new-failure' && (
          <FailureFormPage
            onCancel={() => setActiveTab('home')}
            onSuccess={handleFormSuccess}
          />
        )}
        {activeTab === 'edit-failure' && (
          <FailureFormPage
            failureId={editFailureId}
            onCancel={() => setActiveTab('detail')}
            onSuccess={handleFormSuccess}
          />
        )}
        {activeTab === 'detail' && selectedFailureId && (
          <FailureDetailPage
            failureId={selectedFailureId}
            onBack={() => setActiveTab('records')}
            onEdit={handleEditRecord}
          />
        )}
        {activeTab === 'daily' && <DailyReportPage />}
        {activeTab === 'admin' && <AdminPage />}
        {activeTab === 'notifications' && <NotificationsPage onSelectRecord={handleSelectRecord} />}
      </main>

      {/* Official JBVNL Footer */}
      <footer className="footer-bar">
        <div className="footer-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/jbvnl_logo.png" alt="JBVNL" style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff', padding: 2 }} />
            <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Jharkhand Bijli Vitran Nigam Limited (JBVNL)</span>
          </div>
          <div>
            © 2026 Government of Jharkhand. All Rights Reserved.
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Toll Free Helpline: 1800-345-6570 | Electricity Complaint: 1912
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
