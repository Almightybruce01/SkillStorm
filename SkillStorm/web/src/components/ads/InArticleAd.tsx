import { adsAllowed, AD_CONFIG } from './AdConfig';
import AdPlaceholder from './AdPlaceholder';

export default function InArticleAd() {
  if (!adsAllowed()) return null;

  if (AD_CONFIG.adsLive) {
    return (
      <div className="my-6 ad-container rounded-xl" style={{ minHeight: 250 }}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block', textAlign: 'center' }}
          data-ad-client={AD_CONFIG.publisherId}
          data-ad-slot={AD_CONFIG.slots.inArticle}
          data-ad-layout="in-article"
          data-ad-format="fluid"
        />
        <p className="text-[10px] text-gray-300 text-center mt-1">Advertisement</p>
      </div>
    );
  }

  return (
    <div className="my-4 px-3">
      <AdPlaceholder format="rectangle" />
    </div>
  );
}
