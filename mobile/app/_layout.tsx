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
import { SettingsProvider } from '../context/SettingsContext';
import { AuthProvider, useAuth } from '../hooks/useAuth';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
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
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SettingsProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <AuthGuard>
          <Slot />
        </AuthGuard>
      </AuthProvider>
    </SettingsProvider>
  );
}
