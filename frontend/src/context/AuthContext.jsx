import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiCall } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [masterData, setMasterData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const u = await apiCall('me');
      setUser(u);
      const m = await apiCall('master');
      setMasterData(m);
      const n = await apiCall('notifications');
      setNotifications(n);
    } catch (err) {
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
    await apiCall('login', 'POST', { emp_id, password });
    await fetchUser();
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
