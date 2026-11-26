import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getStoredToken, setStoredToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(Boolean(getStoredToken()));
  const [sessionNotice, setSessionNotice] = useState('');

  const applySession = useCallback((data) => {
    if (data.token) {
      setStoredToken(data.token);
      setToken(data.token);
    }
    setSessionNotice('');
    setUser(data.user);
    setProfile(data.profile);
    setMetrics(data.metrics);
  }, []);

  const logout = useCallback(() => {
    setStoredToken('');
    setToken('');
    setUser(null);
    setProfile(null);
    setMetrics(null);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      if (getStoredToken()) {
        setSessionNotice('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
        logout();
      }
    };
    window.addEventListener('nk:unauthorized', onUnauthorized);
    return () => window.removeEventListener('nk:unauthorized', onUnauthorized);
  }, [logout]);

  const refreshProfile = useCallback(async () => {
    if (!getStoredToken()) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getProfile();
      applySession(data);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [applySession, logout]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    applySession(data);
    return data;
  };

  const register = async (email, password, displayName) => {
    const data = await api.register({ email, password, displayName });
    applySession(data);
    return data;
  };

  const updateProfile = async (payload) => {
    const data = await api.updateProfile(payload);
    applySession(data);
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        profile,
        metrics,
        loading,
        sessionNotice,
        clearSessionNotice: () => setSessionNotice(''),
        isAuthenticated: Boolean(token && user),
        login,
        register,
        updateProfile,
        refreshProfile,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
