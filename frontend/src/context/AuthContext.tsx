import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/authApi';
import { api } from '../services/api';
import { DEMO_USER } from '../services/demoData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isBackendOnline: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsDemo: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(
    () => localStorage.getItem('documind_demo_mode') === 'true'
  );
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Background non-blocking health check
  const checkBackendHealth = async () => {
    try {
      await api.get('/health', { timeout: 3000 });
      setIsBackendOnline(true);
    } catch (_) {
      setIsBackendOnline(false);
    }
  };

  const refreshUser = async () => {
    // 1. Check Demo Mode Flag
    const isDemo = localStorage.getItem('documind_demo_mode') === 'true';
    if (isDemo) {
      setUser(DEMO_USER);
      setIsDemoMode(true);
      setIsLoading(false);
      checkBackendHealth();
      return;
    }

    // 2. Check JWT Token for Real Auth
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      setIsDemoMode(false);
      setIsLoading(false);
      checkBackendHealth();
      return;
    }

    try {
      const u = await authApi.getMe();
      setUser(u);
      setIsDemoMode(false);
      setIsBackendOnline(true);
    } catch (e) {
      setUser(null);
      setIsDemoMode(false);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      checkBackendHealth();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password });
      localStorage.removeItem('documind_demo_mode');
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('refresh_token', res.refresh_token);
      setUser(res.user);
      setIsDemoMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.register({ name, email, password });
      localStorage.removeItem('documind_demo_mode');
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('refresh_token', res.refresh_token);
      setUser(res.user);
      setIsDemoMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (!isDemoMode) {
        await authApi.logout();
      }
    } catch (e) {
      console.error('Logout request error:', e);
    } finally {
      localStorage.removeItem('documind_demo_mode');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setIsDemoMode(false);
      setIsLoading(false);
    }
  };

  const loginAsDemo = async () => {
    setIsLoading(true);
    try {
      // Pure local demo session initialization - ZERO backend network calls
      localStorage.setItem('documind_demo_mode', 'true');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(DEMO_USER);
      setIsDemoMode(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isDemoMode,
        isBackendOnline,
        isLoading,
        login,
        loginAsDemo,
        register,
        logout,
        refreshUser,
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
