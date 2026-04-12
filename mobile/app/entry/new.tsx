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
import AIMessage from '../../components/AIMessage';
import MoodSelector from '../../components/MoodSelector';
import OfflineBanner from '../../components/OfflineBanner';
import ThemedView from '../../components/ThemedView';
import { COMPANION_NAME } from '../../constants/config';
import { FONTS } from '../../constants/fonts';
import { useSettings } from '../../context/SettingsContext';
import { useEntries } from '../../hooks/useEntries';
import { ApiError, Message, NetworkError } from '../../services/api';

export default function NewEntryScreen() {
  const router = useRouter();
  const { theme, entryFont } = useSettings();
  const { createEntry, requestAIResponse, isOffline } = useEntries();

  const [content, setContent] = useState('');
  const [mood, setMood] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<Message | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!content.trim()) {
      setError('Write something first');
      return;
    }
    setError(null);
    setSaving(true);

    try {
      const entry = await createEntry(content.trim(), mood);
      setSaving(false);
      setAiLoading(true);

      try {
        const msg = await requestAIResponse(entry.id);
        setAiMessage(msg);
        setTimeout(() => router.replace(`/entry/${entry.id}`), 1200);
      } catch (e: unknown) {
        router.replace(`/entry/${entry.id}`);
      } finally {
        setAiLoading(false);
      }
    } catch (e: unknown) {
      setSaving(false);
      if (e instanceof NetworkError) {
        setError("You're offline — your entry couldn't be saved");
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('Something went wrong');
      }
    }
  }

  const isSubmitting = saving || aiLoading;
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
        <Pressable onPress={() => undefined} hitSlop={12}>
          <Text style={[styles.fontToggle, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
            Aa
          </Text>
        </Pressable>
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
          />

          {error && (
            <Text style={[styles.errorText, { fontFamily: FONTS.modern }]}>{error}</Text>
          )}

          {aiLoading && (
            <View style={[styles.thinkingBubble, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ActivityIndicator color={theme.accent} style={styles.thinkingSpinner} />
              <Text style={[styles.thinkingText, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                {COMPANION_NAME} is thinking…
              </Text>
            </View>
          )}

          {aiMessage && <AIMessage message={aiMessage} />}
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          <Pressable
            style={[
              styles.saveBtn,
              { backgroundColor: theme.accent },
              isSubmitting && styles.saveBtnDisabled,
            ]}
            onPress={submit}
            disabled={isSubmitting}
          >
            {saving ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <Text style={[styles.saveBtnText, { color: theme.background, fontFamily: FONTS.modern }]}>
                {aiLoading ? 'Getting reflection…' : 'Save & get reflection →'}
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
  fontToggle: { fontSize: 15, width: 52, textAlign: 'right' },
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
    color: '#DC2626',
    fontSize: 14,
    marginTop: 10,
  },
  thinkingBubble: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  thinkingSpinner: { alignSelf: 'flex-start' },
  thinkingText: {
    fontSize: 13,
    marginTop: 6,
    fontStyle: 'italic',
  },
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
