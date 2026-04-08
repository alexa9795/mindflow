import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setToken, User } from '../services/api';

const TOKEN_KEY = 'mindflow_jwt';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate auth state from secure store on cold start.
  // Uses /api/auth/me to get the full user object — avoids trusting client-side JWT decoding.
  // If /me fails for any reason (expired token, network, 401): clear stored token and stay logged out.
  useEffect(() => {
    void (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
          setToken(token);
          try {
            const user = await api.getMe();
            setCurrentUser(user);
          } catch {
            // Token is stale, revoked, or network is unavailable — do not leave in a
            // half-authenticated state.
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            setToken(null);
          }
        }
      } catch {
        // SecureStore unavailable (e.g. simulator without biometrics) — stay logged out
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
    setToken(res.token);
    setCurrentUser(res.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await api.register(email, password, name);
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
    setToken(res.token);
    setCurrentUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setCurrentUser(null);
  }, []);

  const updateUser = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);

  return React.createElement(
    AuthContext.Provider,
    { value: { isAuthenticated: currentUser !== null, isLoading, currentUser, login, register, logout, updateUser } },
    children,
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

