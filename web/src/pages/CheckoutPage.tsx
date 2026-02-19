import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TopBannerAd } from '../components/ads/AdBanner';

interface CartItem {
  id: string;
  name: string;
  price: number;
  emoji: string;
  quantity: number;
}

export function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  const isSuccess = searchParams.get('success') === 'true';
  const isCanceled = searchParams.get('canceled') === 'true';

  useEffect(() => {
    if (isSuccess) {
      localStorage.removeItem('skillzstorm_cart');
      // Check if the purchase included ad-free or premium digital products
      const lastDigital = localStorage.getItem('skillzstorm_pending_digital');
      if (lastDigital) {
        const items = lastDigital.split(',');
        if (items.includes('ad_free') || items.includes('premium')) {
          localStorage.setItem('skillzstorm_ad_free', 'true');
        }
        localStorage.removeItem('skillzstorm_pending_digital');
      }
      return;
    }
    const savedCart = localStorage.getItem('skillzstorm_cart');
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch { /* empty */ }
    }
  }, [isSuccess]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = total >= 50 ? 0 : 5.99;
  const PHYSICAL_IDS = ['vr_lite','vr_pro','vr_ultra','3d_basic','3d_polarized','3d_clip','controller','headphones','stand','pencil_case','gel_pens','sticker_pack','backpack','erasers','notebook','labubu','mini_figures','squishy_toy','blind_bag','pop_it','fidget_cube','fidget_spinner','magnetic_rings','stress_ball','fidget_slug','infinity_cube'];
  const hasPhysical = cart.some(item => PHYSICAL_IDS.includes(item.id));
  const finalTotal = total + (hasPhysical ? shipping : 0);

  const removeItem = (id: string) => {
    const updated = cart.filter(item => item.id !== id);
    setCart(updated);
    localStorage.setItem('skillzstorm_cart', JSON.stringify(updated));
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    setError(null);

    const digitalItems = cart
      .filter(item => !PHYSICAL_IDS.includes(item.id))
      .map(item => item.id);
    if (digitalItems.length > 0) {
      localStorage.setItem('skillzstorm_pending_digital', digitalItems.join(','));
    }

    const linkCode = localStorage.getItem('skillzstorm_link_code') || undefined;

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({ id: item.id, quantity: item.quantity })),
          email: email || undefined,
          linkCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Checkout failed');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="pt-20 sm:pt-24 page-enter min-h-[100vh] w-full flex flex-col items-center justify-center text-center px-4">
        <div className="text-8xl mb-6 animate-float">🎉</div>
        <h1 className="text-3xl font-black text-gray-800 mb-3">ORDER CONFIRMED!</h1>
        <p className="text-gray-600 mb-6 max-w-md">
          Thank you for your purchase! You'll receive a confirmation email shortly.
          Physical items typically ship within 5-10 business days. Digital items are instant — open the SkillzStorm app and tap "Sync Purchases" to activate.
        </p>
        <Link to="/" className="gradient-hero px-8 py-3 rounded-xl font-bold text-gray-800">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-20 sm:pt-24 page-enter min-h-[100vh] w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      <TopBannerAd />

      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🛒</div>
        <h1 className="text-3xl font-black mb-2">
          <span className="bg-gradient-to-r from-[#f59e0b] to-[#f97316] bg-clip-text text-transparent">CHECKOUT</span>
        </h1>
        <p className="text-gray-500">Secure payment powered by Stripe</p>
      </div>

      {isCanceled && (
        <div className="game-card !p-4 mb-6 border-[#f59e0b]/30 bg-[#f59e0b]/5">
          <p className="text-center text-gray-600 text-sm">Payment was canceled. Your cart is still here.</p>
        </div>
      )}

      {cart.length === 0 && !isSuccess ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🛒</div>
          <p className="text-gray-500 text-lg mb-4">Your cart is empty</p>
          <Link to="/store" className="text-[#3b82f6] font-bold">Browse the Store →</Link>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-8">
            {cart.map((item) => (
              <div key={item.id} className="game-card p-4 flex items-center gap-4">
                <span className="text-3xl">{item.emoji}</span>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{item.name}</h3>
                  <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#10b981]">${(item.price * item.quantity).toFixed(2)}</div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-xs text-red-400 hover:text-red-300 mt-1"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="game-card p-6 mb-6">
            <h3 className="text-xs font-bold text-[#3b82f6] tracking-wider mb-4">ORDER SUMMARY</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-800">${total.toFixed(2)}</span>
              </div>
              {hasPhysical && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-[#10b981]">{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-800">Total</span>
                  <span className="font-bold text-[#10b981] text-lg">${finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
            {hasPhysical && total < 50 && (
              <p className="text-xs text-[#f59e0b] mt-3">
                Add ${(50 - total).toFixed(2)} more for FREE shipping!
              </p>
            )}
          </div>

          <div className="game-card p-4 mb-6">
            <label className="text-xs font-bold text-gray-600 block mb-2">Email for order confirmation</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-[#3b82f6]/50 transition-colors"
            />
          </div>

          {error && (
            <div className="game-card !p-4 mb-4 border-red-300/30 bg-red-50">
              <p className="text-center text-red-500 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={isProcessing}
            className={`w-full py-4 rounded-2xl font-bold text-lg text-gray-800 transition-all hover:scale-[1.01] ${
              isProcessing ? 'bg-gray-600 cursor-wait' : 'gradient-hero shadow-lg shadow-[#3b82f6]/25 hover:shadow-[#3b82f6]/40'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Redirecting to Stripe...
              </span>
            ) : (
              `💳 Pay $${finalTotal.toFixed(2)} with Stripe`
            )}
          </button>

          <div className="flex items-center justify-center gap-6 mt-6 text-gray-400">
            <div className="flex items-center gap-1 text-xs">
              <span>🔒</span> SSL Encrypted
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span>💳</span> Stripe Secure
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span>↩️</span> 30-Day Returns
            </div>
          </div>

          <p className="text-center text-gray-300 text-xs mt-4">
            You'll be redirected to Stripe's secure checkout to complete your purchase.
            <br />Physical items ship within 5-10 business days. Digital items sync to the iOS app instantly.
          </p>
        </>
      )}
    </div>
  );
}
