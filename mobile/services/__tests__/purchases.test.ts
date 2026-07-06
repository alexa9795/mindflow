// Minimal mocks so the purchase logic can be tested off-device. `mockPlatform`
// is mutated per test to exercise the iOS/Android key selection.
const mockPlatform: { OS: 'ios' | 'android' } = { OS: 'ios' };

jest.mock('react-native', () => ({ Platform: mockPlatform }));
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    logIn: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
  },
}));

/**
 * (Re)load the module with a fresh copy so its one-shot `configured` flag and
 * the env-derived API keys are evaluated per test.
 */
function load(opts: { ios?: string; android?: string; os?: 'ios' | 'android' } = {}) {
  jest.resetModules();
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = opts.ios ?? '';
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = opts.android ?? '';
  mockPlatform.OS = opts.os ?? 'ios';
  const mod = require('../purchases') as typeof import('../purchases');
  const Purchases = (require('react-native-purchases') as { default: Record<string, jest.Mock> })
    .default;
  return { mod, Purchases };
}

describe('initPurchases', () => {
  it('does not configure the SDK when no API key is set for the platform', () => {
    const { mod, Purchases } = load({ ios: '', os: 'ios' });

    mod.initPurchases('user-1');

    expect(Purchases.configure).not.toHaveBeenCalled();
  });

  it('configures with the iOS key on iOS', () => {
    const { mod, Purchases } = load({ ios: 'ios_key', android: 'android_key', os: 'ios' });

    mod.initPurchases('user-1');

    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: 'ios_key', appUserID: 'user-1' });
  });

  it('configures with the Android key on Android', () => {
    const { mod, Purchases } = load({ ios: 'ios_key', android: 'android_key', os: 'android' });

    mod.initPurchases('user-1');

    expect(Purchases.configure).toHaveBeenCalledWith({
      apiKey: 'android_key',
      appUserID: 'user-1',
    });
  });

  it('configures once, then re-identifies via logIn on subsequent calls', () => {
    const { mod, Purchases } = load({ ios: 'ios_key', os: 'ios' });

    mod.initPurchases('user-1');
    mod.initPurchases('user-2');

    expect(Purchases.configure).toHaveBeenCalledTimes(1);
    expect(Purchases.logIn).toHaveBeenCalledWith('user-2');
  });
});

describe('purchasePackage', () => {
  it('returns the updated customerInfo on success', async () => {
    const { mod, Purchases } = load({ ios: 'ios_key', os: 'ios' });
    const customerInfo = { entitlements: {} };
    Purchases.purchasePackage.mockResolvedValueOnce({ customerInfo });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(mod.purchasePackage({} as any)).resolves.toBe(customerInfo);
  });

  it('throws PurchaseCancelledError when the user cancels', async () => {
    const { mod, Purchases } = load({ ios: 'ios_key', os: 'ios' });
    Purchases.purchasePackage.mockRejectedValueOnce({ userCancelled: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(mod.purchasePackage({} as any)).rejects.toBeInstanceOf(mod.PurchaseCancelledError);
  });

  it('rethrows non-cancellation errors unchanged', async () => {
    const { mod, Purchases } = load({ ios: 'ios_key', os: 'ios' });
    const failure = new Error('network down');
    Purchases.purchasePackage.mockRejectedValueOnce(failure);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(mod.purchasePackage({} as any)).rejects.toBe(failure);
  });
});

describe('restorePurchases', () => {
  it('delegates to the SDK', async () => {
    const { mod, Purchases } = load({ ios: 'ios_key', os: 'ios' });
    const info = { entitlements: {} };
    Purchases.restorePurchases.mockResolvedValueOnce(info);

    await expect(mod.restorePurchases()).resolves.toBe(info);
  });
});
