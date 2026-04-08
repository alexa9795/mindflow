import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import ThemedView from '../../components/ThemedView';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../hooks/useAuth';
import { FONTS } from '../../constants/fonts';
import { ApiError, NetworkError } from '../../services/api';

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useSettings();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      // AuthGuard in root layout handles redirect to (tabs)
    } catch (e: unknown) {
      if (e instanceof NetworkError) {
        setError("You're offline or the server is unreachable");
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView safe>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <Text style={[styles.appName, { color: theme.text, fontFamily: 'PlayfairDisplay_400Regular' }]}>
          MindFlow
        </Text>
        <Text style={[styles.tagline, { color: theme.textSecondary, fontFamily: 'Lora_400Regular_Italic' }]}>
          your private space to think
        </Text>

        <View style={styles.form}>
          {error && (
            <Text style={[styles.errorText, { color: '#DC2626', fontFamily: FONTS.modern }]}>
              {error}
            </Text>
          )}
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text, fontFamily: FONTS.modern }]}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text, fontFamily: FONTS.modern }]}
            placeholder="Password"
            placeholderTextColor={theme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
          />
          <Pressable
            style={[styles.btn, { backgroundColor: theme.accent }, loading && styles.btnDisabled]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <Text style={[styles.btnText, { color: theme.background, fontFamily: FONTS.modern }]}>
                Sign in
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => router.replace('/(auth)/register')}>
          <Text style={[styles.switchText, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
            Don't have an account?{' '}
            <Text style={{ color: theme.accent, fontWeight: '600' }}>Register</Text>
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  appName: {
    fontSize: 40,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    marginBottom: 48,
  },
  form: { width: '100%', marginBottom: 24 },
  errorText: { fontSize: 14, marginBottom: 12, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  btn: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontWeight: '700', fontSize: 16 },
  switchText: { fontSize: 14, textAlign: 'center' },
});
