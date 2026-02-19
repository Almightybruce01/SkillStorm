/* ═══════════════════════════════════════════════════════════
   AD CONFIGURATION — Apple App Store Compliant
   
   Apple Guidelines Addressed:
   - 2.5.18   Ads must be age-appropriate, have close buttons
   - 1.3      No third-party ads in Kids Category / under 13
   - 5.1.4    No ad tracking for kids
   - 5.1.2(i) Must get consent before ad personalization
   
   COPPA: No behavioral advertising for children under 13.
   GDPR: Must have consent before personalized ads.
   ═══════════════════════════════════════════════════════════ */

import { canShowAds, canShowPersonalizedAds } from '../../utils/consent';
import { shouldShowAds as platformAllowsAds } from '../../utils/platform';

export const AD_CONFIG = {
  publisherId: 'ca-pub-9418265198529416',

  slots: {
    topBanner: '1234567890',
    sidebar: '2345678901',
    inArticle: '3456789012',
    footer: '4567890123',
    bottomSticky: '5678901234',
    interstitial: '6789012345',
    gameOver: '7890123456',
    preGame: '8901234567',
    betweenRounds: '9012345678',
  },

  /** Page navigations between interstitials (Apple: must not be too aggressive) */
  interstitialFrequency: 5,

  /** Whether ads are enabled globally */
  enabled: true,

  /**
   * Set to true ONLY when AdSense is approved and serving real ads.
   * When false, placeholder self-promo ads are shown instead and the
   * adsbygoogle script is never loaded / invoked.
   */
  adsLive: false,

  /** Test mode — shows placeholder ads for development */
  testMode: false,

  /** Non-personalized ads flag — set based on consent */
  get nonPersonalized(): boolean {
    return !canShowPersonalizedAds();
  },
};

/**
 * Master check: Should we show ads at all?
 * Combines platform rules (no ads on iOS native),
 * COPPA rules (no ads for under 13),
 * and user consent.
 */
export function adsAllowed(): boolean {
  if (!AD_CONFIG.enabled) return false;
  if (!platformAllowsAds()) return false;
  if (!canShowAds()) return false;
  return true;
}

/**
 * Should interstitials be shown?
 * More restrictive — never show to minors.
 */
export function interstitialsAllowed(): boolean {
  if (!adsAllowed()) return false;
  return true;
}
