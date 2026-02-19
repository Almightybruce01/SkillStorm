import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mustUseAppleIAP, isIOSDevice, isNativeiOS } from '../utils/platform';
import {
  IAP_PRODUCTS,
  purchaseProduct,
  restorePurchases,
  SUBSCRIPTION_DISCLOSURE,
} from '../utils/iapStore';

type PlanId = 'monthly' | 'yearly';

export default function CheckoutPage() {
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('monthly');
  const [restoring, setRestoring] = useState(false);
  const [iapReady, setIapReady] = useState<boolean | null>(null);

  const isIOS = mustUseAppleIAP() || isIOSDevice();

  const monthlyProduct = IAP_PRODUCTS.find(p => p.productId === 'com.skillzstorm.premium.monthly')!;
  const yearlyProduct = IAP_PRODUCTS.find(p => p.productId === 'com.skillzstorm.premium.yearly')!;
  const selectedProduct = selectedPlan === 'monthly' ? monthlyProduct : yearlyProduct;

  useEffect(() => {
    if (!isIOS) { setIapReady(true); return; }
    const w = window as any;
    const hasBridge = !!(w.Capacitor?.Plugins?.InAppPurchase || w.store);
    setIapReady(hasBridge || !isNativeiOS());
  }, [isIOS]);

  const handleIOSPurchase = async () => {
    setProcessing(true);
    setError(null);
    const result = await purchaseProduct(selectedProduct.productId);
    setProcessing(false);
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Purchase could not be completed. Please try again.');
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);
    if (result.success && result.restored.length > 0) {
      setSuccess(true);
    } else {
      setError('No previous purchases found to restore.');
    }
  };

  const handleWebCheckout = () => {
    setError('Web checkout coming soon. Download the iOS app for the best experience.');
  };

  if (success) {
    return (
      <div className="page-enter max-w-lg mx-auto px-6 py-20 text-center">
        <div className="game-card p-10">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-3">Purchase Successful!</h1>
          <p className="text-gray-600 text-base mb-2">Thank you for upgrading to Premium.</p>
          <p className="text-sm text-gray-500 mb-8">Your premium features are now active.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/games" className="btn-elite btn-elite-primary">Start Playing</Link>
            <Link to="/dashboard" className="btn-elite btn-elite-secondary">View Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter max-w-2xl mx-auto px-5 sm:px-6 py-10 sm:py-12">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 sm:mb-8">
        <Link to="/" className="hover:text-violet-600">Home</Link>
        <span>/</span>
        <Link to="/store" className="hover:text-violet-600">Store</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Checkout</span>
      </div>

      <h1 className="section-heading text-2xl sm:text-3xl font-display font-bold mb-2">Checkout</h1>
      <p className="text-gray-500 mb-6 sm:mb-8 text-base sm:text-lg leading-relaxed">Complete your purchase to upgrade your SkillzStorm experience.</p>

      {/* Plan Selector */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <button
          onClick={() => setSelectedPlan('monthly')}
          className={`game-card p-4 sm:p-5 text-left transition-all ${selectedPlan === 'monthly' ? 'border-violet-400 ring-2 ring-violet-200 shadow-lg' : ''}`}
        >
          <p className="text-base sm:text-lg font-bold text-gray-900">{monthlyProduct.webPrice}</p>
          <p className="text-sm text-gray-500 mt-1">Monthly</p>
        </button>
        <button
          onClick={() => setSelectedPlan('yearly')}
          className={`game-card p-4 sm:p-5 text-left transition-all relative ${selectedPlan === 'yearly' ? 'border-violet-400 ring-2 ring-violet-200 shadow-lg' : ''}`}
        >
          <span className="absolute -top-2 right-3 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">Save 33%</span>
          <p className="text-base sm:text-lg font-bold text-gray-900">{yearlyProduct.webPrice}</p>
          <p className="text-sm text-gray-500 mt-1">Yearly</p>
        </button>
      </div>

      <div className="game-card p-6 sm:p-8 mb-6">
        {/* Order Summary */}
        <div className="mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div className="pr-4">
              <p className="font-medium text-gray-900 text-base">{selectedProduct.name}</p>
              <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{selectedProduct.description}</p>
            </div>
            <span className="text-lg sm:text-xl font-bold text-gradient whitespace-nowrap">{selectedProduct.webPrice}</span>
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <span className="font-bold text-gray-900 text-base">Total</span>
            <span className="text-xl sm:text-2xl font-display font-bold text-gradient">{selectedProduct.webPrice}</span>
          </div>
        </div>

        {/* iOS: Apple IAP */}
        {isIOS ? (
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Purchase via App Store</h2>
            <p className="text-sm text-gray-500 mb-5 sm:mb-6 leading-relaxed">
              This purchase will be processed through your Apple ID and charged to your App Store account.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-red-700 leading-relaxed">{error}</p>
              </div>
            )}

            {iapReady === false && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-700 leading-relaxed">
                  In-App Purchase is initializing. Please close and reopen the app if this persists.
                </p>
              </div>
            )}

            <button
              onClick={handleIOSPurchase}
              disabled={processing || iapReady === false}
              className={`w-full py-4 rounded-xl bg-black text-white font-bold text-base shadow-lg transition-all min-h-[52px] ${processing || iapReady === false ? 'opacity-70 cursor-wait' : 'hover:bg-gray-800 active:scale-[0.98]'}`}
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Subscribe with Apple
                </span>
              )}
            </button>

            <button
              onClick={handleRestore}
              disabled={restoring}
              className="w-full mt-3 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors min-h-[48px]"
            >
              {restoring ? 'Restoring...' : 'Restore Previous Purchase'}
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Web Purchase</h2>
            <p className="text-sm text-gray-500 mb-5 sm:mb-6 leading-relaxed">
              For the best experience and secure purchasing, download our iOS app from the App Store.
              Web checkout will be available soon.
            </p>

            {error && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-700 leading-relaxed">{error}</p>
              </div>
            )}

            <button
              onClick={handleWebCheckout}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold text-base shadow-lg shadow-violet-200 hover:shadow-violet-300 transition-all active:scale-[0.98] min-h-[52px]"
            >
              Continue to Checkout
            </button>
          </div>
        )}
      </div>

      {/* Subscription Disclosure — Required by Apple 3.1.2(c) */}
      {selectedProduct.type === 'auto_renewable' && (
        <div className="bg-gray-50 rounded-xl p-5 sm:p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Subscription Terms</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            {selectedPlan === 'monthly' ? SUBSCRIPTION_DISCLOSURE.monthly.text : SUBSCRIPTION_DISCLOSURE.yearly.text}
          </p>
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">
            Payment will be charged to your {isIOS ? 'Apple ID account' : 'payment method'} at confirmation of purchase. 
            Subscription automatically renews unless it is canceled at least 24 hours before the end of the current period. 
            Your account will be charged for renewal within 24 hours prior to the end of the current period at the rate of the selected plan. 
            You can manage and cancel your subscriptions by going to your {isIOS ? 'App Store account settings' : 'account settings'} after purchase.
          </p>
        </div>
      )}

      {/* Security & Legal */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-gray-400 mb-6">
        <div className="flex items-center gap-1.5 text-sm">
          Secure Transaction
        </div>
        {isIOS && (
          <div className="flex items-center gap-1.5 text-sm">
            Apple In-App Purchase
          </div>
        )}
        <div className="flex items-center gap-1.5 text-sm">
          Cancel Anytime
        </div>
      </div>

      <div className="text-center space-y-3">
        <div className="flex justify-center gap-4 text-sm">
          <Link to="/privacy" className="text-violet-600 hover:underline">Privacy Policy</Link>
          <Link to="/terms" className="text-violet-600 hover:underline">Terms of Service</Link>
        </div>
        <Link to="/store" className="text-sm text-gray-500 hover:text-violet-600 block">
          Back to Store
        </Link>
      </div>
    </div>
  );
}
