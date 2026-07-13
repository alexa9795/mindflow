import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeInDown, FadeOutLeft, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSettings } from '../context/SettingsContext';
import { bcp47ForLocale } from '../constants/locales';
import { MOOD_EMOJIS } from '../constants/moods';
import { FONTS, scaledFontSize } from '../constants/fonts';
import { DURATION, RADIUS, SPACING } from '../constants/tokens';
import PressableScale from './PressableScale';
import type { Entry } from '../services/api';

const DELETE_ACTION_WIDTH = 88;

interface EntryCardProps {
  entry: Entry;
  /** Position in the list — drives the staggered entrance animation. */
  index?: number;
  /** Called after the user confirms deletion from the swipe action. */
  onDelete?: (id: string) => void;
}

/** Human-friendly relative date: Today / Yesterday / N days ago, else a short date. */
function formatRelativeDate(iso: string, t: TFunction, bcp47: string): string {
  const then = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);

  if (dayDiff <= 0) return t('components.entryCard.today');
  if (dayDiff === 1) return t('components.entryCard.yesterday');
  if (dayDiff < 7) return t('components.entryCard.daysAgo', { count: dayDiff });
  return then.toLocaleDateString(bcp47, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EntryCard({ entry, index = 0, onDelete }: EntryCardProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme, moodSetId, entryFont } = useSettings();
  const swipeableRef = useRef<SwipeableMethods>(null);
  const moodEmojis = MOOD_EMOJIS[moodSetId] ?? MOOD_EMOJIS.basic;
  const moodEmoji = entry.mood_score ? moodEmojis[entry.mood_score - 1] : null;
  const moodColor = entry.mood_score
    ? theme.mood[entry.mood_score as 1 | 2 | 3 | 4 | 5]
    : theme.border;

  function confirmDelete() {
    Alert.alert(
      t('components.entryCard.confirmDelete.title'),
      t('components.entryCard.confirmDelete.message'),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => swipeableRef.current?.close() },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => onDelete?.(entry.id),
        },
      ],
    );
  }

  function renderRightActions(progress: SharedValue<number>, translation: SharedValue<number>) {
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translation.value + DELETE_ACTION_WIDTH }],
    }));
    return (
      <Animated.View style={[styles.deleteAction, animatedStyle]}>
        <Pressable
          style={[styles.deleteBtn, { backgroundColor: theme.destructive }]}
          onPress={confirmDelete}
          accessibilityLabel={t('components.entryCard.deleteA11y')}
        >
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          <Text style={styles.deleteText}>{t('components.entryCard.delete')}</Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(DURATION.base)}
      exiting={FadeOutLeft.duration(DURATION.base)}
    >
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        overshootRight={false}
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
                {formatRelativeDate(entry.created_at, t, bcp47ForLocale(i18n.language))}
              </Text>
              {moodEmoji && <Text style={styles.moodEmoji}>{moodEmoji}</Text>}
            </View>
            <Text
              numberOfLines={2}
              style={[
                styles.preview,
                {
                  color: theme.text,
                  fontFamily: FONTS[entryFont],
                  fontSize: scaledFontSize(entryFont, 15),
                  lineHeight: scaledFontSize(entryFont, 22),
                },
              ]}
            >
              {entry.content.slice(0, 80)}
            </Text>
          </View>
        </PressableScale>
      </Swipeable>
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
  deleteAction: {
    width: DELETE_ACTION_WIDTH,
    marginBottom: SPACING.md,
  },
  deleteBtn: {
    flex: 1,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
