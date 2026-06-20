import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useSettings } from '../context/SettingsContext';

interface ThemedViewProps extends ViewProps {
  /**
   * When true, the root element is a SafeAreaView (use for top-level screens).
   * When false (default), it's a plain View — use for nested containers.
   */
  safe?: boolean;
  /**
   * Which edges get safe-area insets. Defaults to all four. Tab screens should
   * pass ['top', 'left', 'right'] so the tab bar — not the screen — owns the
   * bottom inset (otherwise a background strip appears above the tab bar).
   */
  edges?: readonly Edge[];
}

const ALL_EDGES: readonly Edge[] = ['top', 'right', 'bottom', 'left'];

export default function ThemedView({ safe = false, edges = ALL_EDGES, style, children, ...props }: ThemedViewProps) {
  const { theme } = useSettings();
  const bg = { backgroundColor: theme.background };

  if (safe) {
    return (
      <SafeAreaView edges={edges} style={[styles.flex, bg, style]} {...props}>
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
