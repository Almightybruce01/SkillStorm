/* ═══════════════════════════════════════════════════════════
   DATA & PRIVACY SETTINGS PAGE
   
   Apple Guidelines Addressed:
   - 5.1.1(ii)   Withdraw consent mechanism
   - 5.1.1(v)    Account/data deletion
   - 5.1.2(i)    Data sharing controls
   
   Provides:
   - View what data is stored
   - Toggle consent for analytics and ads
   - Delete all personal data
   - Withdraw consent
   - Restore purchases
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import {
  getConsentState,
  saveConsentState,
  deleteAllUserData,
  withdrawConsent,
  ConsentState,
} from '../utils/consent';
import { restorePurchases } from '../utils/iapStore';
import { mustUseAppleIAP } from '../utils/platform';

export default function DataSettingsPage() {
  const [consent, setConsent] = useState<ConsentState>(getConsentState());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<string | null>(null);

  useEffect(() => {
    setConsent(getConsentState());
  }, []);

  const handleToggleAnalytics = () => {
    const updated = { ...consent, analyticsConsent: !consent.analyticsConsent };
    saveConsentState(updated);
    setConsent(updated);
  };

  const handleToggleAds = () => {
    const updated = { ...consent, adPersonalizationConsent: !consent.adPersonalizationConsent };
    saveConsentState(updated);
    setConsent(updated);
  };

  const handleWithdrawConsent = () => {
    withdrawConsent();
    setConsent(getConsentState());
  };

  const handleDeleteData = () => {
    deleteAllUserData();
    setDeleted(true);
    setShowDeleteConfirm(false);
  };

  const handleRestorePurchases = async () => {
    setRestoring(true);
    setRestoreResult(null);
    try {
      const result = await restorePurchases();
      if (result.success && result.restored.length > 0) {
        setRestoreResult(`Restored ${result.restored.length} purchase(s).`);
      } else if (result.success) {
        setRestoreResult('No previous purchases found.');
      } else {
        setRestoreResult('Could not restore purchases. Try again later.');
      }
    } catch {
      setRestoreResult('Could not restore purchases. Try again later.');
    }
    setRestoring(false);
  };

  if (deleted) {
    return (
      <div className="page-enter max-w-lg mx-auto px-4 py-20 text-center">
        <div className="game-card p-10">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 mb-3">Data Deleted</h1>
          <p className="text-gray-600 mb-2">All your personal data has been permanently removed from this device.</p>
          <p className="text-sm text-gray-500 mb-6">This includes game progress, achievements, preferences, and consent records.</p>
          <a href="/" className="btn-elite btn-elite-primary">Return Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="section-heading text-2xl font-display font-bold">Data & Privacy Settings</h1>
        <p className="text-gray-500 mt-4 mb-8">
          Manage your data, consent preferences, and privacy settings. Changes take effect immediately.
        </p>

        {/* Current Consent Status */}
        <div className="game-card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>🔒</span> Consent Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-700">Privacy Policy Accepted</p>
                <p className="text-xs text-gray-500">Version {consent.policyVersion || 'none'}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${consent.accepted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {consent.accepted ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-700">Age Bracket</p>
              </div>
              <span className="text-sm text-gray-600">
                {consent.ageBracket === 'under13' ? 'Under 13' :
                 consent.ageBracket === '13to17' ? '13-17' :
                 consent.ageBracket === '18plus' ? '18+' : 'Not set'}
              </span>
            </div>
            {consent.consentDate && (
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-700">Consent Date</p>
                <span className="text-sm text-gray-600">{new Date(consent.consentDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Data Collection Toggles */}
        {consent.ageBracket !== 'under13' && (
          <div className="game-card p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📊</span> Data Collection
            </h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-700">Usage Analytics</p>
                  <p className="text-xs text-gray-500">Anonymous data to improve the app</p>
                </div>
                <div
                  onClick={handleToggleAnalytics}
                  className={`w-11 h-6 rounded-full transition-colors cursor-pointer flex items-center ${consent.analyticsConsent ? 'bg-violet-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${consent.analyticsConsent ? 'translate-x-5.5' : 'translate-x-0.5'}`} style={{transform: consent.analyticsConsent ? 'translateX(22px)' : 'translateX(2px)'}} />
                </div>
              </label>
              {consent.ageBracket === '18plus' && (
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Personalized Ads</p>
                    <p className="text-xs text-gray-500">Show ads relevant to your interests</p>
                  </div>
                  <div
                    onClick={handleToggleAds}
                    className={`w-11 h-6 rounded-full transition-colors cursor-pointer flex items-center ${consent.adPersonalizationConsent ? 'bg-violet-500' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform`} style={{transform: consent.adPersonalizationConsent ? 'translateX(22px)' : 'translateX(2px)'}} />
                  </div>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Data Stored */}
        <div className="game-card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>💾</span> Data Stored on This Device
          </h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2"><span className="text-violet-500">•</span> Game scores and high scores</li>
            <li className="flex items-start gap-2"><span className="text-violet-500">•</span> Achievement progress and unlocked achievements</li>
            <li className="flex items-start gap-2"><span className="text-violet-500">•</span> Recently played games and favorites</li>
            <li className="flex items-start gap-2"><span className="text-violet-500">•</span> Sound and display preferences</li>
            <li className="flex items-start gap-2"><span className="text-violet-500">•</span> Consent and age verification status</li>
          </ul>
          <p className="text-xs text-gray-500 mt-3">
            All data is stored locally on your device. No personal data is sent to our servers.
          </p>
        </div>

        {/* Restore Purchases — Required by Apple */}
        {mustUseAppleIAP() && (
          <div className="game-card p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🔄</span> Restore Purchases
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              If you've previously purchased Premium or other items, you can restore them here.
            </p>
            <button
              onClick={handleRestorePurchases}
              disabled={restoring}
              className="btn-elite btn-elite-secondary text-sm"
            >
              {restoring ? 'Restoring...' : 'Restore Purchases'}
            </button>
            {restoreResult && (
              <p className="text-sm text-gray-600 mt-3">{restoreResult}</p>
            )}
          </div>
        )}

        {/* Withdraw Consent */}
        <div className="game-card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>🚫</span> Withdraw Consent
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Revoke your consent for data collection. The app will continue to work but will show the consent prompt again. 
            Your existing data will remain until you choose to delete it.
          </p>
          <button
            onClick={handleWithdrawConsent}
            className="btn-elite text-sm px-4 py-2 border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"
          >
            Withdraw Consent
          </button>
        </div>

        {/* Delete All Data */}
        <div className="game-card p-6 border-red-200">
          <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
            <span>🗑️</span> Delete All Data
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Permanently delete all your data from this device, including game progress, achievements, preferences, and consent records.
            <strong className="text-red-600"> This action cannot be undone.</strong>
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-elite text-sm px-4 py-2 border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            >
              Delete All My Data
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-800 mb-3">Are you absolutely sure?</p>
              <p className="text-xs text-red-700 mb-4">All game progress, high scores, achievements, and preferences will be permanently deleted.</p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteData}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors"
                >
                  Yes, Delete Everything
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
