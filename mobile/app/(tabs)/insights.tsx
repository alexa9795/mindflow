import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ThemedView from '../../components/ThemedView';
import { FONTS } from '../../constants/fonts';
import { DURATION } from '../../constants/tokens';
import { notifySuccess } from '../../constants/haptics';
import { MOOD_EMOJIS } from '../../constants/moods';
import { useSettings } from '../../context/SettingsContext';
import { api, Insights } from '../../services/api';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function peakWritingLabel(hour: number): string {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'night';
}

function moodTrendLabel(trend: string): string {
  switch (trend) {
    case 'improving': return 'Your mood has been improving lately';
    case 'declining': return 'Your mood has dipped recently';
    case 'stable':    return 'Your mood has been steady lately';
    default:          return '';
  }
}

function WeekdayChart({
  data,
  theme,
}: {
  data: Record<string, number>;
  theme: { accent: string; textSecondary: string };
}) {
  const counts = WEEKDAYS.map((d) => data[d] ?? 0);
  const maxCount = Math.max(...counts, 1);
  const BAR_HEIGHT = 36;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 8, height: BAR_HEIGHT + 18 }}>
      {WEEKDAYS.map((day, i) => {
        const count = counts[i];
        const barH = count > 0 ? Math.max(Math.round((count / maxCount) * BAR_HEIGHT), 4) : 0;
        return (
          <View key={day} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: BAR_HEIGHT + 18 }}>
            <View style={{ width: '100%', height: barH, backgroundColor: theme.accent, borderRadius: 2 }} />
            <Text style={{ fontSize: 9, color: theme.textSecondary, fontFamily: FONTS.modern, marginTop: 3 }}>
              {WEEKDAY_SHORT[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

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
        .then((data) => {
          setInsights(data);
          // Celebrate weekly streak milestones (7, 14, 21…) when the screen opens.
          if (data.current_streak > 0 && data.current_streak % 7 === 0) {
            notifySuccess();
          }
        })
        .catch(() => setError('Could not load insights'))
        .finally(() => setLoading(false));
    }, []),
  );

  if (loading) {
    return (
      <ThemedView safe edges={['top', 'left', 'right']} style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </ThemedView>
    );
  }

  if (error || !insights) {
    return (
      <ThemedView safe edges={['top', 'left', 'right']} style={styles.center}>
        <Text style={[styles.errorText, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
          {error ?? 'Something went wrong'}
        </Text>
      </ThemedView>
    );
  }

  if (insights.total_entries === 0) {
    return (
      <ThemedView safe edges={['top', 'left', 'right']} style={styles.center}>
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

  // Staggered slide-up entrance, sequenced only over the cards that actually render.
  let cardIndex = 0;
  const stagger = () =>
    FadeInDown.delay(Math.min(cardIndex++, 8) * 45).duration(DURATION.base);

  return (
    <ThemedView safe edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: theme.text, fontFamily: FONTS.modern }]}>
          Your insights
        </Text>

        {/* Total entries */}
        <Animated.View entering={stagger()} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
            Total entries
          </Text>
          <Text style={[styles.cardBig, { color: theme.text, fontFamily: FONTS.modern }]}>
            {insights.total_entries}
          </Text>
        </Animated.View>

        {/* This month */}
        <Animated.View entering={stagger()} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
            This month
          </Text>
          <Text style={[styles.cardBig, { color: theme.text, fontFamily: FONTS.modern }]}>
            {insights.entries_this_month}
          </Text>
          <Text style={[styles.cardSub, { color: deltaColor, fontFamily: FONTS.modern }]}>
            {deltaLabel}
          </Text>
        </Animated.View>

        {/* Streaks row */}
        <Animated.View entering={stagger()} style={styles.row}>
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
        </Animated.View>

        {/* Average mood — only shown when data exists */}
        {avgMoodScore != null && (
          <Animated.View entering={stagger()} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
          </Animated.View>
        )}

        {/* ── Pattern cards — only shown after weekly job has run ── */}

        {/* Most active day */}
        {insights.most_active_day != null && (
          <Animated.View entering={stagger()} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              Most active day
            </Text>
            <Text style={[styles.cardBig, { color: theme.text, fontFamily: FONTS.modern }]}>
              {insights.most_active_day}
            </Text>
            <Text style={[styles.cardSub, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              You write most on {insights.most_active_day}
            </Text>
          </Animated.View>
        )}

        {/* Peak writing time */}
        {insights.peak_writing_hour != null && (
          <Animated.View entering={stagger()} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              Peak writing time
            </Text>
            <Text style={[styles.cardBig, { color: theme.text, fontFamily: FONTS.modern }]}>
              {peakWritingLabel(insights.peak_writing_hour)}
            </Text>
            <Text style={[styles.cardSub, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              You tend to write in the {peakWritingLabel(insights.peak_writing_hour)}
            </Text>
          </Animated.View>
        )}

        {/* Mood trend — insufficient_data is never shown */}
        {insights.mood_trend != null && insights.mood_trend !== 'insufficient_data' && (
          <Animated.View entering={stagger()} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              Mood trend
            </Text>
            <Text style={[styles.cardBig, { color: theme.text, fontFamily: FONTS.modern }]}>
              {moodTrendLabel(insights.mood_trend)}
            </Text>
          </Animated.View>
        )}

        {/* Writing consistency mini bar chart */}
        {insights.entries_per_weekday != null && (
          <Animated.View entering={stagger()} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              Writing consistency
            </Text>
            <WeekdayChart data={insights.entries_per_weekday} theme={theme} />
          </Animated.View>
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
