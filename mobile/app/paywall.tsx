import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import PressableScale from '../components/PressableScale';
import ThemedView from '../components/ThemedView';
import { APP_NAME, COMPANION_NAME } from '../constants/config';
import { FONTS } from '../constants/fonts';
import { notifySuccess } from '../constants/haptics';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import {
  getOfferings,
  purchasePackage,
  PurchaseCancelledError,
  restorePurchases,
} from '../services/purchases';

export default function PaywallScreen() {
  const router = useRouter();
  const { theme } = useSettings();
  const { updateUser } = useAuth();

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Identifier of the package currently being purchased/restored, or 'restore'.
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const offerings = await getOfferings();
        const current = offerings.current;
        if (!current || current.availablePackages.length === 0) {
          setLoadError('No subscription options are available right now.');
          return;
        }
        setPackages(current.availablePackages);
      } catch {
        setLoadError('Could not load subscription options. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Pull the latest subscription state from the backend (updated via the
  // RevenueCat webhook) and push it into auth context.
  async function refreshUser() {
    try {
      const user = await api.getMe();
      updateUser(user);
    } catch {
      // Non-fatal: the webhook may take a moment; the next /me will catch up.
    }
  }

  async function handlePurchase(pkg: PurchasesPackage) {
    setBusy(pkg.identifier);
    try {
      await purchasePackage(pkg);
      await refreshUser();
      notifySuccess();
      Alert.alert('Welcome to Pro', `You now have unlimited access to ${COMPANION_NAME}.`);
      router.back();
    } catch (e: unknown) {
      if (e instanceof PurchaseCancelledError) return;
      Alert.alert('Purchase failed', 'Something went wrong. You have not been charged.');
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore() {
    setBusy('restore');
    try {
      await restorePurchases();
      await refreshUser();
      Alert.alert('Purchases restored', 'Your subscription has been restored.');
      router.back();
    } catch {
      Alert.alert('Restore failed', 'We could not find any purchases to restore.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <ThemedView safe>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backBtn, { color: theme.accent, fontFamily: FONTS.modern }]}>
            ← Back
          </Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: FONTS.modern }]}>
          {APP_NAME} Pro
        </Text>
        <View style={{ width: 52 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.heading, { color: theme.text, fontFamily: FONTS.modern }]}>
          Unlimited journaling
        </Text>
        <Text style={[styles.subheading, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
          Go beyond 10 entries a month and unlock unlimited AI reflections with {COMPANION_NAME}.
        </Text>

        {loading && (
          <ActivityIndicator style={styles.loader} color={theme.accent} size="large" />
        )}

        {loadError && (
          <Text style={[styles.errorText, { color: theme.destructive, fontFamily: FONTS.modern }]}>
            {loadError}
          </Text>
        )}

        {packages.map((pkg) => {
          const isBusy = busy === pkg.identifier;
          return (
            <PressableScale
              key={pkg.identifier}
              style={[styles.planCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => void handlePurchase(pkg)}
              disabled={busy !== null}
            >
              <View style={styles.planInfo}>
                <Text style={[styles.planTitle, { color: theme.text, fontFamily: FONTS.modern }]}>
                  {pkg.product.title}
                </Text>
                <Text style={[styles.planPrice, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                  {pkg.product.priceString}
                </Text>
              </View>
              {isBusy ? (
                <ActivityIndicator color={theme.accent} />
              ) : (
                <Text style={[styles.planCta, { color: theme.accent, fontFamily: FONTS.modern }]}>
                  Subscribe →
                </Text>
              )}
            </PressableScale>
          );
        })}

        <Pressable
          style={styles.restoreBtn}
          onPress={() => void handleRestore()}
          disabled={busy !== null}
        >
          <Text style={[styles.restoreText, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
            {busy === 'restore' ? 'Restoring…' : 'Restore purchases'}
          </Text>
        </Pressable>

        <Text style={[styles.legal, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
          Subscriptions renew automatically until cancelled. Manage or cancel anytime in your
          device account settings.
        </Text>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backBtn: { fontSize: 15, width: 52 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  subheading: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  loader: { marginTop: 24 },
  errorText: { fontSize: 14, marginTop: 12 },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
  },
  planInfo: { flex: 1 },
  planTitle: { fontSize: 16, fontWeight: '700' },
  planPrice: { fontSize: 14, marginTop: 4 },
  planCta: { fontSize: 15, fontWeight: '600' },
  restoreBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  restoreText: { fontSize: 14, fontWeight: '600' },
  legal: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 12 },
});
