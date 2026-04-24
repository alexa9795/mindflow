import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import ThemedView from '../../components/ThemedView';
import { FONT_OPTIONS, FONTS, FontKey } from '../../constants/fonts';
import { MOOD_EMOJIS, MOOD_SETS } from '../../constants/moods';
import { THEMES } from '../../constants/themes';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../hooks/useAuth';
import { api, ApiError } from '../../services/api';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, setThemeById, entryFont, setEntryFont, moodSetId, setMoodSetId } = useSettings();
  const { currentUser, logout, updateUser, toggleAI } = useAuth();

  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [aiToggleLoading, setAiToggleLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  function openEditName() {
    setNameInput(currentUser?.name ?? '');
    setNameError(null);
    setNameModalVisible(true);
  }

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError('Name cannot be empty');
      return;
    }
    setNameLoading(true);
    setNameError(null);
    try {
      const updated = await api.patchMe(trimmed);
      updateUser(updated);
      setNameModalVisible(false);
    } catch (e: unknown) {
      setNameError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setNameLoading(false);
    }
  }

  async function handleAIToggle(enabled: boolean) {
    setAiToggleLoading(true);
    try {
      await toggleAI(enabled);
    } catch {
      Alert.alert('Error', 'Could not update AI setting. Please try again.');
    } finally {
      setAiToggleLoading(false);
    }
  }

  function handleDeleteEntries() {
    Alert.alert(
      'Delete all entries',
      'This will permanently delete all your journal entries and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteEntries();
              Alert.alert('Done', 'All entries have been deleted.');
            } catch {
              Alert.alert('Error', 'Could not delete entries. Please try again.');
            }
          },
        },
      ],
    );
  }

  async function handleExportData() {
    try {
      const data = await api.exportData();
      const json = JSON.stringify(data, null, 2);
      const path = `${FileSystem.cacheDirectory}echo-export.json`;
      try {
        await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
      } catch {
        Alert.alert('Error', 'Could not write export file. Check device storage.');
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export journal data' });
      } else {
        Alert.alert('Export saved', `Your data has been saved to:\n${path}`);
      }
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        Alert.alert('Error', e.message);
      } else {
        Alert.alert('Error', 'Could not export data. Please try again.');
      }
    }
  }

  async function handleActivateTrial() {
    setTrialLoading(true);
    try {
      await api.activateTrial();
      const user = await api.getMe();
      updateUser(user);
      Alert.alert('Trial activated', 'Your 7-day trial is now active.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof ApiError ? e.message : 'Could not activate trial. Please try again.');
    } finally {
      setTrialLoading(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAccount();
              await logout();
              router.replace('/(auth)/login');
            } catch {
              Alert.alert('Error', 'Could not delete account. Please try again.');
            }
          },
        },
      ],
    );
  }

  return (
    <ThemedView safe>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: FONTS.modern }]}>
          Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Privacy ────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
          PRIVACY
        </Text>

        <View style={[styles.infoBlock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelCol}>
              <Text style={[styles.infoLabel, { color: theme.text, fontFamily: FONTS.modern }]}>
                AI Reflections
              </Text>
              <Text style={[styles.toggleSub, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                When off, your entries are never sent to any AI service.
              </Text>
            </View>
            <Switch
              value={currentUser?.ai_enabled ?? true}
              onValueChange={(v) => void handleAIToggle(v)}
              disabled={aiToggleLoading}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor={theme.background}
            />
          </View>
        </View>

        {/* ── Appearance ─────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
          APPEARANCE
        </Text>

        {/* Theme picker */}
        <Text style={[styles.label, { color: theme.text, fontFamily: FONTS.modern }]}>Theme</Text>
        <View style={styles.row}>
          {Object.values(THEMES).map((t) => (
            <Pressable
              key={t.id}
              style={[
                styles.themeSwatch,
                { backgroundColor: t.background, borderColor: t.border },
                theme.id === t.id && { borderColor: theme.accent, borderWidth: 2.5 },
              ]}
              onPress={() => void setThemeById(t.id)}
            >
              <View style={[styles.swatchInner, { backgroundColor: t.surface }]} />
              <Text style={[styles.swatchLabel, { color: t.text, fontFamily: FONTS.modern }]}>
                {t.name}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Font picker */}
        <Text style={[styles.label, { color: theme.text, fontFamily: FONTS.modern }]}>Font</Text>
        <View style={styles.fontGrid}>
          {FONT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              style={[
                styles.fontOption,
                { backgroundColor: theme.surface, borderColor: theme.border },
                entryFont === opt.key && { borderColor: theme.accent },
              ]}
              onPress={() => void setEntryFont(opt.key as FontKey)}
            >
              <Text style={[styles.fontSample, { color: theme.text, fontFamily: FONTS[opt.key] }]}>
                Amor fati — love your fate.
              </Text>
              <Text style={[styles.fontLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Mood icon set picker */}
        <Text style={[styles.label, { color: theme.text, fontFamily: FONTS.modern }]}>
          Mood icons
        </Text>
        <View style={styles.moodSets}>
          {Object.values(MOOD_SETS).map((set) => {
            const emojis = MOOD_EMOJIS[set.id] ?? MOOD_EMOJIS.basic;
            return (
              <Pressable
                key={set.id}
                style={[
                  styles.moodSetOption,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  moodSetId === set.id && { borderColor: theme.accent },
                ]}
                onPress={() => void setMoodSetId(set.id)}
              >
                <Text style={[styles.moodSetName, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                  {set.name}
                </Text>
                <View style={styles.moodPreviewRow}>
                  {emojis.map((emoji, i) => (
                    <Text key={i} style={styles.moodPreviewEmoji}>{emoji}</Text>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── Account ────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
          ACCOUNT
        </Text>

        <View style={[styles.infoBlock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              Email
            </Text>
            <Text style={[styles.infoValue, { color: theme.text, fontFamily: FONTS.modern }]}>
              {currentUser?.email ?? '—'}
            </Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />
          <Pressable style={styles.infoRow} onPress={openEditName}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              Name
            </Text>
            <View style={styles.infoValueRow}>
              <Text style={[styles.infoValue, { color: theme.text, fontFamily: FONTS.modern }]}>
                {currentUser?.name ?? '—'}
              </Text>
              <Text style={[styles.editChevron, { color: theme.accent, fontFamily: FONTS.modern }]}>
                Edit
              </Text>
            </View>
          </Pressable>
        </View>

        {currentUser?.subscription?.tier === 'free' && (
          <Pressable
            style={[styles.actionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => void handleActivateTrial()}
            disabled={trialLoading}
          >
            <Text style={[styles.actionText, { color: theme.accent, fontFamily: FONTS.modern }]}>
              {trialLoading ? 'Activating…' : 'Try free trial (7 days)'}
            </Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.actionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => void handleLogout()}
        >
          <Text style={[styles.actionText, { color: theme.text, fontFamily: FONTS.modern }]}>
            Sign out
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => void handleExportData()}
        >
          <Text style={[styles.actionText, { color: theme.text, fontFamily: FONTS.modern }]}>
            Export my data
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={handleDeleteEntries}
        >
          <Text style={[styles.actionText, { color: theme.destructive, fontFamily: FONTS.modern }]}>
            Delete all entries
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={handleDeleteAccount}
        >
          <Text style={[styles.actionText, { color: theme.destructive, fontFamily: FONTS.modern }]}>
            Delete account
          </Text>
        </Pressable>
      </ScrollView>

      {/* Edit name modal */}
      <Modal
        visible={nameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNameModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setNameModalVisible(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => undefined}
          >
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: FONTS.modern }]}>
              Edit name
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.background,
                  borderColor: nameError ? theme.destructive : theme.border,
                  color: theme.text,
                  fontFamily: FONTS.modern,
                },
              ]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              placeholderTextColor={theme.textSecondary}
              autoFocus
              maxLength={50}
            />
            {nameError && (
              <Text style={[styles.modalError, { color: theme.destructive, fontFamily: FONTS.modern }]}>
                {nameError}
              </Text>
            )}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, { borderColor: theme.border }]}
                onPress={() => setNameModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: theme.accent }]}
                onPress={() => void handleSaveName()}
                disabled={nameLoading}
              >
                <Text style={[styles.modalBtnText, { color: theme.background, fontFamily: FONTS.modern }]}>
                  {nameLoading ? 'Saving…' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  content: { padding: 20, paddingBottom: 60 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
  },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  themeSwatch: {
    flex: 1,
    height: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  swatchInner: { width: 32, height: 20, borderRadius: 6 },
  swatchLabel: { fontSize: 12, fontWeight: '600' },
  fontGrid: { gap: 10, marginBottom: 24 },
  fontOption: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
  },
  fontSample: { fontSize: 15, marginBottom: 4 },
  fontLabel: { fontSize: 12 },
  moodSets: { gap: 10, marginBottom: 24 },
  moodSetOption: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
  },
  moodSetName: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  moodPreviewRow: { flexDirection: 'row', gap: 8 },
  moodPreviewEmoji: { fontSize: 22 },
  infoBlock: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  toggleLabelCol: { flex: 1 },
  toggleSub: { fontSize: 12, marginTop: 2 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  infoValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  editChevron: { fontSize: 13 },
  actionRow: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  actionText: { fontSize: 15 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 8,
  },
  modalError: { fontSize: 13, marginBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalBtnPrimary: { borderWidth: 0 },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
});
