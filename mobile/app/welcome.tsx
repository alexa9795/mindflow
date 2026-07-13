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
import { useTranslation } from 'react-i18next';
import { APP_NAME } from '../constants/config';
import { FONTS } from '../constants/fonts';
import { useAuth } from '../hooks/useAuth';
import MindFlowLogo from '../components/MindFlowLogo';

const POINT_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'lock-closed-outline',
  'sparkles-outline',
  'trending-up-outline',
];

const POINT_KEYS = ['privacy', 'companion', 'clarity'] as const;

export default function WelcomeScreen() {
  const { t } = useTranslation();
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
            <MindFlowLogo color="#2C2418" height={44} hideText />
            <Text style={styles.wordmark}>MindFlow</Text>
          </View>

          <Text style={styles.greeting}>
            {currentUser?.name
              ? t('welcome.greetingWithName', { name: currentUser.name.split(' ')[0] })
              : t('welcome.greetingNoName')}
          </Text>
          <Text style={styles.subgreeting}>
            {t('welcome.subgreeting', { appName: APP_NAME })}
          </Text>

          <View style={styles.points}>
            {POINT_KEYS.map((key, i) => (
              <View key={key} style={styles.pointRow}>
                <View style={styles.pointIcon}>
                  <Ionicons name={POINT_ICONS[i]} size={20} color="#A65A3A" />
                </View>
                <View style={styles.pointTextCol}>
                  <Text style={styles.pointTitle}>{t(`welcome.points.${key}Title`)}</Text>
                  <Text style={styles.pointBody}>{t(`welcome.points.${key}Body`, { appName: APP_NAME })}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable style={styles.btn} onPress={getStarted}>
            <Text style={styles.btnText}>{t('welcome.cta')}</Text>
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
