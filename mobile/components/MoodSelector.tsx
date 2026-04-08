import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MOOD_EMOJIS, MOOD_SETS } from '../constants/moods';
import { FONTS } from '../constants/fonts';
import { useSettings } from '../context/SettingsContext';

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
          <Pressable
            key={mood.score}
            style={[
              styles.btn,
              { backgroundColor: theme.surface, borderColor: theme.border },
              isActive && { borderColor: theme.accent, transform: [{ scale: 1.15 }] },
            ]}
            onPress={() => onSelect(isActive ? undefined : mood.score)}
            accessibilityLabel={mood.label}
          >
            {/* Phase 2: when mood.imageSource is set, render <Image> instead of emoji */}
            <Text style={styles.emoji}>{emojis[index]}</Text>
            <Text style={[styles.label, { color: isActive ? theme.accent : theme.textSecondary, fontFamily: FONTS.modern }]}>
              {mood.label}
            </Text>
          </Pressable>
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
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  emoji: { fontSize: 24 },
  label: { fontSize: 10, fontWeight: '600' },
});
