import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MonthCalendar from '../../components/MonthCalendar';
import MoodLineChart from '../../components/MoodLineChart';
import { Skeleton, SkeletonCard } from '../../components/Skeleton';
import ThemedView from '../../components/ThemedView';
import { FONTS } from '../../constants/fonts';
import { notifySuccess } from '../../constants/haptics';
import { MOOD_EMOJIS } from '../../constants/moods';
import { DURATION, RADIUS, SPACING } from '../../constants/tokens';
import type { Theme } from '../../constants/themes';
import { useSettings } from '../../context/SettingsContext';
import { api, Insights } from '../../services/api';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function peakWritingLabel(hour: number, t: TFunction): string {
  if (hour < 12) return t('insightsScreen.periods.morning');
  if (hour < 18) return t('insightsScreen.periods.afternoon');
  if (hour < 22) return t('insightsScreen.periods.evening');
  return t('insightsScreen.periods.night');
}

function moodTrendLabel(trend: string, t: TFunction): string {
  switch (trend) {
    case 'improving': return t('insightsScreen.trend.improving');
    case 'declining': return t('insightsScreen.trend.declining');
    case 'stable':    return t('insightsScreen.trend.stable');
    default:          return '';
  }
}

/** Backend weekday keys are fixed English names (Postgres to_char 'Day') — translate for display. */
function translateWeekday(day: string, t: TFunction): string {
  return t(`common.weekdaysFull.${day.trim().toLowerCase()}`, { defaultValue: day });
}

/** Best/worst weekday by average mood, for a more detailed trend sub-line. */
function moodTrendDetail(data: Record<string, number> | undefined, t: TFunction): string | undefined {
  if (data == null) return undefined;
  const entries = Object.entries(data);
  if (entries.length < 2) return undefined;
  const [bestDay] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const [worstDay] = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
  if (bestDay === worstDay) return undefined;
  return t('insightsScreen.trendDetail', {
    bestDay: translateWeekday(bestDay, t),
    worstDay: translateWeekday(worstDay, t),
  });
}

