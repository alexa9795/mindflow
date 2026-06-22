import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import EntryCard from '../../components/EntryCard';
import OfflineBanner from '../../components/OfflineBanner';
import PressableScale from '../../components/PressableScale';
import { SkeletonCard } from '../../components/Skeleton';
import ThemedView from '../../components/ThemedView';
import { FONTS } from '../../constants/fonts';
import { getDailyQuote } from '../../constants/quotes';
import { ELEVATION, RADIUS, SPACING } from '../../constants/tokens';
import { useSettings } from '../../context/SettingsContext';
import { useEntries } from '../../hooks/useEntries';
import { useFocusEffect } from 'expo-router';
import { api } from '../../services/api';

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useSettings();
  const insets = useSafeAreaInsets();
  const { entries, loading, isOffline, fetchEntries, loadMore, hasMore } = useEntries();
  const [streak, setStreak] = useState<number>(0);
  const [quote, setQuote] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      void getDailyQuote().then(setQuote);
      void fetchEntries();
      // Reuse the insights endpoint purely for the header streak chip.
      api.getInsights()
        .then((data) => setStreak(data.current_streak))
        .catch(() => {/* header chip is non-critical */});
    }, [fetchEntries]),
  );

  return (
    <ThemedView safe edges={['left', 'right']}>
      <OfflineBanner visible={isOffline} />

      <View
        style={[
          styles.header,
          { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: insets.top + 16 },
        ]}
      >
        <View style={styles.headerTextCol}>
          <Text
            numberOfLines={2}
            style={[styles.quote, { color: theme.text, fontFamily: FONTS.modern }]}
          >
            {quote}
          </Text>
        </View>
        {streak > 0 && (
          <View style={[styles.streakChip, { backgroundColor: theme.accent + '1A', borderColor: theme.accent + '40' }]}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={[styles.streakText, { color: theme.accent, fontFamily: FONTS.modern }]}>
              {streak} day{streak === 1 ? '' : 's'}
            </Text>
          </View>
        )}
      </View>

      {loading && entries.length === 0 ? (
        <View style={styles.skeletonList}>
          {Array.from({ length: 5 }).map((_, idx) => (
            <View key={idx} style={{ marginBottom: SPACING.md }}>
              <SkeletonCard />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerStyle={
            entries.length === 0 ? styles.centerContent : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✍️</Text>
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: FONTS.modern }]}>
                Your story starts here
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                Tap + to write your first entry
              </Text>
            </View>
          }
          renderItem={({ item, index }) => <EntryCard entry={item} index={index} />}
          onEndReached={hasMore ? () => void loadMore() : undefined}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loading && entries.length > 0 ? (
              <ActivityIndicator
                color={theme.accent}
                style={{ marginVertical: 20 }}
              />
            ) : null
          }
        />
      )}

      <PressableScale
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={() => router.push('/entry/new')}
        accessibilityLabel="New entry"
        haptic
      >
        <Ionicons name="add" size={30} color={theme.background} />
      </PressableScale>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTextCol: { flex: 1, paddingRight: SPACING.md },
  quote: { fontSize: 17, fontWeight: '600', fontStyle: 'italic', lineHeight: 22 },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  streakEmoji: { fontSize: 14 },
  streakText: { fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  skeletonList: { padding: 16 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { fontSize: 15 },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...ELEVATION.floating,
  },
});
