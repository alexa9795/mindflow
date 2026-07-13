import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MoodSelector from '../../components/MoodSelector';
import OfflineBanner from '../../components/OfflineBanner';
import PressableScale from '../../components/PressableScale';
import ThemedView from '../../components/ThemedView';
import { FONTS, scaledFontSize } from '../../constants/fonts';
import { notifySuccess } from '../../constants/haptics';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../hooks/useAuth';
import { useEntries } from '../../hooks/useEntries';
import { ApiError, NetworkError, SubscriptionLimitError } from '../../services/api';

const FREE_TIER_ENTRY_LIMIT = 10;

export default function NewEntryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, entryFont } = useSettings();
  const { createEntry, isOffline } = useEntries();
  const { isSubscriptionLimitReached, currentUser } = useAuth();

  const [content, setContent] = useState('');
  const [mood, setMood] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limitReached = isSubscriptionLimitReached();
  const aiEnabled = currentUser?.ai_enabled ?? false;
  const MAX_ENTRY_LENGTH = 10000;
  const charsLeft = MAX_ENTRY_LENGTH - content.length;

  async function submit() {
    if (!content.trim()) {
      setError(t('newEntry.writeSomethingFirst'));
      return;
    }
    Keyboard.dismiss();
    setError(null);
    setSaving(true);
    try {
      const entry = await createEntry(content.trim(), mood);
      notifySuccess();
      router.replace(`/entry/${entry.id}`);
    } catch (e: unknown) {
      setSaving(false);
      if (e instanceof SubscriptionLimitError) {
        setError(t('newEntry.usedAllFree', { count: FREE_TIER_ENTRY_LIMIT }));
      } else if (e instanceof NetworkError) {
        setError(t('newEntry.offlineNotSaved'));
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError(t('common.somethingWrong'));
      }
    }
  }

  const activeEntryFont = FONTS[entryFont];

  return (
    <ThemedView safe>

      <OfflineBanner visible={isOffline} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backBtn, { color: theme.accent, fontFamily: FONTS.modern }]}>
            {t('common.back')}
          </Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: FONTS.modern }]}>
          {t('newEntry.headerTitle')}
        </Text>
        <View style={{ width: 52 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <MoodSelector selected={mood} onSelect={setMood} />

          {limitReached && (
            <View style={[styles.limitBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.limitText, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                {t('newEntry.usedAllFree', { count: FREE_TIER_ENTRY_LIMIT })}{' '}
              </Text>
              <Pressable onPress={() => router.push('/paywall')}>
                <Text style={[styles.upgradeLink, { color: theme.accent, fontFamily: FONTS.modern }]}>
                  {t('newEntry.upgrade')}
                </Text>
              </Pressable>
            </View>
          )}

          <TextInput
            style={[
              styles.journal,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: activeEntryFont,
                fontSize: scaledFontSize(entryFont, 17),
                lineHeight: scaledFontSize(entryFont, 26),
              },
            ]}
            placeholder={t('newEntry.journalPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            autoFocus
            maxLength={MAX_ENTRY_LENGTH}
          />

          {charsLeft < 500 && (
            <Text style={[
              styles.charCount,
              { color: charsLeft < 100 ? theme.destructive : theme.textSecondary, fontFamily: FONTS.modern },
            ]}>
              {t('newEntry.charsRemaining', { count: charsLeft })}
            </Text>
          )}

          {error && (
            <Text style={[styles.errorText, { color: theme.destructive, fontFamily: FONTS.modern }]}>{error}</Text>
          )}
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          {!aiEnabled && (
            <Text style={[styles.aiOffNote, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              {t('newEntry.aiOffNote')}
            </Text>
          )}
          <PressableScale
            style={[
              styles.saveBtn,
              { backgroundColor: theme.accent },
              (saving || limitReached) && styles.saveBtnDisabled,
            ]}
            onPress={submit}
            disabled={saving || limitReached}
          >
            {saving ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <Text style={[styles.saveBtnText, { color: theme.background, fontFamily: FONTS.modern }]}>
                {t('newEntry.saveEntry')}
              </Text>
            )}
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backBtn: { fontSize: 15, width: 52 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 20 },
  journal: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    fontSize: 17,
    lineHeight: 26,
    minHeight: 220,
  },
  errorText: {
    fontSize: 14,
    marginTop: 10,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
  },
  limitText: { fontSize: 13 },
  upgradeLink: { fontSize: 13, fontWeight: '600' },
  aiOffNote: { fontSize: 12, textAlign: 'center', marginBottom: 8 },
  footer: {
    padding: 20,
    paddingBottom: 32,
  },
  saveBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontWeight: '700', fontSize: 16 },
});
