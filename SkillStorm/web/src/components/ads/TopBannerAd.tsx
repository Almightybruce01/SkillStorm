import { useEffect, useRef } from 'react';
import { AD_CONFIG, adsAllowed } from './AdConfig';
import AdPlaceholder from './AdPlaceholder';

export default function TopBannerAd() {
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
      <div className="w-full px-3 sm:px-6 pt-2">
        <AdPlaceholder format="banner" />
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-1 sm:py-2">
      <div ref={adRef} className="w-full max-w-4xl" style={{ minHeight: 50 }}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={AD_CONFIG.publisherId}
          data-ad-slot={AD_CONFIG.slots.topBanner}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
          data-non-personalized-ads={AD_CONFIG.nonPersonalized ? 'true' : undefined}
        />
      </div>
    </div>
  );
}
