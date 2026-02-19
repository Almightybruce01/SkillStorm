/* ═══════════════════════════════════════════════════════════
   INTERSTITIAL AD — Apple App Store Compliant (2.5.18)
   Close button always visible, large touch target, clearly labeled.
   ═══════════════════════════════════════════════════════════ */
import { AD_CONFIG } from './AdConfig';
import AdPlaceholder from './AdPlaceholder';

interface Props {
  onClose: () => void;
}

export default function InterstitialAd({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-pop-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-xs text-gray-400 font-medium">Sponsored</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 font-bold text-sm"
            aria-label="Close advertisement"
          >
            ✕ Close
          </button>
        </div>

        <div className="p-4">
          {AD_CONFIG.adsLive ? (
            <div style={{ minHeight: 250 }}>
              <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client={AD_CONFIG.publisherId}
                data-ad-slot={AD_CONFIG.slots.interstitial}
                data-ad-format="rectangle"
              />
            </div>
          ) : (
            <AdPlaceholder format="rectangle" />
          )}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 font-medium text-sm min-h-[44px]"
          >
            Continue to SkillzStorm
          </button>
        </div>
      </div>
    </div>
  );
}
