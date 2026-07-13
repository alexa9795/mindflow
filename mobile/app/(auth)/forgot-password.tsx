import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FONTS } from '../../constants/fonts';
import { api, ApiError } from '../../services/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t('auth.forgotPassword.errors.emailRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.requestPasswordReset(trimmed);
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : t('common.somethingWrongRetry'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.container}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </Pressable>

          <Text style={styles.title}>{t('auth.forgotPassword.title')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.forgotPassword.subtitle')}
          </Text>

          {sent ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                {t('auth.forgotPassword.successText')}
              </Text>
              <Pressable style={styles.btn} onPress={() => router.replace('/(auth)/reset-password')}>
                <Text style={styles.btnText}>{t('auth.forgotPassword.enterResetToken')}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {error !== null && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              <TextInput
                style={styles.input}
                placeholder={t('auth.forgotPassword.emailPlaceholder')}
                placeholderTextColor="#B0A89E"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
              />

              <Pressable
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={submit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#F5F0E8" />
                ) : (
                  <Text style={styles.btnText}>{t('auth.forgotPassword.sendResetLink')}</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EDE8E0',
  },
  safe: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 32,
  },
  backBtn: { marginBottom: 32 },
  backText: {
    fontFamily: FONTS.modern,
    fontSize: 15,
    color: '#6B6157',
  },
  title: {
    fontFamily: FONTS.handwriting,
    fontSize: 30,
    color: '#2C2418',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: FONTS.modern,
    fontSize: 14,
    color: '#7A6F63',
    marginBottom: 28,
    lineHeight: 20,
  },
  errorText: {
    fontFamily: FONTS.modern,
    fontSize: 13,
    color: '#C0392B',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    alignSelf: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#C5BDB4',
    paddingVertical: 12,
    paddingHorizontal: 2,
    fontSize: 15,
    fontFamily: FONTS.modern,
    color: '#2C2418',
    marginBottom: 28,
  },
  btn: {
    alignSelf: 'stretch',
    backgroundColor: '#2C2418',
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    fontSize: 11,
    letterSpacing: 3,
    color: '#F5F0E8',
    fontFamily: FONTS.modern,
    fontWeight: '700',
  },
  successBox: { gap: 20 },
  successText: {
    fontFamily: FONTS.modern,
    fontSize: 14,
    color: '#2C2418',
    lineHeight: 22,
    backgroundColor: '#D4EDD4',
    padding: 16,
    borderRadius: 10,
  },
});
