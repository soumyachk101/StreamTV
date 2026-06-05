'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, saveAuth } from '@/lib/services';
import { clearAuth, getStoredUser, getToken, setStoredUser } from '@/lib/api';
import { User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const { user: freshUser } = await authApi.getMe();
      setUser(freshUser);
      setStoredUser(freshUser);
    } catch {
      clearAuth();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = getStoredUser<User>();
    if (cached) setUser(cached);
    refresh();
  }, [refresh]);

  const login = useCallback((token: string, newUser: User) => {
    saveAuth(token, newUser);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if request fails, clear local state
    }
    clearAuth();
    setUser(null);
  }, []);

  const updateUser = useCallback((newUser: User) => {
    setUser(newUser);
    setStoredUser(newUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refresh,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