/** Color-coded icon stat card. */
function StatCard({
  icon,
  color,
  label,
  value,
  sub,
  subColor,
  theme,
  delay,
  flex,
}: {
  icon: IoniconName;
  color: string;
  label: string;
  value: string | number;
  sub?: string;
  subColor?: string;
  theme: Theme;
  delay: number;
  /** When true, the card takes equal share of a row instead of full width. */
  flex?: boolean;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(DURATION.base)}
      style={[styles.card, flex && styles.cardFlex, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={styles.cardRow}>
        <View style={[styles.iconCircle, { backgroundColor: color + '1F' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.cardTextCol}>
          <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
            {label}
          </Text>
          <Text style={[styles.cardValue, { color: theme.text, fontFamily: FONTS.modern }]}>
            {value}
          </Text>
          {sub != null && (
            <Text style={[styles.cardSub, { color: subColor ?? theme.textSecondary, fontFamily: FONTS.modern }]}>
              {sub}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export default function InsightsScreen() {
  const { theme, moodSetId } = useSettings();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
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
        .catch(() => setError(t('insightsScreen.loadError')))
        .finally(() => setLoading(false));
    }, [t]),
  );

  if (loading) {
    return (
      <ThemedView safe edges={['top', 'left', 'right']}>
        <View style={styles.scroll}>
          <Skeleton width="55%" height={26} />
          <Skeleton width="100%" height={108} radius={RADIUS.lg} style={{ marginTop: 8 }} />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </ThemedView>
    );
  }

  if (error || !insights) {
    return (
      <ThemedView safe edges={['top', 'left', 'right']} style={styles.center}>
        <Text style={[styles.errorText, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
          {error ?? t('common.somethingWrong')}
        </Text>
      </ThemedView>
    );
  }

  if (insights.total_entries === 0) {
    return (
      <ThemedView safe edges={['top', 'left', 'right']} style={styles.center}>
        <Text style={styles.emptyIcon}>📓</Text>
        <Text style={[styles.emptyText, { color: theme.text, fontFamily: FONTS.modern }]}>
          {t('insightsScreen.emptyTitle')}
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
          {t('insightsScreen.emptySubtitle')}
        </Text>
      </ThemedView>
    );
  }

  const emojis = MOOD_EMOJIS[moodSetId] ?? MOOD_EMOJIS.basic;
  const avgMoodScore = insights.avg_mood_last_30 != null
    ? Math.round(insights.avg_mood_last_30)
    : null;
  const avgMoodEmoji = avgMoodScore != null ? emojis[avgMoodScore - 1] : null;
  const avgMoodColor = avgMoodScore != null
    ? theme.mood[avgMoodScore as 1 | 2 | 3 | 4 | 5]
    : theme.accent;

  const monthDelta = insights.entries_this_month - insights.entries_last_month;
  const deltaLabel = monthDelta > 0
    ? t('insightsScreen.deltaPositive', { count: monthDelta })
    : monthDelta < 0
    ? t('insightsScreen.deltaNegative', { count: monthDelta })
    : t('insightsScreen.deltaSame');
  const deltaColor =
    monthDelta > 0 ? theme.success : monthDelta < 0 ? theme.destructive : theme.textSecondary;

  const trendIcon: IoniconName = insights.mood_trend === 'improving'
    ? 'trending-up'
    : insights.mood_trend === 'declining'
    ? 'trending-down'
    : 'remove';
  const trendColor = insights.mood_trend === 'improving'
    ? theme.success
    : insights.mood_trend === 'declining'
    ? theme.destructive
    : theme.textSecondary;

  // Staggered slide-up, sequenced only over the cards that actually render.
  let i = 0;
  const nextDelay = () => Math.min(i++, 8) * 45;
  const chartWidth = width - SPACING.xl * 2 - SPACING.lg * 2;

  return (
    <ThemedView safe edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: theme.text, fontFamily: FONTS.modern }]}>
          {t('insightsScreen.title')}
        </Text>

        {/* Hero stat — current streak (falls back to total entries) */}
        <Animated.View
          entering={FadeInDown.delay(nextDelay()).duration(DURATION.base)}
          style={[styles.hero, { backgroundColor: theme.accent }]}
        >
          {insights.current_streak > 0 ? (
            <>
              <Text style={styles.heroEmoji}>🔥</Text>
              <Text style={[styles.heroValue, { color: theme.background, fontFamily: FONTS.modern }]}>
                {insights.current_streak}
              </Text>
              <Text style={[styles.heroLabel, { color: theme.background, fontFamily: FONTS.modern }]}>
                {t('insightsScreen.daysInARow', { count: insights.current_streak })}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.heroEmoji}>📔</Text>
              <Text style={[styles.heroValue, { color: theme.background, fontFamily: FONTS.modern }]}>
                {insights.total_entries}
              </Text>
              <Text style={[styles.heroLabel, { color: theme.background, fontFamily: FONTS.modern }]}>
                {t('insightsScreen.entriesWritten')}
              </Text>
            </>
          )}
        </Animated.View>

        {/* Mood-over-the-week chart */}
        {insights.avg_mood_by_day != null && Object.keys(insights.avg_mood_by_day).length > 1 && (
          <Animated.View
            entering={FadeInDown.delay(nextDelay()).duration(DURATION.base)}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              {t('insightsScreen.moodAcrossWeek')}
            </Text>
            <MoodLineChart data={insights.avg_mood_by_day} width={chartWidth} />
          </Animated.View>
        )}

        {/* Average mood */}
        {avgMoodScore != null && (
          <StatCard
            icon="happy-outline"
            color={avgMoodColor}
            label={t('insightsScreen.avgMoodLabel')}
            value={`${insights.avg_mood_last_30!.toFixed(1)} / 5  ${avgMoodEmoji ?? ''}`}
            theme={theme}
            delay={nextDelay()}
          />
        )}

        {/* Calendar — days journaled this month, with mood per day */}
        {insights.calendar_this_month != null && (
          <Animated.View
            entering={FadeInDown.delay(nextDelay()).duration(DURATION.base)}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              {t('insightsScreen.thisMonth')}
            </Text>
            <MonthCalendar
              days={Object.fromEntries(
                insights.calendar_this_month.map((d) => [
                  d.date,
                  d.mood != null ? Math.round(d.mood) : null,
                ]),
              )}
              moodEmojis={emojis}
              theme={theme}
            />
          </Animated.View>
        )}

        {/* Longest streak + this month vs last month */}
        <View style={styles.row}>
          <StatCard
            icon="trophy-outline"
            color={theme.success}
            label={t('insightsScreen.longestStreak')}
            value={t('common.dayCount', { count: insights.longest_streak })}
            theme={theme}
            delay={nextDelay()}
            flex
          />

          <StatCard
            icon="calendar-outline"
            color={deltaColor}
            label={t('insightsScreen.thisMonth')}
            value={insights.entries_this_month}
            sub={deltaLabel}
            subColor={deltaColor}
            theme={theme}
            delay={nextDelay()}
            flex
          />
        </View>

        {/* ── Pattern cards — only shown after the weekly job has run ── */}
        {insights.mood_trend != null && insights.mood_trend !== 'insufficient_data' && (
          <StatCard
            icon={trendIcon}
            color={trendColor}
            label={t('insightsScreen.moodTrend')}
            value={moodTrendLabel(insights.mood_trend, t)}
            sub={moodTrendDetail(insights.avg_mood_by_day, t)}
            theme={theme}
            delay={nextDelay()}
          />
        )}

        {insights.peak_writing_hour != null && (
          <StatCard
            icon="time-outline"
            color={theme.accent}
            label={t('insightsScreen.peakWritingTime')}
            value={peakWritingLabel(insights.peak_writing_hour, t)}
            sub={t('insightsScreen.peakWritingDetail', { period: peakWritingLabel(insights.peak_writing_hour, t) })}
            theme={theme}
            delay={nextDelay()}
          />
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  scroll: { padding: SPACING.xl, gap: SPACING.md, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  hero: {
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 30, marginBottom: 4 },
  heroValue: { fontSize: 52, fontWeight: '800', lineHeight: 58 },
  heroLabel: { fontSize: 14, fontWeight: '600', opacity: 0.9 },
  row: { flexDirection: 'row', gap: SPACING.md },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  cardFlex: { flex: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextCol: { flex: 1 },
  cardLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  cardValue: { fontSize: 24, fontWeight: '700' },
  cardSub: { fontSize: 13, marginTop: 2 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  emptySubtext: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorText: { fontSize: 14, textAlign: 'center' },
});
