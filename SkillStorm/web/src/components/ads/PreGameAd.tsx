/* PRE-GAME AD — Apple 2.5.18 Compliant. Start button always visible. */
import { useEffect } from 'react';
import { AD_CONFIG, adsAllowed } from './AdConfig';
import AdPlaceholder from './AdPlaceholder';

interface Props {
  gameName: string;
  onReady: () => void;
}

export default function PreGameAd({ gameName, onReady }: Props) {
  const showAd = adsAllowed();

  useEffect(() => {
    if (showAd && AD_CONFIG.adsLive) {
      try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}); } catch {}
    }
    if (!showAd) {
      const timer = setTimeout(onReady, 500);
      return () => clearTimeout(timer);
    }
  }, [showAd, onReady]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-6">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3 animate-float">🎮</div>
        <h3 className="font-display font-bold text-lg text-gray-900 mb-2">Loading {gameName}...</h3>
        <div className="flex items-center gap-2 justify-center">
          <div className="w-2 h-2 rounded-full bg-brand-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-brand-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      {showAd && (
        <div className="w-full max-w-sm mb-4">
          {AD_CONFIG.adsLive ? (
            <div className="ad-container rounded-xl" style={{ minHeight: 100 }}>
              <ins className="adsbygoogle" style={{ display: 'block' }}
                data-ad-client={AD_CONFIG.publisherId} data-ad-slot={AD_CONFIG.slots.preGame}
                data-ad-format="rectangle" />
            </div>
          ) : (
            <AdPlaceholder format="rectangle" />
          )}
        </div>
      )}

      <button onClick={onReady} className="btn-elite btn-elite-primary text-sm px-8 py-3 min-h-[44px]">
        Start Game
      </button>
    </div>
  );
}
