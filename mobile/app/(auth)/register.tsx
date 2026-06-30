import React, { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../../constants/config';
import { FONTS } from '../../constants/fonts';
import { ApiError, NetworkError } from '../../services/api';
import EchoLogo from '../../components/EchoLogo';

function isValidEmail(email: string): boolean {
  // Basic RFC-style check: local@domain.tld
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { height } = useWindowDimensions();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setConfirmError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (password !== confirmPassword) {
      setConfirmError("Passwords don't match");
      return;
    }
    if (!consent) {
      setError('Please agree to storage of your journal entries to continue');
      return;
    }
    if (!acceptTerms) {
      setError('Please accept the Terms of Service to continue');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim(), consent, acceptTerms);
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

  const zone1Height = height * 0.52;
  const zone2Height = height * 0.18;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Zone 1 — Hero image */}
        <View style={{ height: zone1Height }}>
          <ImageBackground
            source={require('../../assets/stones.jpeg')}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['transparent', 'transparent', '#EDE8E000', '#EDE8E0']}
            locations={[0, 0.4, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Zone 2 — Identity */}
        <View style={[styles.identityZone, { height: zone2Height }]}>
          <View style={styles.logoRow}>
            <EchoLogo color="#2C2418" width={220} hideText />
            <Text style={styles.wordmark}>MindFlow</Text>
          </View>
          <Text style={styles.tagline}>your private space to think</Text>
        </View>

        {/* Zone 3 — Form */}
        <View style={styles.formZone}>
          {/* Reserved space for error — prevents layout shift */}
          <View style={styles.errorContainer}>
            {error !== null && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </View>

          <TextInput
            style={styles.input}
            placeholder="name"
            placeholderTextColor="#B0A89E"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
          />

          <TextInput
            style={styles.input}
            placeholder="email"
            placeholderTextColor="#B0A89E"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <TextInput
            style={[styles.input, styles.inputPassword]}
            placeholder="password"
            placeholderTextColor="#B0A89E"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          <TextInput
            style={[styles.input, confirmError ? styles.inputError : null]}
            placeholder="confirm password"
            placeholderTextColor="#B0A89E"
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); setConfirmError(null); }}
            secureTextEntry
            autoComplete="new-password"
          />
          {confirmError !== null && (
            <Text style={styles.inlineError}>{confirmError}</Text>
          )}

          {/* GDPR Art. 9(2)(a) explicit consent to store sensitive content. */}
          <Pressable
            style={styles.consentRow}
            onPress={() => setConsent((c) => !c)}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
          >
            <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
              {consent && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.consentText}>
              I agree that my journal entries — which may include sensitive
              information about my wellbeing — are stored so I can use MindFlow.
              See our{' '}
              <Text
                style={styles.consentLink}
                onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </Pressable>

          {/* Terms of Service acceptance — kept separate from the Art. 9 consent. */}
          <Pressable
            style={styles.consentRow}
            onPress={() => setAcceptTerms((c) => !c)}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptTerms }}
          >
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.consentText}>
              I have read and accept the{' '}
              <Text
                style={styles.consentLink}
                onPress={() => void Linking.openURL(TERMS_OF_SERVICE_URL)}
              >
                Terms of Service
              </Text>
              .
            </Text>
          </Pressable>

          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#F5F0E8" />
            ) : (
              <Text style={styles.btnText}>CREATE ACCOUNT</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.replace('/(auth)/login')}>
            <Text style={[styles.toggleLink, styles.bottomLink]}>
              Already have an account?{'  '}
              <Text style={styles.toggleLinkBold}>Sign in</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EDE8E0',
  },
  identityZone: {
    backgroundColor: '#EDE8E0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmark: {
    fontFamily: FONTS.handwriting,
    fontSize: 38,
    color: '#2C2418',
  },
  tagline: {
    fontFamily: FONTS.handwriting,
    fontSize: 18,
    color: '#7A6F63',
    marginTop: 4,
  },
  formZone: {
    flex: 1,
    backgroundColor: '#EDE8E0',
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  errorContainer: {
    minHeight: 20,
    marginBottom: 12,
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: FONTS.modern,
    fontSize: 13,
    textAlign: 'center',
    // Intentional hardcode — login/register screens are unthemed
    // (photo background). #C0392B matches warmNeutral destructive.
    color: '#C0392B',
  },
  inlineError: {
    fontFamily: FONTS.modern,
    fontSize: 12,
    color: '#C0392B',
    marginTop: -14,
    marginBottom: 12,
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
    marginBottom: 18,
  },
  inputPassword: {
    marginBottom: 8,
  },
  inputError: {
    borderBottomColor: '#C0392B',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#9A8F84',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#2C2418',
    borderColor: '#2C2418',
  },
  checkboxMark: {
    color: '#F5F0E8',
    fontSize: 14,
    fontWeight: '700',
  },
  consentText: {
    flex: 1,
    fontFamily: FONTS.modern,
    fontSize: 12,
    lineHeight: 17,
    color: '#7A6F63',
  },
  consentLink: {
    color: '#6B6157',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  btn: {
    alignSelf: 'stretch',
    backgroundColor: '#2C2418',
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: 11,
    letterSpacing: 3,
    color: '#F5F0E8',
    fontFamily: FONTS.modern,
    fontWeight: '700',
  },
  toggleLink: {
    fontSize: 13,
    color: '#9A8F84',
    fontFamily: FONTS.modern,
    textAlign: 'center',
    marginTop: 18,
  },
  toggleLinkBold: {
    fontWeight: '600',
    color: '#6B6157',
  },
  bottomLink: {
    marginBottom: 32,
  },
});
