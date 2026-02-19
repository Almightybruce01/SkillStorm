#!/usr/bin/env npx tsx
/**
 * SkillzStorm — Stripe Product Setup Script
 * 
 * Creates all products and prices in your Stripe account.
 * Run once after setting up your Stripe account:
 * 
 *   STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/setup-stripe-products.ts
 * 
 * For testing with test keys:
 *   STRIPE_SECRET_KEY=sk_test_xxx npx tsx scripts/setup-stripe-products.ts
 */
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('ERROR: Set STRIPE_SECRET_KEY environment variable');
  console.error('Usage: STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/setup-stripe-products.ts');
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: '2026-01-28.clover' as any });

interface ProductDef {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  category: 'physical' | 'digital';
  metadata: Record<string, string>;
}

const PRODUCTS: ProductDef[] = [
  // Physical products (Apple Guideline 3.1.3(e) — must use non-IAP payment)
  { id: 'vr_lite', name: 'StormVR Lite', description: 'Phone-in-headset for immersive VR learning. Insert your phone and play VR games.', price_cents: 2999, category: 'physical', metadata: { sku: 'STORM-VR-LITE', ships: 'true' } },
  { id: 'vr_pro', name: 'StormVR Pro', description: 'Premium standalone VR headset with built-in SkillzStorm. No phone needed.', price_cents: 14999, category: 'physical', metadata: { sku: 'STORM-VR-PRO', ships: 'true' } },
  { id: 'vr_ultra', name: 'StormVR Ultra', description: 'Top-tier VR with eye tracking, haptic feedback, and 4K displays.', price_cents: 29999, category: 'physical', metadata: { sku: 'STORM-VR-ULTRA', ships: 'true' } },
  { id: '3d_basic', name: 'Storm3D Basic (5-pack)', description: 'Pack of 5 red/cyan 3D glasses. Works with all Storm3D games.', price_cents: 499, category: 'physical', metadata: { sku: 'STORM-3D-BASIC', ships: 'true' } },
  { id: '3d_polarized', name: 'Storm3D Polarized', description: 'Polarized 3D glasses for color-accurate, comfortable viewing.', price_cents: 1499, category: 'physical', metadata: { sku: 'STORM-3D-POL', ships: 'true' } },
  { id: '3d_clip', name: 'Storm3D Clip-On', description: 'Clip-on 3D lenses for people who wear glasses.', price_cents: 999, category: 'physical', metadata: { sku: 'STORM-3D-CLIP', ships: 'true' } },
  { id: 'controller', name: 'StormPad Controller', description: 'Bluetooth game controller optimized for SkillzStorm.', price_cents: 2499, category: 'physical', metadata: { sku: 'STORM-PAD', ships: 'true' } },
  { id: 'headphones', name: 'StormSound Buds', description: 'Wireless earbuds with low-latency gaming mode and spatial audio.', price_cents: 1999, category: 'physical', metadata: { sku: 'STORM-BUDS', ships: 'true' } },
  { id: 'stand', name: 'StormStand', description: 'Adjustable tablet/phone stand for hands-free gaming.', price_cents: 1299, category: 'physical', metadata: { sku: 'STORM-STAND', ships: 'true' } },

  // Digital products (web sales via Stripe; iOS uses StoreKit IAP per Apple Guideline 3.1.1)
  { id: 'ad_free', name: 'Ad-Free Forever', description: 'Remove all ads from SkillzStorm permanently.', price_cents: 299, category: 'digital', metadata: { type: 'digital', ios_product_id: 'com.skillzstorm.adfree' } },
  { id: 'premium', name: 'Premium Bundle', description: 'Ad-free + 5,000 coins + exclusive content.', price_cents: 499, category: 'digital', metadata: { type: 'digital', ios_product_id: 'com.skillzstorm.premiumBundle' } },
  { id: 'coins_500', name: '500 Storm Coins', description: 'In-game coin pack for SkillzStorm.', price_cents: 99, category: 'digital', metadata: { type: 'digital', ios_product_id: 'com.skillzstorm.coins500' } },
  { id: 'coins_2500', name: '2,500 Storm Coins (+250 bonus)', description: 'In-game coin pack with bonus coins.', price_cents: 399, category: 'digital', metadata: { type: 'digital', ios_product_id: 'com.skillzstorm.coins2500' } },
  { id: 'coins_10000', name: '10,000 Storm Coins (+2,000 bonus)', description: 'Best value coin pack with bonus coins.', price_cents: 999, category: 'digital', metadata: { type: 'digital', ios_product_id: 'com.skillzstorm.coins10000' } },
  { id: 'season_pass', name: 'Season Pass', description: 'Unlock all premium games for the current season.', price_cents: 799, category: 'digital', metadata: { type: 'digital', ios_product_id: 'com.skillzstorm.seasonPass' } },
];

async function main() {
  console.log('🚀 SkillzStorm — Creating Stripe products...\n');
  console.log(`Using ${key!.startsWith('sk_live') ? '🔴 LIVE' : '🟡 TEST'} mode\n`);

  for (const def of PRODUCTS) {
    try {
      const product = await stripe.products.create({
        name: def.name,
        description: def.description,
        metadata: { skillzstorm_id: def.id, ...def.metadata },
        ...(def.category === 'physical' && { shippable: true }),
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: def.price_cents,
        currency: 'usd',
      });

      const tag = def.category === 'physical' ? '📦' : '💎';
      console.log(`${tag} ${def.name} — $${(def.price_cents / 100).toFixed(2)}`);
      console.log(`   Product: ${product.id}`);
      console.log(`   Price:   ${price.id}\n`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ Failed to create ${def.name}: ${message}\n`);
    }
  }

  console.log('✅ Done! Products are live in your Stripe Dashboard.');
  console.log('   https://dashboard.stripe.com/products\n');
}

main().catch(console.error);
