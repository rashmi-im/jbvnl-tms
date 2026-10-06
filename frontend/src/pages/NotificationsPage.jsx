import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../services/api';
import { Bell, CheckCheck } from 'lucide-react';

export function NotificationsPage({ onSelectRecord }) {
  const { notifications, refreshNotifications } = useAuth();

  useEffect(() => {
    apiCall('notifications', 'POST').then(() => refreshNotifications());
  }, []);

  return (
    <div className="card">
      <div className="card-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={20} />
          <span>System Notifications</span>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
          No notifications found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className="clickable"
              onClick={() => n.failure_id && onSelectRecord(n.failure_id)}
              style={{
                padding: 14,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: n.is_read ? '#ffffff' : '#f0f9ff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: n.is_read ? 500 : 700, color: '#0f172a' }}>{n.msg}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>{n.created}</div>
              </div>
              {!n.is_read && (
                <span style={{ fontSize: '0.7rem', background: '#2563eb', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                  NEW
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
