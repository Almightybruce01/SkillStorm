/* ═══════════════════════════════════════════════════════════
   CONSENT & PRIVACY MANAGER
   Handles user consent for data collection, ad tracking,
   age verification, and COPPA/GDPR compliance.
   
   Apple Guidelines Addressed:
   - 5.1.1(ii)  Data collection requires user consent
   - 5.1.2(i)   Must obtain permission before tracking
   - 5.1.4      Kids privacy — COPPA compliance
   - 1.3        Kids Category — no third-party ads for kids
   ═══════════════════════════════════════════════════════════ */

const CONSENT_KEY = 'skillzstorm_consent';
const AGE_KEY = 'skillzstorm_age_verified';

export interface ConsentState {
  /** User has accepted the privacy policy & terms */
  accepted: boolean;
  /** User consents to analytics/gameplay data collection */
  analyticsConsent: boolean;
  /** User consents to personalized ads */
  adPersonalizationConsent: boolean;
  /** User's declared age bracket */
  ageBracket: 'under13' | '13to17' | '18plus' | null;
  /** Timestamp of consent */
  consentDate: string | null;
  /** Version of privacy policy accepted */
  policyVersion: string;
}

export const CURRENT_POLICY_VERSION = '2.0.0';

const DEFAULT_CONSENT: ConsentState = {
  accepted: false,
  analyticsConsent: false,
  adPersonalizationConsent: false,
  ageBracket: null,
  consentDate: null,
  policyVersion: '',
};

const LEGACY_CONSENT_KEY = 'skillstorm_consent';

export function getConsentState(): ConsentState {
  try {
    let raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_CONSENT_KEY);
      if (raw) localStorage.setItem(CONSENT_KEY, raw);
    }
    if (raw) {
      const parsed = JSON.parse(raw) as ConsentState;
      return parsed;
    }
  } catch {}
  return { ...DEFAULT_CONSENT };
}

export function saveConsentState(state: ConsentState): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
  } catch {}
}

export function hasValidConsent(): boolean {
  const state = getConsentState();
  return state.accepted && state.policyVersion === CURRENT_POLICY_VERSION;
}

export function isUserUnder13(): boolean {
  const state = getConsentState();
  return state.ageBracket === 'under13';
}

export function isUserMinor(): boolean {
  const state = getConsentState();
  return state.ageBracket === 'under13' || state.ageBracket === '13to17';
}

/**
 * COPPA Rule: No personalized ads for children under 13.
 * Apple Rule 1.3: Kids Category apps should not include third-party ads.
 * We disable ALL ads for users under 13 and personalized ads for minors.
 */
export function canShowAds(): boolean {
  const state = getConsentState();
  if (state.ageBracket === 'under13') return false;
  return true;
}

export function canShowPersonalizedAds(): boolean {
  const state = getConsentState();
  if (state.ageBracket === 'under13' || state.ageBracket === '13to17') return false;
  return state.adPersonalizationConsent;
}

export function canCollectAnalytics(): boolean {
  const state = getConsentState();
  if (state.ageBracket === 'under13') return false;
  return state.analyticsConsent;
}

/**
 * Apple Guideline 5.1.1(v) — Account deletion.
 * Erases ALL user data from localStorage.
 */
export function deleteAllUserData(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('skillzstorm_') || key?.startsWith('skillstorm_') || key?.startsWith('ss_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));

  // Also remove the consent and age keys
  localStorage.removeItem(CONSENT_KEY);
  localStorage.removeItem(AGE_KEY);
  sessionStorage.clear();
}

/**
 * Withdraw consent — stops data collection but keeps existing data
 * until user requests deletion.
 */
export function withdrawConsent(): void {
  const state = getConsentState();
  state.accepted = false;
  state.analyticsConsent = false;
  state.adPersonalizationConsent = false;
  saveConsentState(state);
}
