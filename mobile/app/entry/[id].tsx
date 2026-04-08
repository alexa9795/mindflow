import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import OfflineBanner from '../../components/OfflineBanner';
import ThemedView from '../../components/ThemedView';
import { FONTS } from '../../constants/fonts';
import { useSettings } from '../../context/SettingsContext';
import { api, ApiError, Entry, Message, NetworkError } from '../../services/api';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme, entryFont } = useSettings();
  const scrollRef = useRef<ScrollView>(null);

  const [entry, setEntry] = useState<Entry | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [loadingEntry, setLoadingEntry] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const fetched = await api.getEntry(id);
        setEntry(fetched);
        if (fetched.messages && fetched.messages.length > 0) {
          setMessages(fetched.messages);
        } else {
          setAiLoading(true);
          try {
            const msg = await api.respond(id);
            setMessages([msg]);
          } catch (e: unknown) {
            if (e instanceof NetworkError) setIsOffline(true);
          } finally {
            setAiLoading(false);
          }
        }
      } catch (e: unknown) {
        if (e instanceof NetworkError) setIsOffline(true);
        else setError('Failed to load entry');
      } finally {
        setLoadingEntry(false);
      }
    })();
  }, [id]);

  async function sendReply() {
    if (!reply.trim() || !id) return;
    const text = reply.trim();
    setReply('');
    setSendLoading(true);
    setIsOffline(false);
    try {
      const res = await api.addMessage(id, text);
      setMessages((prev) => [...prev, res.user_message, res.assistant_message]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: unknown) {
      if (e instanceof NetworkError) {
        setIsOffline(true);
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('Failed to send reply');
      }
      setReply(text);
    } finally {
      setSendLoading(false);
    }
  }

  const activeEntryFont = FONTS[entryFont];

  if (loadingEntry) {
    return (
      <ThemedView safe style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </ThemedView>
    );
  }

  if (!entry) {
    return (
      <ThemedView safe style={styles.center}>
        <Text style={[styles.errorText, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
          {error ?? 'Entry not found'}
        </Text>
      </ThemedView>
    );
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

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
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Timestamp — once at the top */}
          <Text style={[styles.timestamp, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
            {formatDate(entry.created_at)}
          </Text>

          {/* Original entry text */}
          <View style={[styles.entryBubble, { backgroundColor: theme.accent }]}>
            <Text style={[styles.entryText, { color: theme.background, fontFamily: activeEntryFont }]}>
              {entry.content}
            </Text>
          </View>

          {/* Conversation messages */}
          {messages.map((m) => (
            <AIMessage key={m.id} message={m} />
          ))}

          {/* AI thinking indicator */}
          {aiLoading && (
            <View style={[styles.thinkingBubble, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ActivityIndicator color={theme.accent} style={{ alignSelf: 'flex-start' }} />
            </View>
          )}

          {error && (
            <Text style={[styles.errorText, { color: '#DC2626', fontFamily: FONTS.modern }]}>
              {error}
            </Text>
          )}
        </ScrollView>

        {/* Reply bar */}
        <View style={[styles.replyBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <TextInput
            style={[
              styles.replyInput,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: FONTS.modern,
              },
            ]}
            placeholder="Reply…"
            placeholderTextColor={theme.textSecondary}
            value={reply}
            onChangeText={setReply}
            multiline
            maxLength={1000}
          />
          <Pressable
            style={[
              styles.sendBtn,
              { backgroundColor: theme.accent },
              (!reply.trim() || sendLoading) && styles.sendBtnDisabled,
            ]}
            onPress={() => void sendReply()}
            disabled={!reply.trim() || sendLoading}
          >
            {sendLoading ? (
              <ActivityIndicator color={theme.background} size="small" />
            ) : (
              <Text style={[styles.sendBtnText, { color: theme.background }]}>↑</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
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
  headerSpacer: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 24 },
  timestamp: { fontSize: 12, textAlign: 'center', marginBottom: 4 },
  entryBubble: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
    padding: 16,
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  entryText: { fontSize: 16, lineHeight: 24 },
  thinkingBubble: {
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    padding: 14,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  errorText: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 28,
    gap: 8,
    borderTopWidth: 1,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 20, fontWeight: '700' },
});
