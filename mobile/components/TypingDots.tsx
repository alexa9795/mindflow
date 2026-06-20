import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface TypingDotsProps {
  color: string;
}

function Dot({ color, delay }: { color: string; delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 350 }),
          withTiming(0, { duration: 350 }),
        ),
        -1,
      ),
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ translateY: -progress.value * 3 }],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, animatedStyle]} />;
}

/** Three pulsing dots — used as Echo's "thinking" indicator. */
export default function TypingDots({ color }: TypingDotsProps) {
  return (
    <View style={styles.row}>
      <Dot color={color} delay={0} />
      <Dot color={color} delay={150} />
      <Dot color={color} delay={300} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
