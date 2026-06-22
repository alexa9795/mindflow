import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSettings } from '../context/SettingsContext';
import { MOOD_EMOJIS } from '../constants/moods';
import { FONTS } from '../constants/fonts';
import { DURATION, RADIUS, SPACING } from '../constants/tokens';
import PressableScale from './PressableScale';
import type { Entry } from '../services/api';

interface EntryCardProps {
  entry: Entry;
  /** Position in the list — drives the staggered entrance animation. */
  index?: number;
}

/** Human-friendly relative date: Today / Yesterday / N days ago, else a short date. */
function formatRelativeDate(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);

  if (dayDiff <= 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return `${dayDiff} days ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EntryCard({ entry, index = 0 }: EntryCardProps) {
  const router = useRouter();
  const { theme, moodSetId, entryFont } = useSettings();
  const moodEmojis = MOOD_EMOJIS[moodSetId] ?? MOOD_EMOJIS.basic;
  const moodEmoji = entry.mood_score ? moodEmojis[entry.mood_score - 1] : null;
  const moodColor = entry.mood_score
    ? theme.mood[entry.mood_score as 1 | 2 | 3 | 4 | 5]
    : theme.border;

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(DURATION.base)}
    >
      <PressableScale
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => router.push(`/entry/${entry.id}`)}
      >
        {/* Left mood-color accent strip */}
        <View style={[styles.accentStrip, { backgroundColor: moodColor }]} />
        <View style={styles.body}>
          <View style={styles.row}>
            <Text style={[styles.date, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              {formatRelativeDate(entry.created_at)}
            </Text>
            {moodEmoji && <Text style={styles.moodEmoji}>{moodEmoji}</Text>}
          </View>
          <Text
            numberOfLines={2}
            style={[styles.preview, { color: theme.text, fontFamily: FONTS[entryFont] }]}
          >
            {entry.content.slice(0, 80)}
          </Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  accentStrip: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: SPACING.lg },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs + 2,
  },
  date: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  moodEmoji: { fontSize: 16 },
  preview: { fontSize: 15, lineHeight: 22 },
});
