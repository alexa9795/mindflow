import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, Entry, Message, setToken, User } from './services/api';

type Screen =
  | { name: 'loading' }
  | { name: 'auth' }
  | { name: 'entries' }
  | { name: 'newEntry' }
  | { name: 'entry'; entry: Entry };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'loading' });

  useEffect(() => {
    AsyncStorage.getItem('token').then((token) => {
      if (token) {
        setToken(token);
        setScreen({ name: 'entries' });
      } else {
        setScreen({ name: 'auth' });
      }
    });
  }, []);

  function handleAuth(token: string) {
    AsyncStorage.setItem('token', token);
    setToken(token);
    setScreen({ name: 'entries' });
  }

  function handleLogout() {
    AsyncStorage.removeItem('token');
    setToken(null);
    setScreen({ name: 'auth' });
  }

  if (screen.name === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  if (screen.name === 'auth') {
    return <AuthScreen onAuth={handleAuth} />;
  }

  if (screen.name === 'entries') {
    return (
      <EntriesScreen
        onNewEntry={() => setScreen({ name: 'newEntry' })}
        onOpenEntry={(entry) => setScreen({ name: 'entry', entry })}
        onLogout={handleLogout}
      />
    );
  }

  if (screen.name === 'newEntry') {
    return (
      <NewEntryScreen
        onCreated={(entry) => setScreen({ name: 'entry', entry })}
        onBack={() => setScreen({ name: 'entries' })}
      />
    );
  }

  if (screen.name === 'entry') {
    return (
      <EntryScreen
        entry={screen.entry}
        onBack={() => setScreen({ name: 'entries' })}
      />
    );
  }

  return null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function AuthScreen({ onAuth }: { onAuth: (token: string, user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email || !password || (mode === 'register' && !name)) {
      Alert.alert('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register(email, password, name);
      onAuth(res.token, res.user);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.center}
    >
      <StatusBar style="dark" />
      <Text style={styles.logo}>🧠 MindFlow</Text>
      <Text style={styles.tagline}>Your AI journaling companion</Text>

      <View style={styles.card}>
        {mode === 'register' && (
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Text>
          )}
        </Pressable>
      </View>

      <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
        <Text style={styles.switchText}>
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

// ─── Entries list ─────────────────────────────────────────────────────────────

function EntriesScreen({
  onNewEntry,
  onOpenEntry,
  onLogout,
}: {
  onNewEntry: () => void;
  onOpenEntry: (e: Entry) => void;
  onLogout: () => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getEntries().then((res) => {
      setEntries(res.entries);
      setLoading(false);
    });
  }, []);

  const moodEmoji = (score?: number) =>
    (['', '😢', '😕', '😐', '🙂', '😊'] as const)[score ?? 0] ?? '';

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Journal</Text>
        <Pressable onPress={onLogout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerStyle={
            entries.length === 0 ? styles.center : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✍️</Text>
              <Text style={styles.emptyText}>No entries yet</Text>
              <Text style={styles.emptySubtext}>
                Start writing to begin your journey
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.entryCard} onPress={() => onOpenEntry(item)}>
              <View style={styles.entryRow}>
                <Text style={styles.entryDate}>{formatDate(item.created_at)}</Text>
                {item.mood_score && (
                  <Text style={styles.moodBadge}>{moodEmoji(item.mood_score)}</Text>
                )}
              </View>
              <Text style={styles.entryPreview} numberOfLines={2}>
                {item.content}
              </Text>
            </Pressable>
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={onNewEntry}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </View>
  );
}

// ─── New entry ────────────────────────────────────────────────────────────────

function NewEntryScreen({
  onCreated,
  onBack,
}: {
  onCreated: (entry: Entry) => void;
  onBack: () => void;
}) {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!content.trim()) {
      Alert.alert('Write something first');
      return;
    }
    setLoading(true);
    try {
      const entry = await api.createEntry(content.trim(), mood);
      onCreated(entry);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong');
      setLoading(false);
    }
  }

  const moods = [
    { score: 1, emoji: '😢' },
    { score: 2, emoji: '😕' },
    { score: 3, emoji: '😐' },
    { score: 4, emoji: '🙂' },
    { score: 5, emoji: '😊' },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New Entry</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.newEntryContent}>
        <Text style={styles.label}>How are you feeling?</Text>
        <View style={styles.moodRow}>
          {moods.map((m) => (
            <Pressable
              key={m.score}
              style={[styles.moodBtn, mood === m.score && styles.moodBtnSelected]}
              onPress={() => setMood(mood === m.score ? undefined : m.score)}
            >
              <Text style={styles.moodBtnEmoji}>{m.emoji}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>What's on your mind?</Text>
        <TextInput
          style={styles.journal}
          placeholder="Write freely... this is your space"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          autoFocus
        />
      </ScrollView>

      <View style={styles.submitRow}>
        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Save & get reflection →</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Entry detail + AI conversation ──────────────────────────────────────────

function EntryScreen({
  entry: initialEntry,
  onBack,
}: {
  entry: Entry;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    api.getEntry(initialEntry.id).then(async (entry) => {
      if (!entry.messages || entry.messages.length === 0) {
        setAiLoading(true);
        try {
          const msg = await api.respond(entry.id);
          setMessages([msg]);
        } catch {
          // AI unavailable, continue without response
        } finally {
          setAiLoading(false);
        }
      } else {
        setMessages(entry.messages);
      }
    });
  }, [initialEntry.id]);

  async function sendReply() {
    if (!reply.trim()) return;
    const text = reply.trim();
    setReply('');
    setLoading(true);
    try {
      const res = await api.addMessage(initialEntry.id, text);
      setMessages((prev) => [...prev, res.user_message, res.assistant_message]);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{formatDate(initialEntry.created_at)}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.conversationContent}>
        <View style={styles.userBubble}>
          <Text style={styles.userBubbleText}>{initialEntry.content}</Text>
        </View>

        {messages.map((m) =>
          m.role === 'assistant' ? (
            <View key={m.id} style={styles.aiBubble}>
              <Text style={styles.aiLabel}>🧠 MindFlow</Text>
              <Text style={styles.aiBubbleText}>{m.content}</Text>
            </View>
          ) : (
            <View key={m.id} style={styles.userBubble}>
              <Text style={styles.userBubbleText}>{m.content}</Text>
            </View>
          )
        )}

        {aiLoading && (
          <View style={styles.aiBubble}>
            <Text style={styles.aiLabel}>🧠 MindFlow</Text>
            <ActivityIndicator
              color={PURPLE}
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.replyRow}>
        <TextInput
          style={styles.replyInput}
          placeholder="Reply..."
          value={reply}
          onChangeText={setReply}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[
            styles.sendBtn,
            (!reply.trim() || loading) && styles.sendBtnDisabled,
          ]}
          onPress={sendReply}
          disabled={!reply.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendBtnText}>↑</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PURPLE = '#7C3AED';
const PURPLE_LIGHT = '#EDE9FE';

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FAFAFA' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },

  // Auth
  logo: { fontSize: 32, fontWeight: '800', color: PURPLE, marginBottom: 4 },
  tagline: { fontSize: 14, color: '#6B7280', marginBottom: 32 },
  card: { width: '100%', paddingHorizontal: 24, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  btn: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  switchText: { color: PURPLE, fontSize: 14, marginTop: 8 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  backText: { color: PURPLE, fontSize: 15, width: 60 },
  logoutText: { color: '#9CA3AF', fontSize: 14 },

  // Entries list
  listContent: { padding: 16 },
  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  entryDate: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  moodBadge: { fontSize: 16 },
  entryPreview: { fontSize: 15, color: '#374151', lineHeight: 22 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF' },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PURPLE,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },

  // New entry
  newEntryContent: { padding: 20 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
    marginTop: 8,
  },
  moodRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  moodBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodBtnSelected: { borderColor: PURPLE, backgroundColor: PURPLE_LIGHT },
  moodBtnEmoji: { fontSize: 26 },
  journal: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 220,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  submitRow: {
    padding: 20,
    paddingBottom: 36,
    backgroundColor: '#FAFAFA',
  },

  // Conversation
  conversationContent: { padding: 16, gap: 12 },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: PURPLE,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    padding: 14,
    maxWidth: '85%',
  },
  userBubbleText: { fontSize: 15, lineHeight: 22, color: '#fff' },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 14,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  aiLabel: { fontSize: 11, fontWeight: '700', color: PURPLE, marginBottom: 6 },
  aiBubbleText: { fontSize: 15, lineHeight: 22, color: '#1F2937' },

  // Reply bar
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 32,
    gap: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    backgroundColor: '#FAFAFA',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
