import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('civictrack_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('civictrack_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify user on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('civictrack_token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          setUser(res.data.user);
          localStorage.setItem('civictrack_user', JSON.stringify(res.data.user));
        } catch (err) {
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            console.warn('Session expired or invalid:', err.message);
            logout();
          } else {
            console.warn('Network unreachable during auth check; preserving cached session.');
            const saved = localStorage.getItem('civictrack_user');
            if (saved) {
              try {
                setUser(JSON.parse(saved));
              } catch (e) {}
            }
          }
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login({ email, password });
    const { token: newToken, user: userData } = res.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('civictrack_token', newToken);
    localStorage.setItem('civictrack_user', JSON.stringify(userData));
    return userData;
  };

  const register = async (formData) => {
    const res = await authService.register(formData);
    // If backend returns immediate session (e.g. if verification was bypassed)
    if (res.data?.token && res.data?.user) {
      const { token: newToken, user: userData } = res.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('civictrack_token', newToken);
      localStorage.setItem('civictrack_user', JSON.stringify(userData));
    }
    return res.data;
  };

  const setAuthSession = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('civictrack_token', newToken);
    localStorage.setItem('civictrack_user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('civictrack_token');
      localStorage.removeItem('civictrack_user');
    }
  };

  const switchDemoRole = async (targetRole) => {
    setLoading(true);
    try {
      const res = await authService.demoLogin(targetRole);
      const { token: newToken, user: userData } = res.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('civictrack_token', newToken);
      localStorage.setItem('civictrack_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      console.error('Failed to switch demo role:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const isCitizen = user?.role === 'CITIZEN';
  const isWorker = user?.role === 'FIELD_WORKER';
  const isOfficer = user?.role === 'OFFICER';
  const isSupervisor = user?.role === 'SUPERVISOR';
  const isAdmin = user?.role === 'ADMIN';

  // Can manage operational workflows (assign, triage, verify)
  const canManage = ['OFFICER', 'SUPERVISOR', 'ADMIN'].includes(user?.role);
  // Can oversee escalations and audit logs
  const canOversee = ['SUPERVISOR', 'ADMIN'].includes(user?.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        setAuthSession,
        logout,
        switchDemoRole,
        isCitizen,
        isWorker,
        isOfficer,
        isSupervisor,
        isAdmin,
        canManage,
        canOversee
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
