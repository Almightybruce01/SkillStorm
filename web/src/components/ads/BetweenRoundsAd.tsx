import { useEffect, useState, useRef } from 'react';
import { ADSENSE_CONFIG, isAdFree } from './AdConfig';
import { AdBanner } from './AdBanner';

export function BetweenRoundsAd({ show, level, score, onContinue }: {
  show: boolean; level: number; score: number; onContinue: () => void;
}) {
  const [seconds, setSeconds] = useState(2);
  const [canContinue, setCanContinue] = useState(false);
  const tracked = useRef(false);

  useEffect(() => {
    if (!show || isAdFree()) return;
    if (!tracked.current) {
      const n = parseInt(localStorage.getItem('sz_ad_impressions') || '0', 10);
      localStorage.setItem('sz_ad_impressions', String(n + 1));
      tracked.current = true;
    }
    setCanContinue(false); setSeconds(2);
    const t = setInterval(() => {
      setSeconds(p => {
        if (p <= 1) { setCanContinue(true); clearInterval(t); return 0; }
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
        <h2 className="text-xl font-black text-gray-800 text-center mb-2">Level {level} Complete!</h2>
        <p className="text-center text-gray-500 mb-4">Score: <span className="font-bold text-gray-800">{score}</span></p>
        <div className="min-h-[120px] flex items-center justify-center my-4">
          <AdBanner slot={ADSENSE_CONFIG.slots.inArticle} format="auto" className="w-full" />
        </div>
        <button onClick={canContinue ? onContinue : undefined} disabled={!canContinue}
          className={`w-full py-3 rounded-xl font-bold transition-colors ${canContinue ? 'text-white bg-blue-600 hover:bg-blue-700' : 'text-gray-400 bg-gray-100 cursor-not-allowed'}`}>
          {canContinue ? `Continue to Level ${level + 1}` : `Continue in ${seconds}s`}
        </button>
      </div>
    </div>
  );
}
