import { useEffect, useState, useRef } from 'react';
import { ADSENSE_CONFIG, isAdFree } from './AdConfig';
import { AdBanner } from './AdBanner';

export function GameOverAd({ show, score, onRetry, onClose, onRewardedAd }: {
  show: boolean; score: number; onRetry: () => void; onClose: () => void; onRewardedAd?: () => void;
}) {
  const [seconds, setSeconds] = useState(3);
  const [canRetry, setCanRetry] = useState(false);
  const tracked = useRef(false);

  useEffect(() => {
    if (!show || isAdFree()) return;
    if (!tracked.current) {
      const n = parseInt(localStorage.getItem('sz_ad_impressions') || '0', 10);
      localStorage.setItem('sz_ad_impressions', String(n + 1));
      tracked.current = true;
    }
    setSeconds(3); setCanRetry(false);
    const t = setInterval(() => {
      setSeconds(p => {
        if (p <= 1) { setCanRetry(true); clearInterval(t); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [show]);

  useEffect(() => { if (!show) tracked.current = false; }, [show]);
  if (!show || isAdFree()) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
        <h2 className="text-2xl font-black text-gray-800 text-center mb-1">Game Over</h2>
        <p className="text-center text-gray-500 mb-4">Score: <span className="font-bold text-gray-800">{score}</span></p>
        <div className="min-h-[120px] flex items-center justify-center my-4">
          <AdBanner slot={ADSENSE_CONFIG.slots.inArticle} format="auto" className="w-full" />
        </div>
        {onRewardedAd && (
          <button onClick={onRewardedAd} className="w-full py-3 rounded-xl font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors mb-3">
            Watch ad for extra life
          </button>
        )}
        <button onClick={canRetry ? onRetry : undefined} disabled={!canRetry}
          className={`w-full py-3 rounded-xl font-bold transition-colors ${canRetry ? 'text-white bg-gray-800 hover:bg-gray-900' : 'text-gray-400 bg-gray-100 cursor-not-allowed'}`}>
          {canRetry ? 'Try Again' : `Try Again in ${seconds}s`}
        </button>
        {canRetry && <button onClick={onClose} className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600">Close</button>}
      </div>
    </div>
  );
}
