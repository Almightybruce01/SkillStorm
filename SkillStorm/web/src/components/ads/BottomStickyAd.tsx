import { useEffect, useRef } from 'react';
import { AD_CONFIG, adsAllowed } from './AdConfig';
import AdPlaceholder from './AdPlaceholder';

export default function BottomStickyAd() {
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!AD_CONFIG.adsLive) return;
    if (!pushed.current && adRef.current && adsAllowed()) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        pushed.current = true;
      } catch {}
    }
  }, []);

  if (!adsAllowed()) return null;

  if (!AD_CONFIG.adsLive) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <AdPlaceholder format="banner" />
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center bg-white/90 backdrop-blur-sm border-t border-gray-200 shadow-lg pb-[max(0.25rem,env(safe-area-inset-bottom))]">
      <div ref={adRef} className="w-full max-w-4xl" style={{ minHeight: 50 }}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={AD_CONFIG.publisherId}
          data-ad-slot={AD_CONFIG.slots.bottomSticky}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
          data-non-personalized-ads={AD_CONFIG.nonPersonalized ? 'true' : undefined}
        />
      </div>
    </div>
  );
}
