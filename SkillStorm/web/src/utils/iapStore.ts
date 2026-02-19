/* ═══════════════════════════════════════════════════════════
   IN-APP PURCHASE BRIDGE
   
   Apple Guideline 3.1.1:
   "If you want to unlock features or functionality within
    your app, you must use in-app purchase."
   
   This module provides:
   - Product definitions matching App Store Connect setup
   - IAP flow for iOS native (via Capacitor/Cordova bridge)
   - Stripe/web checkout fallback for non-iOS platforms
   - Purchase restoration (required by Apple)
   - Subscription management info
   ═══════════════════════════════════════════════════════════ */

import { mustUseAppleIAP } from './platform';

/** Product types matching App Store Connect */
export type ProductType = 'consumable' | 'non_consumable' | 'auto_renewable' | 'non_renewing';

export interface IAPProduct {
  /** Unique product ID — must match App Store Connect */
  productId: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Price string for display (web fallback) */
  webPrice: string;
  /** Numeric price for web checkout */
  webPriceValue: number;
  /** Product type */
  type: ProductType;
  /** Category for UI grouping */
  category: 'premium' | 'coins' | 'cosmetic' | 'school';
  /** Gradient for UI */
  gradient: string;
  /** Icon for UI */
  icon: string;
  /** Tag line */
  tag: string;
}

/**
 * Products must be registered in App Store Connect with matching IDs.
 * When running natively on iOS, prices come from StoreKit.
 * These web prices are fallbacks for the web version only.
 */
export const IAP_PRODUCTS: IAPProduct[] = [
  {
    productId: 'com.skillzstorm.premium.monthly',
    name: 'Premium Monthly',
    description: 'Ad-free experience, exclusive games, detailed analytics, 2x XP',
    webPrice: '$4.99/mo',
    webPriceValue: 4.99,
    type: 'auto_renewable',
    category: 'premium',
    gradient: 'from-violet-500 to-indigo-600',
    icon: '⭐',
    tag: 'Popular',
  },
  {
    productId: 'com.skillzstorm.premium.yearly',
    name: 'Premium Yearly',
    description: 'Save 33% — best value for serious learners!',
    webPrice: '$39.99/yr',
    webPriceValue: 39.99,
    type: 'auto_renewable',
    category: 'premium',
    gradient: 'from-amber-400 to-orange-500',
    icon: '💎',
    tag: 'Best Value',
  },
  {
    productId: 'com.skillzstorm.coins.500',
    name: '500 Coins',
    description: 'Get a starter pack of coins for power-ups and cosmetics',
    webPrice: '$1.99',
    webPriceValue: 1.99,
    type: 'consumable',
    category: 'coins',
    gradient: 'from-yellow-400 to-amber-500',
    icon: '🪙',
    tag: '',
  },
  {
    productId: 'com.skillzstorm.coins.1500',
    name: '1,500 Coins',
    description: 'Triple pack — save 25% over buying small packs!',
    webPrice: '$4.99',
    webPriceValue: 4.99,
    type: 'consumable',
    category: 'coins',
    gradient: 'from-yellow-500 to-orange-500',
    icon: '💰',
    tag: 'Save 25%',
  },
  {
    productId: 'com.skillzstorm.coins.5000',
    name: '5,000 Coins',
    description: 'Mega pack — save 40%! Best coin value available',
    webPrice: '$14.99',
    webPriceValue: 14.99,
    type: 'consumable',
    category: 'coins',
    gradient: 'from-amber-500 to-red-500',
    icon: '🏦',
    tag: 'Save 40%',
  },
  {
    productId: 'com.skillzstorm.avatar.pack',
    name: 'Avatar Pack',
    description: 'Unlock 10 unique character avatars for your profile',
    webPrice: '$2.99',
    webPriceValue: 2.99,
    type: 'non_consumable',
    category: 'cosmetic',
    gradient: 'from-pink-500 to-rose-500',
    icon: '🎭',
    tag: 'New',
  },
  {
    productId: 'com.skillzstorm.theme.pack',
    name: 'Theme Pack',
    description: 'Unlock 5 custom game themes and color schemes',
    webPrice: '$1.99',
    webPriceValue: 1.99,
    type: 'non_consumable',
    category: 'cosmetic',
    gradient: 'from-cyan-500 to-blue-500',
    icon: '🎨',
    tag: 'New',
  },
  {
    productId: 'com.skillzstorm.powerup.pack',
    name: 'Power-Up Pack',
    description: '10x Shield, 10x Bomb, 10x Slow Time power-ups',
    webPrice: '$3.99',
    webPriceValue: 3.99,
    type: 'consumable',
    category: 'cosmetic',
    gradient: 'from-purple-500 to-fuchsia-500',
    icon: '⚡',
    tag: '',
  },
];

