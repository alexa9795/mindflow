import React, { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { FONTS } from '../../constants/fonts';
import { ApiError, NetworkError } from '../../services/api';
import EchoLogo from '../../components/EchoLogo';

export default function LoginScreen() {
  const router = useRouter();
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
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />

      <View style={styles.imageWrap}>
        <ImageBackground
          source={require('../../assets/books.jpeg')}
          resizeMode="cover"
          style={styles.image}
        />
        <LinearGradient
          colors={['transparent', '#F5F0E8']}
          style={styles.fadeOverlay}
        />
      </View>

      <SafeAreaView style={styles.sheet}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap}>
            <EchoLogo color="#2C2418" width={220} />
          </View>

          <View style={styles.divider} />

          {error !== null && (
            <Text style={styles.errorText}>{error}</Text>
          )}

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
            autoComplete="current-password"
          />

          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#F5F0E8" />
            ) : (
              <Text style={styles.btnText}>SIGN IN</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.replace('/(auth)/register')}>
            <Text style={styles.toggleLink}>
              Don't have an account?{'  '}
              <Text style={styles.toggleLinkBold}>Register</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  imageWrap: {
    height: 280,
  },
  image: {
    flex: 1,
  },
  fadeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  scroll: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoWrap: {
    marginTop: -16,
    alignItems: 'center',
  },
  divider: {
    width: 28,
    height: 1,
    backgroundColor: '#D6CFC4',
    alignSelf: 'center',
    marginVertical: 14,
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
    paddingVertical: 10,
    paddingHorizontal: 2,
    fontSize: 15,
    fontFamily: FONTS.modern,
    color: '#2C2418',
    marginBottom: 14,
  },
  inputPassword: {
    marginBottom: 6,
  },
  btn: {
    alignSelf: 'stretch',
    backgroundColor: '#2C2418',
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
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
    marginTop: 16,
  },
  toggleLinkBold: {
    fontWeight: '600',
    color: '#6B6157',
  },
});
