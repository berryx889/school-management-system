import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('sms_user');
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback(async ({ username, password, portal }) => {
    const { data } = await api.post('/auth/login', { username, password, portal });
    localStorage.setItem('sms_token', data.token);
    localStorage.setItem('sms_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const loginWithOtp = useCallback(async (user, token) => {
    localStorage.setItem('sms_token', token);
    localStorage.setItem('sms_user', JSON.stringify(user));
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, loginWithOtp, logout }), [user, login, loginWithOtp, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
