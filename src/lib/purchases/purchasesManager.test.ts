import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => false),
  preferenceGet: vi.fn(async () => ({ value: null as string | null })),
  preferenceSet: vi.fn(async () => undefined),
  preferenceRemove: vi.fn(async () => undefined),
  iapGet: vi.fn(),
  iapOrder: vi.fn(),
  addListener: vi.fn(),
  getEntitlements: vi.fn(async () => ({ entitlements: [] })),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mocks.isNativePlatform },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: mocks.preferenceGet,
    set: mocks.preferenceSet,
    remove: mocks.preferenceRemove,
  },
}));

vi.mock('@awesome-cordova-plugins/in-app-purchase-2', () => ({
  InAppPurchase2: {
    get: mocks.iapGet,
    order: mocks.iapOrder,
  },
}));

vi.mock('../../plugins/StoreKitDiagnosticsPlugin', () => ({
  default: {
    addListener: mocks.addListener,
    getEntitlements: mocks.getEntitlements,
    collectSnapshot: vi.fn(),
    fetchProducts: vi.fn(),
    syncStore: vi.fn(async () => ({ success: true })),
  },
}));

async function freshManager() {
  vi.resetModules();
  return (await import('./purchasesManager')).PurchasesManager;
}

beforeEach(() => {
  mocks.isNativePlatform.mockReturnValue(false);
  mocks.preferenceGet.mockResolvedValue({ value: null });
  mocks.preferenceSet.mockClear();
  mocks.preferenceRemove.mockClear();
  mocks.iapGet.mockReset();
  mocks.iapOrder.mockReset();
  mocks.addListener.mockReset().mockResolvedValue({ remove: vi.fn() });
  mocks.getEntitlements.mockReset().mockResolvedValue({ entitlements: [] });
});

describe('purchase entitlements', () => {
  it('loads a previously persisted remove-ads entitlement', async () => {
    mocks.preferenceGet.mockResolvedValue({ value: 'true' });
    const manager = await freshManager();

    await manager.init();

    expect(manager.hasRemoveAdsEntitlement()).toBe(true);
  });

  it('persists grants and notifies listeners without duplicate events', async () => {
    const manager = await freshManager();
    const listener = vi.fn();
    manager.onEntitlementChange(listener);

    await manager.setDevEntitlement(true, 'com.jonatanbjerrekaer.countdown.remove_ads');
    await manager.setDevEntitlement(true, 'com.jonatanbjerrekaer.countdown.remove_ads');

    expect(listener.mock.calls).toEqual([[false], [true]]);
    expect(mocks.preferenceSet).toHaveBeenCalledWith({
      key: 'iap_remove_ads_entitlement',
      value: 'true',
    });
    expect(mocks.preferenceSet).toHaveBeenCalledWith({
      key: 'iap_remove_ads_product_id',
      value: 'com.jonatanbjerrekaer.countdown.remove_ads',
    });
  });

  it('allows remote entitlement sync to grant but never revoke a permanent purchase', async () => {
    const manager = await freshManager();

    await manager.applyRemoteEntitlement(true);
    await manager.applyRemoteEntitlement(false);

    expect(manager.hasRemoveAdsEntitlement()).toBe(true);
  });

  it('recognizes transaction updates for both current product tiers', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    let transactionUpdated: ((data: { productId: string; revocationDate?: string }) => void) | undefined;
    mocks.addListener.mockImplementation(async (_event, listener) => {
      transactionUpdated = listener;
      return { remove: vi.fn() };
    });
    const manager = await freshManager();
    manager.setDevBuild(true);
    await manager.init();

    transactionUpdated?.({
      productId: 'com.jonatanbjerrekaer.countdown.remove_ads_supporter',
    });

    await vi.waitFor(() => expect(manager.hasRemoveAdsEntitlement()).toBe(true));
  });

  it('restores a verified, non-revoked StoreKit entitlement', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.getEntitlements.mockResolvedValue({
      entitlements: [{
        productId: 'com.jonatanbjerrekaer.countdown.remove_ads',
        verificationFailed: false,
        revocationDate: undefined,
      }],
    });
    const manager = await freshManager();
    manager.setDevBuild(true);

    await expect(manager.restorePurchases()).resolves.toBe(true);
    expect(manager.hasRemoveAdsEntitlement()).toBe(true);
  });

  it('orders an available product and completes when StoreKit marks it owned', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.iapGet.mockReturnValue({ owned: true });
    mocks.iapOrder.mockReturnValue({
      then: (resolve: () => void) => resolve(),
      error: () => undefined,
    });
    const manager = await freshManager();
    manager.setDevBuild(true);

    await expect(manager.purchaseRemoveAds('com.jonatanbjerrekaer.countdown.remove_ads'))
      .resolves.toBeUndefined();
    expect(mocks.iapOrder).toHaveBeenCalledWith('com.jonatanbjerrekaer.countdown.remove_ads');
  });

  it('surfaces StoreKit order failures to the caller', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    const storeError = new Error('StoreKitOrderFailed');
    mocks.iapOrder.mockReturnValue({
      then: () => undefined,
      error: (reject: (error: Error) => void) => reject(storeError),
    });
    const manager = await freshManager();
    manager.setDevBuild(true);

    await expect(manager.purchaseRemoveAds('com.jonatanbjerrekaer.countdown.remove_ads_supporter'))
      .rejects.toThrow('StoreKitOrderFailed');
  });
});

describe('purchase availability', () => {
  it('keeps the two shipped non-consumable product identifiers stable', async () => {
    const manager = await freshManager();

    expect(manager.getRemoveAdsProducts()).toEqual([
      { id: 'com.jonatanbjerrekaer.countdown.remove_ads', tier: 'standard' },
      { id: 'com.jonatanbjerrekaer.countdown.remove_ads_supporter', tier: 'supporter' },
    ]);
  });

  it('blocks purchases and returns no catalog on web', async () => {
    const manager = await freshManager();

    await expect(manager.getProducts()).resolves.toEqual([]);
    await expect(manager.restorePurchases()).resolves.toBe(false);
    await expect(manager.purchaseRemoveAds('com.jonatanbjerrekaer.countdown.remove_ads'))
      .rejects.toThrow('Purchases are not available on web.');
  });

  it('reports the store ready in the native development purchase lane', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    const manager = await freshManager();
    manager.setDevBuild(true);

    await expect(manager.isStoreReady()).resolves.toBe(true);
    await expect(manager.getProducts()).resolves.toHaveLength(2);
  });
});
