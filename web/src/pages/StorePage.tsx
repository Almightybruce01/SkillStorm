import { useState } from 'react';
import { Link } from 'react-router-dom';
import { InArticleAd, TopBannerAd } from '../components/ads/AdBanner';

interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  priceNum: number;
  emoji: string;
  category: string;
  features: string[];
  inStock: boolean;
  isPhysical: boolean;
  accentColor: string;
}

const products: StoreProduct[] = [
  { id: 'vr_lite', name: 'StormVR Lite', description: 'Phone-in-headset for immersive VR. Insert your iPhone, launch StormVR games, and learn in virtual reality.', price: '$39.99', priceNum: 39.99, emoji: '🥽', category: 'VR Headsets', features: ['Lightweight design', 'Adjustable straps', 'Works with iPhone/Android', 'Includes controller', 'Fits all ages'], inStock: true, isPhysical: true, accentColor: '#3b82f6' },
  { id: 'vr_pro', name: 'StormVR Pro', description: 'Premium standalone VR headset with built-in SkillzStorm. No phone needed. 6DOF tracking and hand tracking.', price: '$179.99', priceNum: 179.99, emoji: '🎧', category: 'VR Headsets', features: ['Standalone — no phone', 'Built-in SkillzStorm', 'High-res 2K displays', '6DOF head tracking', 'Hand tracking', '2-hour battery'], inStock: true, isPhysical: true, accentColor: '#8b5cf6' },
  { id: 'vr_ultra', name: 'StormVR Ultra', description: 'Top-tier VR with eye tracking, haptic feedback, and 4K displays. Coming Q3 2026.', price: '$349.99', priceNum: 349.99, emoji: '🔮', category: 'VR Headsets', features: ['Eye tracking', 'Haptic controllers', '4K per-eye', 'Wireless streaming', 'Passthrough AR', '5-hour battery'], inStock: false, isPhysical: true, accentColor: '#ec4899' },
  { id: '3d_basic', name: 'Storm3D Basic', description: 'Pack of 5 red/cyan 3D glasses. Works with all Storm3D games on any screen.', price: '$7.99', priceNum: 7.99, emoji: '👓', category: '3D Glasses', features: ['Pack of 5', 'Classic red/cyan', 'Works on any screen', 'Scratch-resistant'], inStock: true, isPhysical: true, accentColor: '#10b981' },
  { id: '3d_polarized', name: 'Storm3D Polarized', description: 'Polarized 3D glasses for color-accurate, comfortable viewing.', price: '$19.99', priceNum: 19.99, emoji: '🕶️', category: '3D Glasses', features: ['Polarized lenses', 'No color distortion', 'Comfortable fit', 'Durable frame'], inStock: true, isPhysical: true, accentColor: '#06b6d4' },
  { id: '3d_clip', name: 'Storm3D Clip-On', description: 'Clip-on 3D lenses for people who wear glasses.', price: '$14.99', priceNum: 14.99, emoji: '👁️', category: '3D Glasses', features: ['Clips onto glasses', 'Universal fit', 'Flip-up design', 'Anti-scratch coating'], inStock: true, isPhysical: true, accentColor: '#f59e0b' },
  { id: 'controller', name: 'StormPad Controller', description: 'Bluetooth game controller optimized for SkillzStorm. Dedicated Storm button for quick actions.', price: '$34.99', priceNum: 34.99, emoji: '🎮', category: 'Accessories', features: ['Bluetooth 5.0', 'iOS & Android & Web', '8-hour battery', 'Storm button', 'Ergonomic design'], inStock: true, isPhysical: true, accentColor: '#3b82f6' },
  { id: 'headphones', name: 'StormSound Buds', description: 'Wireless earbuds with low-latency gaming mode and spatial audio.', price: '$29.99', priceNum: 29.99, emoji: '🎵', category: 'Accessories', features: ['Low latency mode', 'Spatial audio', '4-hour battery', 'Sweat-resistant'], inStock: true, isPhysical: true, accentColor: '#8b5cf6' },
  { id: 'stand', name: 'StormStand', description: 'Adjustable tablet/phone stand for hands-free gaming.', price: '$17.99', priceNum: 17.99, emoji: '📱', category: 'Accessories', features: ['Adjustable angle', 'Foldable & portable', 'Anti-slip base', 'Fits all devices'], inStock: true, isPhysical: true, accentColor: '#f97316' },
];

