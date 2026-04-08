import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import EntryCard from '../../components/EntryCard';
import OfflineBanner from '../../components/OfflineBanner';
import ThemedView from '../../components/ThemedView';
import { FONTS } from '../../constants/fonts';
import { useSettings } from '../../context/SettingsContext';
import { useEntries } from '../../hooks/useEntries';
import { useFocusEffect } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useSettings();
  const { entries, loading, isOffline, fetchEntries } = useEntries();

  useFocusEffect(
    useCallback(() => {
      void fetchEntries();
    }, [fetchEntries]),
  );

  return (
    <ThemedView safe>
      <OfflineBanner visible={isOffline} />

      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: FONTS.modern }]}>
          My Journal
        </Text>
      </View>

      {loading ? (
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
          renderItem={({ item }) => <EntryCard entry={item} />}
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={() => router.push('/entry/new')}
        accessibilityLabel="New entry"
      >
        <Text style={[styles.fabText, { color: theme.background }]}>＋</Text>
      </Pressable>
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
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { fontSize: 28, lineHeight: 32 },
});
