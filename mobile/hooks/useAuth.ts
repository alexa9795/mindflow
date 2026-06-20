import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { api, setToken, setRefreshToken, setUnauthorizedHandler, setTokensRefreshedHandler, User } from '../services/api';

const TOKEN_KEY = 'echo_jwt';
const REFRESH_TOKEN_KEY = 'echo_refresh_jwt';
export const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  currentUser: User | null;
  profileWarning: string | null;
  /** True right after a successful sign-up, until the welcome screen is dismissed. */
  justRegistered: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, consentToStorage: boolean, acceptTerms: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  toggleAI: (enabled: boolean) => Promise<void>;
  isSubscriptionLimitReached: () => boolean;
  clearJustRegistered: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileWarning, setProfileWarning] = useState<string | null>(null);
  const [justRegistered, setJustRegistered] = useState(false);

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

  // Persist rotated tokens to SecureStore so they survive app restarts.
  useEffect(() => {
    setTokensRefreshedHandler((tokens) => {
      void SecureStore.setItemAsync(TOKEN_KEY, tokens.access_token);
      void SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);
    });
  }, []);

  // Rehydrate auth state from secure store on cold start.
  //
  // Happy path (biometric):
  //   1. No valid access token found (expired/missing).
  //   2. biometric_enabled=true and a refresh token exist in SecureStore.
  //   3. Face ID prompt shown — user authenticates.
  //   4. Stored refresh token used to obtain new access tokens silently.
  //   5. /me called → user logged in, login screen never shown.
  //
  // Fallback paths:
  //   - Face ID cancelled / failed → fall through to login screen (currentUser stays null).
  //   - Refresh token expired (>7 days) → refresh API call fails → doLogout → login screen.
  //   - No refresh token → skip biometric, go straight to login screen.
  //   - Biometric not available / not enrolled → skip biometric, go straight to login screen.
  //
  // Uses /api/auth/me to get the full user object — avoids trusting client-side JWT decoding.
  useEffect(() => {
    void (async () => {
      try {
        const [token, rToken] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
        ]);

        if (token) {
          // Access token present — try to use it directly.
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
          return;
        }

        // No access token — check if biometric login can silently restore the session.
        // Requirement: biometric flag set AND a refresh token stored to exchange.
        const [biometricEnabled, storedRefreshToken] = await Promise.all([
          SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY),
          SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
        ]);

        if (biometricEnabled === 'true' && storedRefreshToken) {
          const [hasHardware, isEnrolled] = await Promise.all([
            LocalAuthentication.hasHardwareAsync(),
            LocalAuthentication.isEnrolledAsync(),
          ]);

          if (hasHardware && isEnrolled) {
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Sign in to MindFlow',
              fallbackLabel: 'Use password',
              cancelLabel: 'Cancel',
            });

            if (result.success) {
              // Biometric passed — exchange the stored refresh token for new tokens.
              setRefreshToken(storedRefreshToken);
              try {
                const tokens = await api.refresh(storedRefreshToken);
                await Promise.allSettled([
                  SecureStore.setItemAsync(TOKEN_KEY, tokens.access_token),
                  SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token),
                ]);
                setToken(tokens.access_token);
                setRefreshToken(tokens.refresh_token);
                const user = await api.getMe();
                setCurrentUser(user);
              } catch {
                // Refresh token expired or network error — clear state and show login screen.
                await doLogout();
              }
            }
            // result.success === false: cancelled or failed → fall through, currentUser stays
            // null, router will show login screen naturally.
          }
        }
      } catch {
        // SecureStore unavailable (e.g. simulator without biometrics) — stay logged out.
      } finally {
        setIsLoading(false);
      }
    })();
  }, [doLogout]);

  // Offer biometric enrolment once after a successful credential-based login/register.
  // Only shown if hardware is available and the flag hasn't been set yet (either direction).
  const offerBiometricEnrolment = useCallback(async () => {
    const [hasHardware, isEnrolled, alreadySet] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY),
    ]);
    if (!hasHardware || !isEnrolled || alreadySet !== null) return;

    Alert.alert(
      'Use Face ID?',
      'Sign in faster next time using Face ID.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Enable',
          onPress: () => void SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true'),
        },
      ],
    );
  }, []);

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
    void offerBiometricEnrolment();
  }, [offerBiometricEnrolment]);

  const register = useCallback(async (email: string, password: string, name: string, consentToStorage: boolean, acceptTerms: boolean) => {
    const res = await api.register(email, password, name, consentToStorage, acceptTerms);
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
    setJustRegistered(true);
    void offerBiometricEnrolment();
  }, [offerBiometricEnrolment]);

  const clearJustRegistered = useCallback(() => {
    setJustRegistered(false);
  }, []);

  const logout = useCallback(async () => {
    await doLogout();
    setJustRegistered(false);
  }, [doLogout]);

  const updateUser = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);

  const toggleAI = useCallback(async (enabled: boolean) => {
    await api.toggleAI(enabled);
    if (enabled) {
      // Fetch the full user so ai_consent_given_at is populated in local state.
      try {
        const user = await api.getMe();
        setCurrentUser(user);
      } catch {
        setCurrentUser((prev) => (prev ? { ...prev, ai_enabled: true } : prev));
      }
    } else {
      setCurrentUser((prev) => (prev ? { ...prev, ai_enabled: false } : prev));
    }
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
        justRegistered,
        login,
        register,
        logout,
        updateUser,
        toggleAI,
        isSubscriptionLimitReached,
        clearJustRegistered,
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
