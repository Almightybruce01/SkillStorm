import { useEffect, useState, useRef } from 'react';
import { ADSENSE_CONFIG, isAdFree } from './AdConfig';
import { AdBanner } from './AdBanner';

export function PreGameAd({ show, gameName, onReady }: { show: boolean; gameName: string; onReady: () => void }) {
  const [progress, setProgress] = useState(0);
  const tracked = useRef(false);

  useEffect(() => {
    if (!show || isAdFree()) { if (show) onReady(); return; }
    if (!tracked.current) {
      const n = parseInt(localStorage.getItem('sz_ad_impressions') || '0', 10);
      localStorage.setItem('sz_ad_impressions', String(n + 1));
      tracked.current = true;
    }
    setProgress(0);
    let tick = 0;
    const total = 30; // 3 seconds / 100ms
    const timer = setInterval(() => {
      tick++;
      setProgress((tick / total) * 100);
      if (tick >= total) { clearInterval(timer); onReady(); }
    }, 100);
    return () => clearInterval(timer);
  }, [show, onReady]);

  useEffect(() => { if (!show) tracked.current = false; }, [show]);
  if (!show || isAdFree()) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
        <p className="text-center text-gray-500 mb-1">Your game is loading...</p>
        <p className="text-center font-bold text-gray-800 mb-4">{gameName}</p>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-center text-sm text-gray-400 mb-4">{progress < 100 ? `${Math.ceil(3 - (progress / 100) * 3)}s` : 'Starting...'}</p>
        <div className="min-h-[120px] flex items-center justify-center">
          <AdBanner slot={ADSENSE_CONFIG.slots.inArticle} format="auto" className="w-full" />
        </div>
      </div>
    </div>
  );
}