/**
 * Apple Guideline 3.1.2(c):
 * Required subscription disclosure text.
 */
export const SUBSCRIPTION_DISCLOSURE = {
  monthly: {
    renewalTerm: '1 month',
    text: 'Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your account settings on the App Store after purchase.',
  },
  yearly: {
    renewalTerm: '1 year',
    text: 'Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your account settings on the App Store after purchase.',
  },
};

/**
 * Attempt to purchase a product.
 * On iOS native: triggers StoreKit via Capacitor bridge.
 * On web: redirects to web checkout flow.
 */
export async function purchaseProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  if (mustUseAppleIAP()) {
    return purchaseViaAppleIAP(productId);
  }
  return { success: false, error: 'web_checkout_required' };
}

const IAP_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * iOS Native IAP via Capacitor/Cordova bridge.
 * All calls are wrapped with a timeout to prevent indefinite loading.
 */
async function purchaseViaAppleIAP(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const w = window as any;
    if (w.Capacitor?.Plugins?.InAppPurchase) {
      const result = await withTimeout(
        w.Capacitor.Plugins.InAppPurchase.purchase({ productId }),
        IAP_TIMEOUT_MS,
        { success: false },
      );
      return { success: result.success, error: result.success ? undefined : 'Purchase timed out. Please try again.' };
    }
    if (w.store) {
      return withTimeout(
        new Promise<{ success: boolean; error?: string }>((resolve) => {
          w.store.order(productId);
          w.store.when(productId).approved(() => resolve({ success: true }));
          w.store.when(productId).error((err: any) => resolve({ success: false, error: err.message }));
        }),
        IAP_TIMEOUT_MS,
        { success: false, error: 'Purchase timed out. Please try again.' },
      );
    }
    return { success: false, error: 'In-App Purchase is being set up. Please restart the app and try again.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Purchase failed' };
  }
}

/**
 * Apple requires apps to let users restore previous purchases.
 * This is MANDATORY for App Store approval.
 */
export async function restorePurchases(): Promise<{ success: boolean; restored: string[] }> {
  try {
    const w = window as any;
    if (w.Capacitor?.Plugins?.InAppPurchase) {
      const result = await withTimeout(
        w.Capacitor.Plugins.InAppPurchase.restore(),
        IAP_TIMEOUT_MS,
        { productIds: [] },
      );
      return { success: true, restored: result.productIds || [] };
    }
    return { success: false, restored: [] };
  } catch {
    return { success: false, restored: [] };
  }
}

/**
 * Get localized pricing from StoreKit (iOS only).
 * Falls back to web prices on non-iOS platforms.
 */
export async function getLocalizedPrices(): Promise<Map<string, string>> {
  const prices = new Map<string, string>();
  IAP_PRODUCTS.forEach(p => prices.set(p.productId, p.webPrice));

  if (mustUseAppleIAP()) {
    try {
      const w = window as any;
      if (w.Capacitor?.Plugins?.InAppPurchase) {
        const result = await withTimeout(
          w.Capacitor.Plugins.InAppPurchase.getProducts({
            productIds: IAP_PRODUCTS.map(p => p.productId),
          }),
          IAP_TIMEOUT_MS,
          { products: [] },
        );
        if (result?.products) {
          result.products.forEach((p: any) => {
            prices.set(p.productId, p.localizedPrice || p.price);
          });
        }
      }
    } catch {}
  }

  return prices;
}
