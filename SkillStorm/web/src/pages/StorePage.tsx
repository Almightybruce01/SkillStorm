/* ═══════════════════════════════════════════════════════════
   STORE PAGE — Apple App Store Compliant
   
   Apple Guideline 3.1.1:
   All digital content/subscriptions must use Apple IAP on iOS.
   On web, standard pricing is shown.
   
   Guideline 3.1.2(c):
   Auto-renewable subscriptions must clearly describe what
   the user gets and include renewal terms.
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../engine/gameStats';
import { canShowAds } from '../utils/consent';
import { mustUseAppleIAP, shouldShowAds, isIOSDevice } from '../utils/platform';
import {
  IAP_PRODUCTS,
  IAPProduct,
  purchaseProduct,
  restorePurchases,
  SUBSCRIPTION_DISCLOSURE,
} from '../utils/iapStore';

const categories = [
  { id: 'all', label: 'All Items' },
  { id: 'premium', label: 'Premium Plans' },
  { id: 'coins', label: 'Coin Packs' },
  { id: 'cosmetic', label: 'Cosmetics' },
];

export default function StorePage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [coinBalance, setCoinBalance] = useState(0);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const isIOS = mustUseAppleIAP() || isIOSDevice();
  const showAds = shouldShowAds() && canShowAds();

  useEffect(() => {
    const stats = getStats();
    setCoinBalance(stats.coins);
  }, []);

  const filteredItems = activeCategory === 'all'
    ? IAP_PRODUCTS
    : IAP_PRODUCTS.filter(i => i.category === activeCategory);

  const handlePurchase = async (product: IAPProduct) => {
    setError(null);
    if (isIOS) {
      setPurchasing(product.productId);
      const result = await purchaseProduct(product.productId);
      setPurchasing(null);
      if (result.success) {
        setPurchased(prev => new Set(prev).add(product.productId));
      } else if (result.error === 'web_checkout_required') {
        // Not on native iOS — shouldn't happen but handle gracefully
      } else {
        setError(result.error || 'Purchase failed. Please try again.');
      }
    }
    // On web, navigate to checkout
  };

  const handleRestore = async () => {
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);
    if (result.success) {
      const newPurchased = new Set(purchased);
      result.restored.forEach(id => newPurchased.add(id));
      setPurchased(newPurchased);
    }
  };

  return (
    <div className="page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10">
          <div>
            <h1 className="section-heading text-3xl md:text-4xl font-display font-bold">Store</h1>
            <p className="text-gray-500 mt-4 text-base md:text-lg">Upgrade your experience with premium features, coins, and cosmetics.</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-4">
            <div className="game-card px-4 py-2 flex items-center gap-2">
              <span className="text-lg">🪙</span>
              <span className="font-bold text-amber-600">{coinBalance.toLocaleString()} coins</span>
            </div>
            {/* Restore Purchases — Required by Apple */}
            {isIOS && (
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="game-card px-4 py-2 flex items-center gap-2 hover:border-violet-300 transition-colors text-sm font-medium text-gray-700"
              >
                <span>🔄</span>
                {restoring ? 'Restoring...' : 'Restore'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-violet-500 text-white shadow-md shadow-violet-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-violet-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
          {filteredItems.map((item, i) => (
            <div key={item.productId} className="game-card overflow-hidden card-entrance group relative" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className={`h-28 sm:h-32 bg-gradient-to-br ${item.gradient} flex items-center justify-center relative overflow-hidden`}>
                <span className="text-5xl sm:text-6xl drop-shadow-lg group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                {item.tag && (
                  <span className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-bold rounded-full shadow">
                    {item.tag}
                  </span>
                )}
              </div>

              <div className="p-5 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1.5">{item.name}</h3>
                <p className="text-sm sm:text-base text-gray-500 mb-4 leading-relaxed min-h-[2.5rem]">{item.description}</p>

                {item.type === 'auto_renewable' && (
                  <p className="text-xs sm:text-sm text-gray-400 mb-4 leading-relaxed">
                    Auto-renewable subscription. {item.productId.includes('monthly') ? SUBSCRIPTION_DISCLOSURE.monthly.text : SUBSCRIPTION_DISCLOSURE.yearly.text}
                  </p>
                )}

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xl sm:text-2xl font-display font-bold text-gradient">{item.webPrice}</span>
                  {purchased.has(item.productId) ? (
                    <span className="text-sm px-4 py-2.5 bg-green-100 text-green-700 rounded-xl font-medium">
                      Purchased
                    </span>
                  ) : isIOS ? (
                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={purchasing === item.productId}
                      className="btn-elite btn-elite-primary text-sm px-5 py-2.5"
                    >
                      {purchasing === item.productId ? 'Buying...' : 'Buy'}
                    </button>
                  ) : (
                    <Link to="/checkout" className="btn-elite btn-elite-primary text-sm px-5 py-2.5">
                      Get
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Legal Footer */}
        <div className="mt-10 text-center space-y-3">
          {isIOS && (
            <p className="text-xs text-gray-400 max-w-lg mx-auto leading-relaxed">
              All purchases are processed through Apple's In-App Purchase system and charged to your Apple ID. 
              Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period.
            </p>
          )}
          <div className="flex justify-center gap-4 text-xs">
            <Link to="/privacy" className="text-violet-600 hover:underline">Privacy Policy</Link>
            <Link to="/terms" className="text-violet-600 hover:underline">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
