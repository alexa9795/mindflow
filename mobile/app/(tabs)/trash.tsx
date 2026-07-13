import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemedView from '../../components/ThemedView';
import { FONTS } from '../../constants/fonts';
import { SPACING, RADIUS } from '../../constants/tokens';
import { useSettings } from '../../context/SettingsContext';
import { api, ApiError, Entry } from '../../services/api';

const TRASH_RETENTION_DAYS = 30;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Human-friendly relative date for the deletion timestamp. */
function formatDeletedDate(iso: string, t: TFunction): string {
  const then = new Date(iso);
  const dayDiff = Math.round((startOfDay(new Date()) - startOfDay(then)) / 86_400_000);

  if (dayDiff <= 0) return t('trashScreen.deletedToday');
  if (dayDiff === 1) return t('trashScreen.deletedYesterday');
  return t('trashScreen.deletedDaysAgo', { count: dayDiff });
}

/** Days remaining before this entry is permanently purged from the trash. */
function daysUntilPurge(iso: string): number {
  const then = new Date(iso);
  const dayDiff = Math.round((startOfDay(new Date()) - startOfDay(then)) / 86_400_000);
  return Math.max(TRASH_RETENTION_DAYS - dayDiff, 0);
}

export default function TrashScreen() {
  const { theme } = useSettings();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTrash();
      setEntries(res.entries);
    } catch {
      Alert.alert(t('common.error'), t('trashScreen.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void loadTrash();
    }, [loadTrash]),
  );

  async function handleRestore(id: string) {
    setRestoringId(id);
    try {
      await api.restoreEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof ApiError ? e.message : t('trashScreen.restoreError'));
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <ThemedView safe edges={['left', 'right']}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: insets.top + 16 },
        ]}
      >
        <Text style={[styles.title, { color: theme.text, fontFamily: FONTS.modern }]}>
          {t('trashScreen.title')}
        </Text>
      </View>

      <View style={[styles.infoBanner, { backgroundColor: theme.accent + '14', borderColor: theme.accent + '30' }]}>
        <Text style={[styles.infoBannerText, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
          {t('trashScreen.retentionNotice', { days: TRASH_RETENTION_DAYS })}
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
          contentContainerStyle={entries.length === 0 ? styles.centerContent : styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🗑️</Text>
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: FONTS.modern }]}>
                {t('trashScreen.emptyTitle')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                {t('trashScreen.emptySubtitle')}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardBody}>
                <Text style={[styles.deletedAt, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                  {item.deleted_at ? formatDeletedDate(item.deleted_at, t) : ''}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[styles.preview, { color: theme.text, fontFamily: FONTS.modern }]}
                >
                  {item.content.slice(0, 80)}
                </Text>
                {item.deleted_at && (
                  <Text style={[styles.purgeNotice, { color: theme.destructive, fontFamily: FONTS.modern }]}>
                    {daysUntilPurge(item.deleted_at) <= 0
                      ? t('trashScreen.purgeSoon')
                      : t('trashScreen.daysLeft', { count: daysUntilPurge(item.deleted_at) })}
                  </Text>
                )}
              </View>
              <Pressable
                style={[styles.restoreBtn, { borderColor: theme.accent }]}
                onPress={() => void handleRestore(item.id)}
                disabled={restoringId === item.id}
              >
                <Text style={[styles.restoreText, { color: theme.accent, fontFamily: FONTS.modern }]}>
                  {restoringId === item.id ? t('trashScreen.restoring') : t('trashScreen.restore')}
                </Text>
              </Pressable>
            </View>
          )}
        />
      )}
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
  infoBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  infoBannerText: { fontSize: 12, lineHeight: 17 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 60 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { fontSize: 15 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  cardBody: { flex: 1 },
  deletedAt: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  preview: { fontSize: 15, lineHeight: 20 },
  purgeNotice: { fontSize: 11, fontWeight: '600', marginTop: 6 },
  restoreBtn: {
    borderWidth: 1.5,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  restoreText: { fontSize: 13, fontWeight: '700' },
});
