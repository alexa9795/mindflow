import React from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../constants/fonts';
import { useAuth } from '../hooks/useAuth';
import EchoLogo from '../components/EchoLogo';

const POINTS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'lock-closed-outline',
    title: 'A private space',
    body: "Whatever you write stays yours — just a place to think out loud, no judgment.",
  },
  {
    icon: 'sparkles-outline',
    title: 'A companion that listens',
    body: 'Echo reads between the lines and reflects back what it notices, gently.',
  },
  {
    icon: 'trending-up-outline',
    title: 'See yourself clearly',
    body: 'Streaks, mood trends, and patterns build up the more you show up — even a minute a day adds up.',
  },
];

export default function WelcomeScreen() {
  const { clearJustRegistered, currentUser } = useAuth();
  const { height } = useWindowDimensions();
  const heroHeight = height * 0.38;

  function getStarted() {
    clearJustRegistered();
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ height: heroHeight }}>
          <ImageBackground
            source={require('../assets/books.jpeg')}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['transparent', 'transparent', '#EDE8E000', '#EDE8E0']}
            locations={[0, 0.35, 0.65, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={styles.body}>
          <View style={styles.logoRow}>
            <EchoLogo color="#2C2418" width={180} hideText />
            <Text style={styles.wordmark}>Echo</Text>
          </View>

          <Text style={styles.greeting}>
            Welcome{currentUser?.name ? `, ${currentUser.name.split(' ')[0]}` : ''}.
          </Text>
          <Text style={styles.subgreeting}>
            Echo is your private journal with a companion that helps you notice
            what you might miss on your own.
          </Text>

          <View style={styles.points}>
            {POINTS.map((p) => (
              <View key={p.title} style={styles.pointRow}>
                <View style={styles.pointIcon}>
                  <Ionicons name={p.icon} size={20} color="#A65A3A" />
                </View>
                <View style={styles.pointTextCol}>
                  <Text style={styles.pointTitle}>{p.title}</Text>
                  <Text style={styles.pointBody}>{p.body}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable style={styles.btn} onPress={getStarted}>
            <Text style={styles.btnText}>WRITE YOUR FIRST ENTRY</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EDE8E0' },
  body: {
    backgroundColor: '#EDE8E0',
    paddingHorizontal: 28,
    paddingTop: 4,
    paddingBottom: 40,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center' },
  wordmark: { fontFamily: FONTS.handwriting, fontSize: 30, color: '#2C2418' },
  greeting: {
    fontFamily: FONTS.modern,
    fontSize: 24,
    fontWeight: '700',
    color: '#2C2418',
    textAlign: 'center',
    marginTop: 18,
  },
  subgreeting: {
    fontFamily: FONTS.modern,
    fontSize: 14,
    color: '#7A6F63',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  points: { marginTop: 28, gap: 18 },
  pointRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  pointIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#A65A3A1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointTextCol: { flex: 1 },
  pointTitle: { fontFamily: FONTS.modern, fontSize: 15, fontWeight: '700', color: '#2C2418' },
  pointBody: { fontFamily: FONTS.modern, fontSize: 13, color: '#7A6F63', marginTop: 2, lineHeight: 18 },
  btn: {
    alignSelf: 'stretch',
    backgroundColor: '#2C2418',
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 32,
  },
  btnText: {
    fontSize: 11,
    letterSpacing: 3,
    color: '#F5F0E8',
    fontFamily: FONTS.modern,
    fontWeight: '700',
  },
});
