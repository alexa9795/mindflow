import {
  Caveat_400Regular,
  useFonts as useCaveat,
} from '@expo-google-fonts/caveat';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInter,
} from '@expo-google-fonts/inter';
import {
  RobotoSerif_400Regular,
  useFonts as useRobotoSerif,
} from '@expo-google-fonts/roboto-serif';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  useFonts as usePlayfair,
} from '@expo-google-fonts/playfair-display';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SettingsProvider, useSettings } from '../context/SettingsContext';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import '../i18n';

/** Brand launch colours — match the native splash (app.json) so the JS
 *  loading state is a seamless continuation rather than a white flash. */
const SPLASH_BG = '#EDE8E0';
const SPLASH_SPINNER = '#2C2418';

function ThemedStatusBar() {
  const { theme } = useSettings();
  return <StatusBar style={theme.isDark ? 'light' : 'dark'} />;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, currentUser, justRegistered } = useAuth();
  const { theme, locale, setLocale } = useSettings();
  const segments = useSegments();
  const router = useRouter();

  // The account's locale (set at login/registration, or changed from another
  // device) follows the user here — this is what makes a fresh login on a
  // new device pick up the language they'd already chosen.
  useEffect(() => {
    if (currentUser?.locale && currentUser.locale !== locale) {
      void setLocale(currentUser.locale);
    }
  }, [currentUser?.locale, locale, setLocale]);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const onWelcome = segments[0] === 'welcome';

    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    if (justRegistered) {
      if (!onWelcome) router.replace('/welcome');
    } else if (inAuthGroup || onWelcome) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, justRegistered, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [playfairLoaded] = usePlayfair({ PlayfairDisplay_400Regular, PlayfairDisplay_700Bold });
  const [interLoaded] = useInter({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });
  const [robotoSerifLoaded] = useRobotoSerif({ RobotoSerif_400Regular });
  const [caveatLoaded] = useCaveat({ Caveat_400Regular });

  const fontsReady = playfairLoaded && interLoaded && robotoSerifLoaded && caveatLoaded;

  if (!fontsReady) {
    // Rendered before providers exist, so use the fixed brand colours.
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: SPLASH_BG }}>
        <ActivityIndicator size="large" color={SPLASH_SPINNER} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <AuthProvider>
          <ThemedStatusBar />
          <AuthGuard>
            <Slot />
          </AuthGuard>
        </AuthProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}
