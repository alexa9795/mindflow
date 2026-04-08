import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { FONTS } from '../../constants/fonts';
import { ApiError, NetworkError } from '../../services/api';

const { height: SCREEN_H } = Dimensions.get('window');

export default function RegisterWaterfallScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(email.trim(), password, name.trim());
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
    <ImageBackground
      source={require('../../assets/login-waterfall.jpeg')}
      resizeMode="cover"
      style={styles.bg}
    >
      <StatusBar style="light" />
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topSpacer} />

            <View style={styles.logoArea}>
              <Text style={styles.appName}>Echo</Text>
              <Text style={styles.tagline}>your private space to think</Text>
            </View>

            <View style={styles.formGap} />

            <View style={styles.form}>
              {error !== null && (
                <Text style={styles.errorText}>{error}</Text>
              )}
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
              <Pressable
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={submit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#141414" />
                ) : (
                  <Text style={styles.btnText}>Create account</Text>
                )}
              </Pressable>
            </View>

            <Pressable onPress={() => router.push('/(auth)/login-waterfall')}>
              <Text style={styles.toggleLink}>
                Already have an account?{' '}
                <Text style={styles.toggleLinkBold}>Login</Text>
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  kav: { flex: 1 },
  scroll: {
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  topSpacer: { height: SCREEN_H * 0.2 },
  logoArea: { alignItems: 'center' },
  appName: {
    fontFamily: FONTS.formal,
    fontSize: 44,
    color: '#FFFFFF',
    letterSpacing: 3,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: FONTS.robotoSerif,
    fontStyle: 'italic',
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    marginTop: 8,
  },
  formGap: { height: 32 },
  form: { width: '100%' },
  errorText: {
    fontFamily: FONTS.modern,
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontFamily: FONTS.modern,
    fontSize: 15,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: '#141414',
    fontFamily: FONTS.modern,
    fontWeight: '700',
    fontSize: 16,
  },
  toggleLink: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    fontFamily: FONTS.modern,
  },
  toggleLinkBold: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
