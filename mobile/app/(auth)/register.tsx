import React, { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
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
import { FONTS } from '../../constants/fonts';
import { ApiError, NetworkError } from '../../services/api';
import EchoLogo from '../../components/EchoLogo';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { height } = useWindowDimensions();

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

  const zone1Height = height * 0.52;
  const zone2Height = height * 0.18;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />

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
          <Text style={styles.wordmark}>Echo</Text>
        </View>
        <Text style={styles.tagline}>your private space to think</Text>
      </View>

      {/* Zone 3 — Form */}
      <SafeAreaView style={styles.formZone}>
        <View style={styles.form}>
          {error !== null && (
            <Text style={styles.errorText}>{error}</Text>
          )}

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
            <Text style={styles.toggleLink}>
              Already have an account?{'  '}
              <Text style={styles.toggleLinkBold}>Sign in</Text>
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
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
  },
  form: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 16,
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: FONTS.modern,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    // Intentional hardcode — login/register screens are unthemed
    // (photo background). #C0392B matches warmNeutral destructive.
    color: '#C0392B',
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
});
