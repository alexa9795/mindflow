import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setToken, setRefreshToken, setUnauthorizedHandler, User } from '../services/api';

const TOKEN_KEY = 'echo_jwt';
const REFRESH_TOKEN_KEY = 'echo_refresh_jwt';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  currentUser: User | null;
  profileWarning: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  toggleAI: (enabled: boolean) => Promise<void>;
  isSubscriptionLimitReached: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileWarning, setProfileWarning] = useState<string | null>(null);

  const doLogout = useCallback(async () => {
    await Promise.allSettled([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
    setToken(null);
    setRefreshToken(null);
    setCurrentUser(null);
    setProfileWarning(null);
  }, []);

  // Register global 401 handler — called when refresh also fails.
  useEffect(() => {
    setUnauthorizedHandler(() => void doLogout());
  }, [doLogout]);

  // Rehydrate auth state from secure store on cold start.
  // Uses /api/auth/me to get the full user object — avoids trusting client-side JWT decoding.
  // If /me fails for any reason (expired token, network, 401): clear stored tokens and stay logged out.
  useEffect(() => {
    void (async () => {
      try {
        const [token, rToken] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
        ]);
        if (token) {
          setToken(token);
          if (rToken) setRefreshToken(rToken);
          try {
            const user = await api.getMe();
            setCurrentUser(user);
          } catch {
            // Token is stale, revoked, or network is unavailable — do not leave in a
            // half-authenticated state.
            await doLogout();
          }
        }
      } catch {
        // SecureStore unavailable (e.g. simulator without biometrics) — stay logged out
      } finally {
        setIsLoading(false);
      }
    })();
  }, [doLogout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    await Promise.allSettled([
      SecureStore.setItemAsync(TOKEN_KEY, res.access_token),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, res.refresh_token),
    ]);
    setToken(res.access_token);
    setRefreshToken(res.refresh_token);
    // Fetch full user profile (includes subscription and ai_enabled).
    try {
      const user = await api.getMe();
      setCurrentUser(user);
      setProfileWarning(null);
    } catch {
      // Fallback to auth response user — missing subscription/ai_enabled fields.
      // Show a non-blocking warning so the user knows some features may be limited.
      setCurrentUser({ ...res.user, ai_enabled: false });
      setProfileWarning('Could not load full profile. Some features may be limited.');
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await api.register(email, password, name);
    await Promise.allSettled([
      SecureStore.setItemAsync(TOKEN_KEY, res.access_token),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, res.refresh_token),
    ]);
    setToken(res.access_token);
    setRefreshToken(res.refresh_token);
    // Fetch full user profile (includes subscription and ai_enabled).
    try {
      const user = await api.getMe();
      setCurrentUser(user);
      setProfileWarning(null);
    } catch {
      setCurrentUser({ ...res.user, ai_enabled: false });
      setProfileWarning('Could not load full profile. Some features may be limited.');
    }
  }, []);

  const logout = useCallback(async () => {
    await doLogout();
  }, [doLogout]);

  const updateUser = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);

  const toggleAI = useCallback(async (enabled: boolean) => {
    await api.toggleAI(enabled);
    setCurrentUser((prev) => (prev ? { ...prev, ai_enabled: enabled } : prev));
  }, []);

  const isSubscriptionLimitReached = useCallback((): boolean => {
    const sub = currentUser?.subscription;
    if (!sub) return false;
    return sub.limit !== -1 && sub.entries_used >= sub.limit;
  }, [currentUser]);

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        isAuthenticated: currentUser !== null,
        isLoading,
        currentUser,
        profileWarning,
        login,
        register,
        logout,
        updateUser,
        toggleAI,
        isSubscriptionLimitReached,
      },
    },
    children,
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