const storeCategories = ['All', 'VR Headsets', '3D Glasses', 'Accessories'];

export function StorePage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<StoreProduct[]>([]);

  const filtered = selectedCategory === 'All' ? products : products.filter(p => p.category === selectedCategory);

  const addToCart = (product: StoreProduct) => {
    const updated = [...cart, product];
    setCart(updated);
    const cartData = updated.map(p => ({ id: p.id, name: p.name, price: p.priceNum, emoji: p.emoji, quantity: 1 }));
    localStorage.setItem('skillzstorm_cart', JSON.stringify(cartData));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.priceNum, 0);

  return (
    <div className="pt-20 sm:pt-24 page-enter min-h-[100vh] w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      <TopBannerAd />

      {/* Header */}
      <div className="text-center mb-10 animate-slide-up relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[150px] bg-gradient-to-r from-[#f59e0b]/10 to-[#f97316]/10 blur-[80px] rounded-full pointer-events-none" />
        <h1 className="text-5xl sm:text-6xl font-black mb-3 relative">
          <span className="bg-gradient-to-r from-[#f59e0b] via-[#f97316] to-[#ef4444] bg-clip-text text-transparent">STORM STORE</span>
        </h1>
        <p className="text-gray-400 text-sm">VR Headsets • 3D Glasses • Accessories</p>
        <p className="text-xs text-gray-300 mt-2">All products ship to your door • Secure Stripe checkout • Free shipping over $50</p>
      </div>

      {/* Premium CTA */}
      <Link to="/premium" className="block mb-6 animate-slide-up delay-100">
        <div className="glass-card glass-card-gold p-4 flex items-center justify-between btn-shimmer overflow-hidden"
             style={{ background: 'linear-gradient(135deg, rgba(255,230,0,0.05), rgba(255,128,0,0.03))' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">👑</span>
            <div>
              <span className="font-bold text-gray-800">Looking for Premium?</span>
              <span className="text-gray-400 text-sm ml-2 hidden sm:inline">Ad-free, coins, season pass</span>
            </div>
          </div>
          <span className="text-[#f59e0b] font-bold text-sm group-hover:translate-x-1 transition-transform">Go Premium →</span>
        </div>
      </Link>

      {/* VR Info CTA */}
      <Link to="/vr" className="block mb-6 animate-slide-up delay-200">
        <div className="glass-card glass-card-cyan p-4 flex items-center justify-between btn-shimmer overflow-hidden"
             style={{ background: 'linear-gradient(135deg, rgba(0,230,230,0.05), rgba(0,153,255,0.03))' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🥽</span>
            <div>
              <span className="font-bold text-gray-800">How does VR work?</span>
              <span className="text-gray-400 text-sm ml-2 hidden sm:inline">4 ways to play VR</span>
            </div>
          </div>
          <span className="text-[#06b6d4] font-bold text-sm">Learn More →</span>
        </div>
      </Link>

      {/* Category filters */}
      <div className="flex gap-2 mb-10 overflow-x-auto pb-2 justify-center animate-slide-up delay-300">
        {storeCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className="whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 active:scale-90 border"
            style={selectedCategory === cat ? {
              borderColor: 'rgba(153,51,255,0.4)',
              color: '#8b5cf6',
              backgroundColor: 'rgba(153,51,255,0.12)',
              boxShadow: '0 0 15px rgba(153,51,255,0.15)',
            } : {
              borderColor: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.35)',
              backgroundColor: 'rgba(255,255,255,0.03)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cart */}
      {cart.length > 0 && (
        <div className="glass-card glass-card-green p-4 flex items-center justify-between mb-6 animate-pop-in" style={{ background: 'linear-gradient(135deg, rgba(0,255,128,0.05), rgba(0,153,255,0.03))' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl animate-bounce-in">🛒</span>
            <span className="font-bold text-gray-800">{cart.length} items</span>
            <span className="text-[#10b981] font-black text-lg neon-glow-green">${cartTotal.toFixed(2)}</span>
          </div>
          <Link
            to="/checkout"
            className="gradient-hero px-6 py-2.5 rounded-xl font-bold text-sm text-gray-800 hover:opacity-90 transition-all duration-300 hover:scale-105 active:scale-95 btn-shimmer overflow-hidden"
          >
            <span className="relative z-10">Checkout with Stripe →</span>
          </Link>
        </div>
      )}

      {/* Products */}
      <div className="space-y-4">
        {filtered.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={() => addToCart(product)}
            index={i}
          />
        ))}
      </div>

      <InArticleAd />

      {/* Shipping info */}
      <div className="glass-card p-8 mt-8 animate-slide-up">
        <h3 className="font-black text-gray-800 text-center mb-6 tracking-wider">SHIPPING & PAYMENT</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <ShippingPerk icon="📦" title="5-10 Day Shipping" desc="Standard delivery" color="#3b82f6" />
          <ShippingPerk icon="🆓" title="Free Over $50" desc="Free shipping" color="#10b981" />
          <ShippingPerk icon="↩️" title="30-Day Returns" desc="Easy returns" color="#8b5cf6" />
        </div>
      </div>

      {/* Stripe badge */}
      <div className="text-center mt-8 text-gray-300 text-sm flex items-center justify-center gap-2">
        <span>🔒</span>
        <span>Powered by Stripe • Secure Payments • 256-bit SSL</span>
      </div>
    </div>
  );
}

function ShippingPerk({ icon, title, desc, color }: { icon: string; title: string; desc: string; color: string }) {
  return (
    <div className="group cursor-default">
      <div className="text-2xl mb-2 transition-transform duration-300 group-hover:scale-125">{icon}</div>
      <div className="text-sm font-bold transition-colors duration-300" style={{ color }}>{title}</div>
      <div className="text-xs text-gray-400">{desc}</div>
    </div>
  );
}

function ProductCard({ product, onAddToCart, index }: { product: StoreProduct; onAddToCart: () => void; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      className="game-card !p-5 cursor-pointer active:!scale-[0.99] animate-slide-up"
      style={{ animationDelay: `${index * 0.08}s`, borderColor: expanded ? `${product.accentColor}30` : undefined, boxShadow: expanded ? `0 8px 40px ${product.accentColor}12` : undefined }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-4">
        <div 
          className="text-4xl w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 hover:scale-110"
          style={{ background: `${product.accentColor}10`, border: `1px solid ${product.accentColor}20` }}
        >
          {product.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-800">{product.name}</h3>
            <span className="text-[8px] font-black px-2 py-0.5 rounded-md" style={{ backgroundColor: `${product.accentColor}20`, color: product.accentColor }}>SHIPS</span>
          </div>
          <p className="text-gray-400 text-sm line-clamp-1">{product.description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-black text-lg" style={{ color: product.accentColor }}>{product.price}</div>
          {!product.inStock && <div className="text-xs text-gray-500 font-bold">COMING SOON</div>}
        </div>
      </div>

      <div className={`transition-all duration-400 ease-in-out overflow-hidden ${expanded ? 'max-h-96 opacity-100 mt-4 pt-4 border-t border-gray-200' : 'max-h-0 opacity-0'}`}>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {product.features.map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm">
              <span style={{ color: product.accentColor }}>✓</span>
              <span className="text-white/55">{f}</span>
            </div>
          ))}
        </div>
        {product.inStock && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
            className="btn-elite w-full text-sm text-gray-800"
            style={{ background: `linear-gradient(135deg, ${product.accentColor}, ${product.accentColor}cc)`, boxShadow: `0 4px 20px ${product.accentColor}25` }}
          >
            🛒 Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}
