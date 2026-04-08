import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../context/SettingsContext';

interface ThemedViewProps extends ViewProps {
  /**
   * When true, the root element is a SafeAreaView (use for top-level screens).
   * When false (default), it's a plain View — use for nested containers.
   */
  safe?: boolean;
}

export default function ThemedView({ safe = false, style, children, ...props }: ThemedViewProps) {
  const { theme } = useSettings();
  const bg = { backgroundColor: theme.background };

  if (safe) {
    return (
      <SafeAreaView style={[styles.flex, bg, style]} {...props}>
        {children}
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.flex, bg, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
