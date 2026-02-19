/* ═══════════════════════════════════════════════════════════
   CONSENT BANNER — GDPR / COPPA / Apple 5.1.1 Compliance
   
   Shows on first launch to collect:
   1. Age bracket (required — COPPA)
   2. Privacy policy & terms acceptance
   3. Optional ad personalization consent
   
   Apple Guidelines:
   - 5.1.1(ii) explicit user consent for data collection
   - 5.1.4    COPPA — age verification for kids
   - 1.3      no third-party ads for kids
   ═══════════════════════════════════════════════════════════ */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ConsentState,
  CURRENT_POLICY_VERSION,
  saveConsentState,
} from '../utils/consent';

interface Props {
  onComplete: (state: ConsentState) => void;
}

export default function ConsentBanner({ onComplete }: Props) {
  const [step, setStep] = useState<'age' | 'consent'>('age');
  const [ageBracket, setAgeBracket] = useState<ConsentState['ageBracket']>(null);
  const [analyticsConsent, setAnalyticsConsent] = useState(true);
  const [adConsent, setAdConsent] = useState(true);
  const [parentalNotice, setParentalNotice] = useState(false);

  const handleAgeSelect = (bracket: ConsentState['ageBracket']) => {
    setAgeBracket(bracket);
    if (bracket === 'under13') {
      setAdConsent(false);
      setAnalyticsConsent(false);
      setParentalNotice(true);
    } else {
      setParentalNotice(false);
    }
    setStep('consent');
  };

  const handleAccept = () => {
    const state: ConsentState = {
      accepted: true,
      analyticsConsent: ageBracket === 'under13' ? false : analyticsConsent,
      adPersonalizationConsent: ageBracket === 'under13' || ageBracket === '13to17' ? false : adConsent,
      ageBracket,
      consentDate: new Date().toISOString(),
      policyVersion: CURRENT_POLICY_VERSION,
    };
    saveConsentState(state);
    onComplete(state);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-pop-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl font-black">
              S
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">Welcome to SkillzStorm</h2>
              <p className="text-white/80 text-xs">Educational Gaming Platform</p>
            </div>
          </div>
        </div>

        {step === 'age' ? (
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-2">How old are you?</h3>
            <p className="text-sm text-gray-500 mb-5">
              We need this to provide an age-appropriate experience and comply with children's privacy laws (COPPA).
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleAgeSelect('under13')}
                className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-all text-sm font-medium text-gray-700"
              >
                Under 13 years old
              </button>
              <button
                onClick={() => handleAgeSelect('13to17')}
                className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-all text-sm font-medium text-gray-700"
              >
                13 - 17 years old
              </button>
              <button
                onClick={() => handleAgeSelect('18plus')}
                className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-all text-sm font-medium text-gray-700"
              >
                18 years or older
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {parentalNotice && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 text-lg mt-0.5">⚠️</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-800 mb-1">Parental Notice</p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      This app is designed for children. In compliance with COPPA (Children's Online Privacy Protection Act), 
                      we will <strong>not</strong> collect personal information, show personalized ads, or use third-party tracking 
                      for users under 13. A parent or guardian should review and accept these terms.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <h3 className="font-semibold text-gray-900 mb-3">Privacy & Data</h3>

            <div className="space-y-4 mb-6">
              {/* What we collect */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">What we collect</h4>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-violet-500 mt-0.5">•</span>
                    Game scores, progress, and preferences (stored on your device)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-500 mt-0.5">•</span>
                    Sound and display settings (stored on your device)
                  </li>
                  {ageBracket !== 'under13' && (
                    <li className="flex items-start gap-2">
                      <span className="text-violet-500 mt-0.5">•</span>
                      Basic usage data to improve the app experience
                    </li>
                  )}
                </ul>
              </div>

              {/* Toggle options (adults & teens only) */}
              {ageBracket !== 'under13' && (
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analyticsConsent}
                      onChange={e => setAnalyticsConsent(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-violet-500 focus:ring-violet-400"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Usage analytics</p>
                      <p className="text-xs text-gray-500">Help us improve by sharing anonymous usage data</p>
                    </div>
                  </label>
                  {ageBracket === '18plus' && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adConsent}
                        onChange={e => setAdConsent(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-violet-500 focus:ring-violet-400"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Personalized ads</p>
                        <p className="text-xs text-gray-500">Show ads relevant to your interests</p>
                      </div>
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Legal links */}
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              By continuing, you agree to our{' '}
              <Link to="/privacy" className="text-violet-600 underline" target="_blank">Privacy Policy</Link>
              {' '}and{' '}
              <Link to="/terms" className="text-violet-600 underline" target="_blank">Terms of Service</Link>.
              {ageBracket === 'under13' && (
                <> A parent or guardian must accept on behalf of the child.</>
              )}
              {' '}You can withdraw consent or delete your data at any time from Settings.
            </p>

            <button
              onClick={handleAccept}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-violet-200 hover:shadow-violet-300 transition-all active:scale-[0.98]"
            >
              {ageBracket === 'under13' ? 'Parent/Guardian: Accept & Continue' : 'Accept & Continue'}
            </button>

            <button
              onClick={() => setStep('age')}
              className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Change age selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
