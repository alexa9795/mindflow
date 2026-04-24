import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ThemedView from '../../components/ThemedView';
import { FONTS } from '../../constants/fonts';
import { MOOD_EMOJIS } from '../../constants/moods';
import { useSettings } from '../../context/SettingsContext';
import { api, Insights } from '../../services/api';

export default function InsightsScreen() {
  const { theme, moodSetId } = useSettings();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      api.getInsights()
        .then((data) => setInsights(data))
        .catch(() => setError('Could not load insights'))
        .finally(() => setLoading(false));
    }, []),
  );

  if (loading) {
    return (
      <ThemedView safe style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </ThemedView>
    );
  }

  if (error || !insights) {
    return (
      <ThemedView safe style={styles.center}>
        <Text style={[styles.errorText, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
          {error ?? 'Something went wrong'}
        </Text>
      </ThemedView>
    );
  }

  if (insights.total_entries === 0) {
    return (
      <ThemedView safe style={styles.center}>
        <Text style={styles.emptyIcon}>📓</Text>
        <Text style={[styles.emptyText, { color: theme.text, fontFamily: FONTS.modern }]}>
          Start journaling to see your insights.
        </Text>
      </ThemedView>
    );
  }

  const emojis = MOOD_EMOJIS[moodSetId] ?? MOOD_EMOJIS.basic;
  const avgMoodScore = insights.avg_mood_last_30 != null
    ? Math.round(insights.avg_mood_last_30)
    : null;
  const avgMoodEmoji = avgMoodScore != null ? emojis[avgMoodScore - 1] : null;

  const monthDelta = insights.entries_this_month - insights.entries_last_month;
  const deltaLabel = monthDelta > 0
    ? `+${monthDelta} vs last month`
    : monthDelta < 0
    ? `${monthDelta} vs last month`
    : 'Same as last month';
  const deltaColor =
    monthDelta > 0 ? theme.accent : monthDelta < 0 ? theme.destructive : theme.textSecondary;

  return (
    <ThemedView safe>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: theme.text, fontFamily: FONTS.modern }]}>
          Your insights
        </Text>

        {/* Total entries */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
            Total entries
          </Text>
          <Text style={[styles.cardBig, { color: theme.text, fontFamily: FONTS.modern }]}>
            {insights.total_entries}
          </Text>
        </View>

        {/* This month */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
            This month
          </Text>
          <Text style={[styles.cardBig, { color: theme.text, fontFamily: FONTS.modern }]}>
            {insights.entries_this_month}
          </Text>
          <Text style={[styles.cardSub, { color: deltaColor, fontFamily: FONTS.modern }]}>
            {deltaLabel}
          </Text>
        </View>

        {/* Streaks row */}
        <View style={styles.row}>
          <View style={[styles.cardHalf, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              Current streak
            </Text>
            <View style={styles.streakRow}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={[styles.cardBig, { color: theme.text, fontFamily: FONTS.modern }]}>
                {insights.current_streak}
              </Text>
            </View>
            <Text style={[styles.cardSub, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              {insights.current_streak === 1 ? 'day' : 'days'}
            </Text>
          </View>

          <View style={[styles.cardHalf, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              Longest streak
            </Text>
            <Text style={[styles.cardBig, { color: theme.text, fontFamily: FONTS.modern }]}>
              {insights.longest_streak}
            </Text>
            <Text style={[styles.cardSub, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              {insights.longest_streak === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>

        {/* Average mood — only shown when data exists */}
        {avgMoodScore != null && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              Average mood (last 30 days)
            </Text>
            <View style={styles.moodRow}>
              {avgMoodEmoji != null && (
                <Text style={styles.moodEmoji}>{avgMoodEmoji}</Text>
              )}
              <Text style={[styles.cardBig, { color: theme.text, fontFamily: FONTS.modern }]}>
                {insights.avg_mood_last_30!.toFixed(1)}
                <Text style={[styles.cardSub, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                  {' '}/ 5
                </Text>
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, gap: 12, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  cardHalf: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  cardLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  cardBig: { fontSize: 36, fontWeight: '700', lineHeight: 42 },
  cardSub: { fontSize: 13, marginTop: 2 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakIcon: { fontSize: 28 },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  moodEmoji: { fontSize: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, textAlign: 'center', paddingHorizontal: 40 },
  errorText: { fontSize: 14, textAlign: 'center' },
});
