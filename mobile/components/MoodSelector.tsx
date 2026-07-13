import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MOOD_EMOJIS, MOOD_SETS, type MoodOption } from '../constants/moods';
import { FONTS } from '../constants/fonts';
import { DURATION, RADIUS } from '../constants/tokens';
import { tapLight } from '../constants/haptics';
import { useSettings } from '../context/SettingsContext';
import type { Theme } from '../constants/themes';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MoodChipProps {
  mood: MoodOption;
  emoji: string;
  isActive: boolean;
  theme: Theme;
  onPress: () => void;
}

function MoodChip({ mood, emoji, isActive, theme, onPress }: MoodChipProps) {
  const { t } = useTranslation();
  const moodLabel = t(mood.labelKey);
  const moodColor = theme.mood[mood.score as 1 | 2 | 3 | 4 | 5];
  const select = useSharedValue(isActive ? 1 : 0);
  const press = useSharedValue(1);

  useEffect(() => {
    select.value = withSpring(isActive ? 1 : 0, { damping: 11, stiffness: 220 });
  }, [isActive, select]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value * (1 + select.value * 0.12) }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        press.value = withTiming(0.9, { duration: DURATION.fast });
      }}
      onPressOut={() => {
        press.value = withTiming(1, { duration: DURATION.fast });
      }}
      onPress={() => {
        tapLight();
        onPress();
      }}
      accessibilityLabel={moodLabel}
      style={[
        styles.btn,
        { backgroundColor: theme.surface, borderColor: theme.border },
        isActive && { borderColor: moodColor, backgroundColor: moodColor + '22' },
        animatedStyle,
      ]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text
        style={[
          styles.label,
          { color: isActive ? moodColor : theme.textSecondary, fontFamily: FONTS.modern },
        ]}
      >
        {moodLabel}
      </Text>
    </AnimatedPressable>
  );
}

interface MoodSelectorProps {
  selected: number | undefined;
  onSelect: (score: number | undefined) => void;
}

export default function MoodSelector({ selected, onSelect }: MoodSelectorProps) {
  const { theme, moodSetId } = useSettings();
  const moodSet = MOOD_SETS[moodSetId] ?? MOOD_SETS.basic;
  const emojis = MOOD_EMOJIS[moodSetId] ?? MOOD_EMOJIS.basic;

  return (
    <View style={styles.row}>
      {moodSet.moods.map((mood, index) => {
        const isActive = selected === mood.score;
        return (
          <MoodChip
            key={mood.score}
            mood={mood}
            emoji={emojis[index]}
            isActive={isActive}
            theme={theme}
            onPress={() => onSelect(isActive ? undefined : mood.score)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 24,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    gap: 4,
  },
  emoji: { fontSize: 24 },
  label: { fontSize: 10, fontWeight: '600' },
});
