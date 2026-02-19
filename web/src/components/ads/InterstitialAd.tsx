import { useEffect, useState, useRef } from 'react';
import { ADSENSE_CONFIG, isAdFree } from './AdConfig';
import { AdBanner } from './AdBanner';

const COUNTDOWN = 5;

export function InterstitialAd({ onClose, show }: { onClose: () => void; show: boolean }) {
  const [seconds, setSeconds] = useState(COUNTDOWN);
  const [canSkip, setCanSkip] = useState(false);
  const tracked = useRef(false);

  useEffect(() => {
    if (!show || isAdFree()) return;
    if (!tracked.current) {
      const n = parseInt(localStorage.getItem('sz_ad_impressions') || '0', 10);
      localStorage.setItem('sz_ad_impressions', String(n + 1));
      tracked.current = true;
    }
    setSeconds(COUNTDOWN);
    setCanSkip(false);
    const t = setInterval(() => {
      setSeconds(p => {
        if (p <= 1) { setCanSkip(true); clearInterval(t); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [show]);

  useEffect(() => { if (!show) tracked.current = false; }, [show]);

  if (!show || isAdFree()) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={canSkip ? onClose : undefined} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Advertisement</p>
        <div className="min-h-[200px] flex items-center justify-center my-4">
          <AdBanner slot={ADSENSE_CONFIG.slots.inArticle} format="auto" className="w-full" />
        </div>
        <div className="mt-4 flex justify-center">
          {canSkip ? (
            <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors">
              Continue
            </button>
          ) : (
            <p className="text-sm text-gray-500">Skip in {seconds}s</p>
          )}
        </div>
      </div>
    </div>
  );
}
