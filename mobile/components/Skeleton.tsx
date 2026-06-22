import React, { useEffect } from 'react';
import { type DimensionValue, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { RADIUS } from '../constants/tokens';
import { useSettings } from '../context/SettingsContext';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

/** A single pulsing placeholder block, themed to the current surface/border. */
export function Skeleton({ width = '100%', height = 16, radius = RADIUS.sm, style }: SkeletonProps) {
  const { theme } = useSettings();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.border },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** A card-shaped skeleton matching the Insights/list card silhouette. */
export function SkeletonCard() {
  const { theme } = useSettings();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Skeleton width="40%" height={12} />
      <Skeleton width="55%" height={30} style={{ marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 16,
  },
});
