// ═══════════════════════════════════════════════════════════════
// GOOGLE ADSENSE CONFIGURATION
//
// SETUP INSTRUCTIONS:
// 1. Go to https://adsense.google.com
// 2. Sign up with your Google account
// 3. Add your website URL (skillzstorm.com)
// 4. Get your Publisher ID (yours: ca-pub-9418265198529416)
// 5. Replace the ID below with your real one
// 6. Add the AdSense script tag to index.html (already added)
// 7. Create ad units in AdSense dashboard and get slot IDs
// 8. Replace the ad slot IDs below with your real ones
//
// REVENUE:
// - Banner ads: ~$1-5 per 1,000 views (RPM)
// - In-article ads: ~$3-8 RPM
// - Interstitial/overlay: ~$8-20 RPM
// - At 50k daily visitors: $150-1,000+/day potential
//
// You get paid monthly via bank transfer when balance reaches $100
// ═══════════════════════════════════════════════════════════════

export const ADSENSE_CONFIG = {
  publisherId: 'ca-pub-9418265198529416',
  
  // ⚠️ REPLACE WITH YOUR REAL AD SLOT IDS
  slots: {
    topBanner: '1234567890',      // Leaderboard banner (728x90)
    sidebarRect: '2345678901',    // Medium rectangle (300x250)
    inArticle: '3456789012',      // In-article native ad
    bottomBanner: '4567890123',   // Bottom sticky banner
    betweenGames: '5678901234',   // Interstitial between games
    footer: '6789012345',         // Footer banner
  },
  
  // Auto-ads enabled (Google places ads automatically)
  autoAds: true,
  
  // For testing: set to true to use test mode
  testMode: import.meta.env.DEV,
  
  // ═══════════════════════════════════════════
  // COPPA: Child-directed content settings
  // In your AdSense dashboard, go to:
  //   Account → Content → Child-directed settings → Enable
  // This ensures all ads served are child-safe, non-targeted.
  // Also in your AdSense ad code, add:
  //   data-tag-for-child-directed-treatment="1"
  // ═══════════════════════════════════════════
  childDirected: true,
};

// Check if user has purchased ad-free on the website
export function isAdFree(): boolean {
  return localStorage.getItem('skillzstorm_ad_free') === 'true';
}

export function setAdFree(value: boolean): void {
  localStorage.setItem('skillzstorm_ad_free', value ? 'true' : 'false');
}
