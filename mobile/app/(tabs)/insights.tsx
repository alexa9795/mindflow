import React from 'react';
import { StyleSheet, Text } from 'react-native';
import ThemedView from '../../components/ThemedView';
import { FONTS } from '../../constants/fonts';
import { useSettings } from '../../context/SettingsContext';

export default function InsightsScreen() {
  const { theme } = useSettings();

  return (
    <ThemedView safe style={styles.center}>
      <Text style={[styles.icon]}>✨</Text>
      <Text style={[styles.heading, { color: theme.text, fontFamily: FONTS.modern }]}>
        Insights coming soon
      </Text>
      <Text style={[styles.sub, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
        Weekly reflections and patterns will appear here
      </Text>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 48, marginBottom: 16 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  sub: { fontSize: 15, textAlign: 'center', paddingHorizontal: 40 },
});
