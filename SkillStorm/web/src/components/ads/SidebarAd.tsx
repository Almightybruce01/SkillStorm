import { adsAllowed, AD_CONFIG } from './AdConfig';
import AdPlaceholder from './AdPlaceholder';

export default function SidebarAd() {
  if (!adsAllowed()) return null;

  if (AD_CONFIG.adsLive) {
    return (
      <div className="ad-container ad-container-sidebar rounded-xl">
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={AD_CONFIG.publisherId}
          data-ad-slot={AD_CONFIG.slots.sidebar}
          data-ad-format="vertical"
        />
        <p className="text-[10px] text-gray-300 text-center mt-1">Sponsored</p>
      </div>
    );
  }

  return <AdPlaceholder format="sidebar" />;
}
