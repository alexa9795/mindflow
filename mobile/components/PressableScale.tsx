import React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { DURATION } from '../constants/tokens';
import { tapLight } from '../constants/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends PressableProps {
  /** Scale applied while pressed. */
  activeScale?: number;
  /** Fire a light haptic on press-in. Default false. */
  haptic?: boolean;
}

/**
 * Pressable that springs down slightly while held, giving tactile feedback to
 * any tappable surface (buttons, cards, chips). Honours the disabled prop.
 */
export default function PressableScale({
  activeScale = 0.96,
  haptic = false,
  disabled,
  onPressIn,
  onPressOut,
  style,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(e) => {
        scale.value = withTiming(activeScale, { duration: DURATION.fast });
        opacity.value = withTiming(0.85, { duration: DURATION.fast });
        if (haptic) tapLight();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: DURATION.fast });
        opacity.value = withTiming(1, { duration: DURATION.fast });
        onPressOut?.(e);
      }}
      style={[animatedStyle, style as object]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
