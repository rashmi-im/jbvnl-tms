import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiCall } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [masterData, setMasterData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const token = localStorage.getItem('tms_token');
    if (!token) {
      setUser(null);
      setMasterData(null);
      setLoading(false);
      return;
    }

    try {
      const [u, m, n] = await Promise.all([
        apiCall('me'),
        apiCall('master'),
        apiCall('notifications').catch(() => [])
      ]);
      setUser(u);
      setMasterData(m);
      setNotifications(n || []);
    } catch (err) {
      localStorage.removeItem('tms_token');
      setUser(null);
      setMasterData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (emp_id, password) => {
    const data = await apiCall('login', 'POST', { emp_id, password });
    if (data && data.user) {
      setUser(data.user);
    }
    // Fetch master and notifications concurrently in parallel
    try {
      const [m, n] = await Promise.all([
        apiCall('master'),
        apiCall('notifications').catch(() => [])
      ]);
      setMasterData(m);
      setNotifications(n || []);
    } catch (err) {
      console.error(err);
    }
  };

  const logout = async () => {
    try {
      await apiCall('logout', 'POST');
    } catch (e) {
      // Ignore
    }
    localStorage.removeItem('tms_token');
    setUser(null);
    setMasterData(null);
  };

  const refreshNotifications = async () => {
    if (user) {
      try {
        const n = await apiCall('notifications');
        setNotifications(n);
      } catch (e) {}
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        masterData,
        notifications,
        unreadCount,
        loading,
        login,
        logout,
        fetchUser,
        refreshNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
