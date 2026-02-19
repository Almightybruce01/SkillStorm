/* ═══════════════════════════════════════════════════════════
   PLATFORM DETECTION — iOS / Android / Web
   Used to conditionally show Apple IAP vs web payments,
   disable ads in native iOS builds, and apply platform rules.
   ═══════════════════════════════════════════════════════════ */

export type Platform = 'ios' | 'android' | 'web';

/**
 * Detect any iOS/iPadOS device (native wrapper or Safari).
 * Covers iPhone, iPad, iPod, and iPadOS (which reports as MacIntel).
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detect if the app is running inside a native iOS wrapper
 * (Capacitor, Cordova, or WKWebView).
 */
export function isNativeiOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const w = window as any;
  return !!(
    w.webkit?.messageHandlers?.cordova_iab ||
    w.Capacitor?.isNativePlatform?.() ||
    w.cordova ||
    (ua.includes('iPhone') && w.webkit?.messageHandlers) ||
    (isIOSDevice() && (w.webkit?.messageHandlers || !navigator.userAgent.includes('Safari')))
  );
}

/**
 * Detect if running inside a native Android wrapper.
 */
export function isNativeAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return !!(w.Android || (w.Capacitor?.isNativePlatform?.() && /android/i.test(navigator.userAgent)));
}

/**
 * Returns the current platform.
 */
export function getPlatform(): Platform {
  if (isNativeiOS()) return 'ios';
  if (isNativeAndroid()) return 'android';
  return 'web';
}

/**
 * Apple App Store Rule 3.1.1:
 * Digital content/subscriptions MUST use Apple IAP on iOS/iPadOS.
 * Detects native wrappers and standalone iOS devices.
 */
export function mustUseAppleIAP(): boolean {
  return isNativeiOS() || isIOSDevice();
}

/**
 * Apple App Store Rule 2.5.18:
 * Disable interstitials and sticky ads in iOS native builds.
 */
export function shouldShowAds(): boolean {
  return !isNativeiOS();
}
