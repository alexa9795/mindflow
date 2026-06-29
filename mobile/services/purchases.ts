import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

let configured = false;

/** Thrown when the user cancels the purchase flow. Callers should treat this as a no-op. */
export class PurchaseCancelledError extends Error {
  readonly isPurchaseCancelled = true;
  constructor() {
    super('Purchase cancelled');
  }
}

/**
 * Configure the RevenueCat SDK with the platform API key and the backend user ID
 * as the RevenueCat app user ID. Safe to call more than once — only the first
 * call configures the SDK; later calls just re-identify the user.
 */
export function initPurchases(userId: string): void {
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) {
    console.warn(
      `[purchases] No RevenueCat API key for ${Platform.OS}. ` +
        'Set EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY.',
    );
    return;
  }

  if (!configured) {
    Purchases.configure({ apiKey, appUserID: userId });
    configured = true;
    return;
  }

  // Already configured (e.g. re-login as a different user) — re-identify.
  void Purchases.logIn(userId);
}

/** Fetch the configured RevenueCat offerings (monthly/yearly packages). */
export function getOfferings(): Promise<PurchasesOfferings> {
  return Purchases.getOfferings();
}

/**
 * Purchase a package. Returns the updated CustomerInfo on success.
 * Throws PurchaseCancelledError if the user cancels, or rethrows on other failures.
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'userCancelled' in e && e.userCancelled) {
      throw new PurchaseCancelledError();
    }
    throw e;
  }
}

/** Restore previous purchases (required by Apple guidelines). */
export function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}
