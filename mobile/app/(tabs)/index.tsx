import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import EntryCard from '../../components/EntryCard';
import OfflineBanner from '../../components/OfflineBanner';
import PressableScale from '../../components/PressableScale';
import ThemedView from '../../components/ThemedView';
import { FONTS } from '../../constants/fonts';
import { ELEVATION } from '../../constants/tokens';
import { useSettings } from '../../context/SettingsContext';
import { useEntries } from '../../hooks/useEntries';
import { useFocusEffect } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useSettings();
  const { entries, loading, isOffline, fetchEntries, loadMore, hasMore } = useEntries();

  useFocusEffect(
    useCallback(() => {
      void fetchEntries();
    }, [fetchEntries]),
  );

  return (
    <ThemedView safe edges={['top', 'left', 'right']}>
      <OfflineBanner visible={isOffline} />

      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: FONTS.modern }]}>
          Dear Journal
        </Text>
      </View>

      {loading && entries.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
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
                Start your first entry
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                Tap + to begin writing
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
        <Text style={[styles.fabText, { color: theme.background }]}>＋</Text>
      </PressableScale>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  fabText: { fontSize: 28, lineHeight: 32 },
});
