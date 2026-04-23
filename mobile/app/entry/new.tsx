import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MoodSelector from '../../components/MoodSelector';
import OfflineBanner from '../../components/OfflineBanner';
import ThemedView from '../../components/ThemedView';
import { FONTS } from '../../constants/fonts';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../hooks/useAuth';
import { useEntries } from '../../hooks/useEntries';
import { ApiError, NetworkError, SubscriptionLimitError } from '../../services/api';

export default function NewEntryScreen() {
  const router = useRouter();
  const { theme, entryFont } = useSettings();
  const { createEntry, isOffline } = useEntries();
  const { isSubscriptionLimitReached } = useAuth();

  const [content, setContent] = useState('');
  const [mood, setMood] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limitReached = isSubscriptionLimitReached();
  const MAX_ENTRY_LENGTH = 10000;
  const charsLeft = MAX_ENTRY_LENGTH - content.length;

  async function submit() {
    if (!content.trim()) {
      setError('Write something first');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const entry = await createEntry(content.trim(), mood);
      router.replace(`/entry/${entry.id}`);
    } catch (e: unknown) {
      setSaving(false);
      if (e instanceof SubscriptionLimitError) {
        setError("You've used all 10 free entries this month.");
      } else if (e instanceof NetworkError) {
        setError("You're offline — your entry couldn't be saved");
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('Something went wrong');
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
            ← Back
          </Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: FONTS.modern }]}>
          New entry
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
                You've used all 10 free entries this month.{' '}
              </Text>
              <Pressable onPress={() => router.push('/(tabs)/settings')}>
                <Text style={[styles.upgradeLink, { color: theme.accent, fontFamily: FONTS.modern }]}>
                  Upgrade
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
              },
            ]}
            placeholder="Write freely… this is your space"
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
              {charsLeft} characters remaining
            </Text>
          )}

          {error && (
            <Text style={[styles.errorText, { color: theme.destructive, fontFamily: FONTS.modern }]}>{error}</Text>
          )}
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          <Pressable
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
                Save entry →
              </Text>
            )}
          </Pressable>
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
