import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemedView from '../../components/ThemedView';
import { APP_NAME } from '../../constants/config';
import { FONT_OPTIONS, FONTS, FontKey, scaledFontSize } from '../../constants/fonts';
import { MOOD_EMOJIS, MOOD_SETS } from '../../constants/moods';
import { SUPPORTED_LOCALES } from '../../constants/locales';
import {
  SYSTEM_DARK_THEME_ID,
  SYSTEM_LIGHT_THEME_ID,
  SYSTEM_THEME_ID,
  THEMES,
} from '../../constants/themes';
import { useSettings } from '../../context/SettingsContext';
import { useAuth, BIOMETRIC_ENABLED_KEY } from '../../hooks/useAuth';
import { api, ApiError } from '../../services/api';

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme, themeMode, setThemeById, entryFont, setEntryFont, moodSetId, setMoodSetId, locale, setLocale } = useSettings();
  const { currentUser, logout, updateUser, toggleAI } = useAuth();
  const [languageSyncLoading, setLanguageSyncLoading] = useState(false);

  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [aiToggleLoading, setAiToggleLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);

  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [issueInput, setIssueInput] = useState('');
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Biometric state — only show the toggle if hardware + enrolled face/fingerprint exists.
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    void (async () => {
      const [hasHardware, isEnrolled, stored] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY),
      ]);
      setBiometricAvailable(hasHardware && isEnrolled);
      setBiometricEnabled(stored === 'true');
    })();
  }, []);

  async function handleBiometricToggle(enabled: boolean) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
    setBiometricEnabled(enabled);
  }

  async function handleLogout() {
    Alert.alert(t('settingsScreen.alerts.signOutTitle'), t('settingsScreen.alerts.signOutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settingsScreen.signOut'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  async function handleLanguageChange(code: string) {
    await setLocale(code);
    if (!currentUser) return;
    setLanguageSyncLoading(true);
    try {
      await api.updateLocale(code);
      updateUser({ ...currentUser, locale: code });
    } catch {
      Alert.alert(t('common.error'), t('settingsScreen.alerts.languageSyncError'));
    } finally {
      setLanguageSyncLoading(false);
    }
  }

  function openEditName() {
    setNameInput(currentUser?.name ?? '');
    setNameError(null);
    setNameModalVisible(true);
  }

  function openReportIssue() {
    setIssueInput('');
    setIssueError(null);
    setIssueModalVisible(true);
  }

  async function handleSubmitIssue() {
    const trimmed = issueInput.trim();
    if (!trimmed) {
      setIssueError(t('settingsScreen.reportIssueModal.errorEmpty'));
      return;
    }
    setIssueLoading(true);
    setIssueError(null);
    try {
      await api.reportIssue(trimmed, Constants.expoConfig?.version ?? '', Platform.OS);
      setIssueModalVisible(false);
      Alert.alert(t('settingsScreen.reportIssueModal.sentTitle'), t('settingsScreen.reportIssueModal.sentMessage'));
    } catch (e: unknown) {
      setIssueError(e instanceof ApiError ? e.message : t('common.somethingWrong'));
    } finally {
      setIssueLoading(false);
    }
  }

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError(t('settingsScreen.editNameModal.errorEmpty'));
      return;
    }
    setNameLoading(true);
    setNameError(null);
    try {
      const updated = await api.patchMe(trimmed);
      updateUser(updated);
      setNameModalVisible(false);
    } catch (e: unknown) {
      setNameError(e instanceof ApiError ? e.message : t('common.somethingWrong'));
    } finally {
      setNameLoading(false);
    }
  }

  async function handleAIToggle(enabled: boolean) {
    setAiToggleLoading(true);
    try {
      await toggleAI(enabled);
    } catch {
      Alert.alert(t('common.error'), t('settingsScreen.alerts.aiToggleError'));
    } finally {
      setAiToggleLoading(false);
    }
  }

  function handleDeleteEntries() {
    Alert.alert(
      t('settingsScreen.alerts.deleteEntriesTitle'),
      t('settingsScreen.alerts.deleteEntriesMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settingsScreen.alerts.deleteAll'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteEntries();
              Alert.alert(t('settingsScreen.alerts.done'), t('settingsScreen.alerts.entriesDeletedMessage'));
            } catch {
              Alert.alert(t('common.error'), t('settingsScreen.alerts.deleteEntriesError'));
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
      const path = `${FileSystem.cacheDirectory}mindflow-export.json`;
      try {
        await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
      } catch {
        Alert.alert(t('common.error'), t('settingsScreen.alerts.exportWriteError'));
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export journal data' });
      } else {
        Alert.alert(t('settingsScreen.alerts.exportSavedTitle'), t('settingsScreen.alerts.exportSavedMessage', { path }));
      }
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        Alert.alert(t('common.error'), e.message);
      } else {
        Alert.alert(t('common.error'), t('settingsScreen.alerts.exportError'));
      }
    }
  }

  async function handleActivateTrial() {
    setTrialLoading(true);
    try {
      await api.activateTrial();
      const user = await api.getMe();
      updateUser(user);
      Alert.alert(t('settingsScreen.alerts.trialActivatedTitle'), t('settingsScreen.alerts.trialActivatedMessage'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof ApiError ? e.message : t('settingsScreen.alerts.trialError'));
    } finally {
      setTrialLoading(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      t('settingsScreen.alerts.deleteAccountTitle'),
      t('settingsScreen.alerts.deleteAccountMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settingsScreen.deleteAccount'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAccount();
              await logout();
              router.replace('/(auth)/login');
            } catch {
              Alert.alert(t('common.error'), t('settingsScreen.alerts.deleteAccountError'));
            }
          },
        },
      ],
    );
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
          {t('settingsScreen.title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Security ───────────────────────────────────────── */}
        {biometricAvailable && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              {t('settingsScreen.security')}
            </Text>
            <View style={[styles.infoBlock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelCol}>
                  <Text style={[styles.infoLabel, { color: theme.text, fontFamily: FONTS.modern }]}>
                    {t('settingsScreen.faceIdLabel')}
                  </Text>
                  <Text style={[styles.toggleSub, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                    {t('settingsScreen.faceIdSub')}
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={(v) => void handleBiometricToggle(v)}
                  trackColor={{ false: theme.border, true: theme.accent }}
                  thumbColor={theme.background}
                />
              </View>
            </View>
          </>
        )}

        {/* ── Privacy ────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
          {t('settingsScreen.privacy')}
        </Text>

        <View style={[styles.infoBlock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelCol}>
              <Text style={[styles.infoLabel, { color: theme.text, fontFamily: FONTS.modern }]}>
                {t('settingsScreen.aiReflectionsLabel')}
              </Text>
              <Text style={[styles.toggleSub, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                {t('settingsScreen.aiReflectionsSub')}
              </Text>
            </View>
            <Switch
              value={currentUser?.ai_enabled ?? false}
              onValueChange={(v) => void handleAIToggle(v)}
              disabled={aiToggleLoading}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor={theme.background}
            />
          </View>
        </View>

        {/* ── Appearance ─────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
          {t('settingsScreen.appearance')}
        </Text>

        {/* Theme picker */}
        <Text style={[styles.label, { color: theme.text, fontFamily: FONTS.modern }]}>{t('settingsScreen.theme')}</Text>
        <View style={styles.row}>
          {Object.values(THEMES).map((th) => (
            <Pressable
              key={th.id}
              style={[
                styles.themeSwatch,
                { backgroundColor: th.background, borderColor: th.border },
                themeMode === th.id && { borderColor: theme.accent, borderWidth: 2.5 },
              ]}
              onPress={() => void setThemeById(th.id)}
            >
              <View style={[styles.swatchInner, { backgroundColor: th.surface }]} />
              <Text style={[styles.swatchLabel, { color: th.text, fontFamily: FONTS.modern }]}>
                {t(`settingsScreen.themeNames.${th.id}`, { defaultValue: th.name })}
              </Text>
            </Pressable>
          ))}
          <Pressable
            key={SYSTEM_THEME_ID}
            style={[
              styles.themeSwatch,
              styles.systemSwatch,
              { borderColor: THEMES[SYSTEM_DARK_THEME_ID].border },
              themeMode === SYSTEM_THEME_ID && { borderColor: theme.accent, borderWidth: 2.5 },
            ]}
            onPress={() => void setThemeById(SYSTEM_THEME_ID)}
          >
            <View style={styles.systemSwatchHalves}>
              <View style={[styles.systemSwatchHalf, { backgroundColor: THEMES[SYSTEM_LIGHT_THEME_ID].background }]} />
              <View style={[styles.systemSwatchHalf, { backgroundColor: THEMES[SYSTEM_DARK_THEME_ID].background }]} />
            </View>
            <Text style={[styles.swatchLabel, { color: theme.text, fontFamily: FONTS.modern }]}>
              {t('settingsScreen.system')}
            </Text>
          </Pressable>
        </View>

        {/* Font picker */}
        <Text style={[styles.label, { color: theme.text, fontFamily: FONTS.modern }]}>{t('settingsScreen.font')}</Text>
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
              <Text
                style={[
                  styles.fontSample,
                  {
                    color: theme.text,
                    fontFamily: FONTS[opt.key],
                    fontSize: scaledFontSize(opt.key, 15),
                    lineHeight: scaledFontSize(opt.key, 20),
                  },
                ]}
              >
                {t('settingsScreen.fontSample')}
              </Text>
              <Text style={[styles.fontLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                {t(`settingsScreen.fontNames.${opt.key}`, { defaultValue: opt.label })}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Mood icon set picker */}
        <Text style={[styles.label, { color: theme.text, fontFamily: FONTS.modern }]}>
          {t('settingsScreen.moodIcons')}
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
                  {t(`settingsScreen.moodSetNames.${set.id}`, { defaultValue: set.name })}
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

        {/* Language picker */}
        <Text style={[styles.label, { color: theme.text, fontFamily: FONTS.modern }]}>
          {t('settingsScreen.language')}
        </Text>
        <View style={styles.fontGrid}>
          {SUPPORTED_LOCALES.map((l) => (
            <Pressable
              key={l.code}
              style={[
                styles.fontOption,
                { backgroundColor: theme.surface, borderColor: theme.border },
                locale === l.code && { borderColor: theme.accent },
              ]}
              onPress={() => void handleLanguageChange(l.code)}
              disabled={languageSyncLoading}
            >
              <Text style={[styles.fontLabel, { color: theme.text, fontFamily: FONTS.modern }]}>
                {l.nativeLabel}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Account ────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
          {t('settingsScreen.account')}
        </Text>

        <View style={[styles.infoBlock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              {t('settingsScreen.email')}
            </Text>
            <Text style={[styles.infoValue, { color: theme.text, fontFamily: FONTS.modern }]}>
              {currentUser?.email ?? '—'}
            </Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />
          <Pressable style={styles.infoRow} onPress={openEditName}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              {t('settingsScreen.name')}
            </Text>
            <View style={styles.infoValueRow}>
              <Text style={[styles.infoValue, { color: theme.text, fontFamily: FONTS.modern }]}>
                {currentUser?.name ?? '—'}
              </Text>
              <Text style={[styles.editChevron, { color: theme.accent, fontFamily: FONTS.modern }]}>
                {t('settingsScreen.edit')}
              </Text>
            </View>
          </Pressable>
        </View>

        {currentUser?.subscription?.tier === 'free' && (
          <>
            <Pressable
              style={[styles.actionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push('/paywall')}
            >
              <Text style={[styles.actionText, { color: theme.accent, fontFamily: FONTS.modern }]}>
                {t('settingsScreen.upgradeToPro', { appName: APP_NAME })}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => void handleActivateTrial()}
              disabled={trialLoading}
            >
              <Text style={[styles.actionText, { color: theme.accent, fontFamily: FONTS.modern }]}>
                {trialLoading ? t('settingsScreen.activating') : t('settingsScreen.freeTrial')}
              </Text>
            </Pressable>
          </>
        )}

        <Pressable
          style={[styles.actionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => void handleLogout()}
        >
          <Text style={[styles.actionText, { color: theme.text, fontFamily: FONTS.modern }]}>
            {t('settingsScreen.signOut')}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => void handleExportData()}
        >
          <Text style={[styles.actionText, { color: theme.text, fontFamily: FONTS.modern }]}>
            {t('settingsScreen.exportData')}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={openReportIssue}
        >
          <Text style={[styles.actionText, { color: theme.text, fontFamily: FONTS.modern }]}>
            {t('settingsScreen.reportIssue')}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={handleDeleteEntries}
        >
          <Text style={[styles.actionText, { color: theme.destructive, fontFamily: FONTS.modern }]}>
            {t('settingsScreen.deleteAllEntries')}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={handleDeleteAccount}
        >
          <Text style={[styles.actionText, { color: theme.destructive, fontFamily: FONTS.modern }]}>
            {t('settingsScreen.deleteAccount')}
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
              {t('settingsScreen.editNameModal.title')}
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
              placeholder={t('settingsScreen.editNameModal.placeholder')}
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
                  {t('settingsScreen.editNameModal.cancel')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: theme.accent }]}
                onPress={() => void handleSaveName()}
                disabled={nameLoading}
              >
                <Text style={[styles.modalBtnText, { color: theme.background, fontFamily: FONTS.modern }]}>
                  {nameLoading ? t('settingsScreen.editNameModal.saving') : t('settingsScreen.editNameModal.save')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Report an issue modal */}
      <Modal
        visible={issueModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIssueModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIssueModalVisible(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => undefined}
          >
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: FONTS.modern }]}>
              {t('settingsScreen.reportIssueModal.title')}
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
              {t('settingsScreen.reportIssueModal.subtitle')}
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                styles.modalInputMultiline,
                {
                  backgroundColor: theme.background,
                  borderColor: issueError ? theme.destructive : theme.border,
                  color: theme.text,
                  fontFamily: FONTS.modern,
                },
              ]}
              value={issueInput}
              onChangeText={setIssueInput}
              placeholder={t('settingsScreen.reportIssueModal.placeholder')}
              placeholderTextColor={theme.textSecondary}
              multiline
              textAlignVertical="top"
              autoFocus
              maxLength={5000}
            />
            {issueError && (
              <Text style={[styles.modalError, { color: theme.destructive, fontFamily: FONTS.modern }]}>
                {issueError}
              </Text>
            )}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, { borderColor: theme.border }]}
                onPress={() => setIssueModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                  {t('settingsScreen.reportIssueModal.cancel')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: theme.accent }]}
                onPress={() => void handleSubmitIssue()}
                disabled={issueLoading}
              >
                <Text style={[styles.modalBtnText, { color: theme.background, fontFamily: FONTS.modern }]}>
                  {issueLoading ? t('settingsScreen.reportIssueModal.sending') : t('settingsScreen.reportIssueModal.send')}
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
  systemSwatch: { backgroundColor: 'transparent', overflow: 'hidden' },
  systemSwatchHalves: { flexDirection: 'row', width: 32, height: 20, borderRadius: 6, overflow: 'hidden' },
  systemSwatchHalf: { flex: 1 },
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
  modalSubtitle: { fontSize: 13, marginTop: -10, marginBottom: 16, lineHeight: 18 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 8,
  },
  modalInputMultiline: { minHeight: 120 },
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
