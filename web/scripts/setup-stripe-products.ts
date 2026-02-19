#!/usr/bin/env npx tsx
/**
 * SkillzStorm — Stripe Product Setup Script
 * 
 * Creates all products and prices in your Stripe account.
 * Run once:  STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/setup-stripe-products.ts
 */
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('ERROR: Set STRIPE_SECRET_KEY environment variable');
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

// Retail prices (dropship cost is ~30-40% of these for physical goods)
const PRODUCTS: ProductDef[] = [
  // Physical products — dropshipped via CJ Dropshipping / Zendrop / Spocket
  { id: 'vr_lite', name: 'StormVR Lite', description: 'Phone-in-headset for immersive VR learning.', price_cents: 3999, category: 'physical', metadata: { sku: 'STORM-VR-LITE', ships: 'true' } },
  { id: 'vr_pro', name: 'StormVR Pro', description: 'Standalone VR headset with built-in SkillzStorm.', price_cents: 17999, category: 'physical', metadata: { sku: 'STORM-VR-PRO', ships: 'true' } },
  { id: 'vr_ultra', name: 'StormVR Ultra', description: 'Top-tier VR — eye tracking, haptics, 4K.', price_cents: 34999, category: 'physical', metadata: { sku: 'STORM-VR-ULTRA', ships: 'true' } },
  { id: '3d_basic', name: 'Storm3D Basic (5-pack)', description: 'Pack of 5 red/cyan 3D glasses.', price_cents: 799, category: 'physical', metadata: { sku: 'STORM-3D-BASIC', ships: 'true' } },
  { id: '3d_polarized', name: 'Storm3D Polarized', description: 'Polarized 3D glasses — no color distortion.', price_cents: 1999, category: 'physical', metadata: { sku: 'STORM-3D-POL', ships: 'true' } },
  { id: '3d_clip', name: 'Storm3D Clip-On', description: 'Clip-on 3D lenses for glasses wearers.', price_cents: 1499, category: 'physical', metadata: { sku: 'STORM-3D-CLIP', ships: 'true' } },
  { id: 'controller', name: 'StormPad Controller', description: 'Bluetooth game controller for SkillzStorm.', price_cents: 3499, category: 'physical', metadata: { sku: 'STORM-PAD', ships: 'true' } },
  { id: 'headphones', name: 'StormSound Buds', description: 'Wireless earbuds — low-latency gaming mode.', price_cents: 2999, category: 'physical', metadata: { sku: 'STORM-BUDS', ships: 'true' } },
  { id: 'stand', name: 'StormStand', description: 'Adjustable tablet/phone stand.', price_cents: 1799, category: 'physical', metadata: { sku: 'STORM-STAND', ships: 'true' } },

  // School Supplies
  { id: 'pencil_case', name: 'Storm Pencil Case', description: 'Cartoon lightning-bolt pencil pouch — holds 40+ pens.', price_cents: 1299, category: 'physical', metadata: { sku: 'STORM-PENCIL', ships: 'true' } },
  { id: 'gel_pens', name: 'Rainbow Gel Pens (12-pack)', description: '12 vibrant gel pens with kawaii toppers.', price_cents: 999, category: 'physical', metadata: { sku: 'STORM-PENS', ships: 'true' } },
  { id: 'sticker_pack', name: 'Storm Sticker Pack (50pc)', description: '50 waterproof vinyl stickers — gaming & school mix.', price_cents: 799, category: 'physical', metadata: { sku: 'STORM-STICKERS', ships: 'true' } },
  { id: 'backpack', name: 'Storm Cartoon Backpack', description: 'Lightweight school backpack with cartoon lightning design.', price_cents: 2999, category: 'physical', metadata: { sku: 'STORM-BACKPACK', ships: 'true' } },
  { id: 'erasers', name: 'Fun Erasers Set (20pc)', description: '20 mini animal & food shaped erasers.', price_cents: 699, category: 'physical', metadata: { sku: 'STORM-ERASERS', ships: 'true' } },
  { id: 'notebook', name: 'Storm Notebook (3-pack)', description: 'A5 lined notebooks with holographic covers.', price_cents: 899, category: 'physical', metadata: { sku: 'STORM-NOTEBOOK', ships: 'true' } },

  // Toys & Collectibles
  { id: 'labubu', name: 'Labubu Mystery Figure', description: 'Blind box collectible Labubu mini figure.', price_cents: 1499, category: 'physical', metadata: { sku: 'STORM-LABUBU', ships: 'true' } },
  { id: 'mini_figures', name: 'Mini Figures 5-Pack', description: 'Surprise pack of 5 collectible mini characters.', price_cents: 1199, category: 'physical', metadata: { sku: 'STORM-MINIFIGS', ships: 'true' } },
  { id: 'squishy_toy', name: 'Kawaii Squishy Set (3pc)', description: 'Slow-rise squishy toys — animal edition.', price_cents: 999, category: 'physical', metadata: { sku: 'STORM-SQUISHY', ships: 'true' } },
  { id: 'blind_bag', name: 'Mystery Blind Bag', description: 'Surprise toy bag — could be anything!', price_cents: 899, category: 'physical', metadata: { sku: 'STORM-BLINDBAG', ships: 'true' } },

  // Fidgets
  { id: 'pop_it', name: 'Rainbow Pop-It', description: 'Tie-dye rainbow push-pop fidget.', price_cents: 899, category: 'physical', metadata: { sku: 'STORM-POPIT', ships: 'true' } },
  { id: 'fidget_cube', name: 'Fidget Cube Pro', description: '6-sided fidget cube — click, spin, flip, glide.', price_cents: 999, category: 'physical', metadata: { sku: 'STORM-FCUBE', ships: 'true' } },
  { id: 'fidget_spinner', name: 'LED Fidget Spinner', description: 'Light-up spinner with 3 LED modes.', price_cents: 799, category: 'physical', metadata: { sku: 'STORM-SPINNER', ships: 'true' } },
  { id: 'magnetic_rings', name: 'Magnetic Fidget Rings (3pc)', description: 'Magnetic ring fidgets — spin, stack, roll.', price_cents: 1199, category: 'physical', metadata: { sku: 'STORM-MAGRINGS', ships: 'true' } },
  { id: 'stress_ball', name: 'Squishy Stress Balls (4pc)', description: 'Neon mesh squeeze balls — 4 colors.', price_cents: 899, category: 'physical', metadata: { sku: 'STORM-STRESS', ships: 'true' } },
  { id: 'fidget_slug', name: 'Articulated Fidget Slug', description: '3D-printed articulated slug — satisfying movement.', price_cents: 1099, category: 'physical', metadata: { sku: 'STORM-SLUG', ships: 'true' } },
  { id: 'infinity_cube', name: 'Infinity Cube', description: 'Endless flipping cube — pocket-sized focus tool.', price_cents: 999, category: 'physical', metadata: { sku: 'STORM-INFCUBE', ships: 'true' } },

  // Digital products — 100% margin minus Stripe fees
  { id: 'ad_free', name: 'Ad-Free Forever', description: 'Remove all ads from SkillzStorm permanently.', price_cents: 299, category: 'digital', metadata: { type: 'digital' } },
  { id: 'premium', name: 'Premium Bundle', description: 'Ad-free + 5,000 coins + exclusive content.', price_cents: 499, category: 'digital', metadata: { type: 'digital' } },
  { id: 'coins_500', name: '500 Storm Coins', description: 'In-game coin pack.', price_cents: 99, category: 'digital', metadata: { type: 'digital' } },
  { id: 'coins_2500', name: '2,500 Storm Coins (+250 bonus)', description: 'Coin pack with bonus.', price_cents: 399, category: 'digital', metadata: { type: 'digital' } },
  { id: 'coins_10000', name: '10,000 Storm Coins (+2,000 bonus)', description: 'Best value coin pack.', price_cents: 999, category: 'digital', metadata: { type: 'digital' } },
  { id: 'season_pass', name: 'Season Pass', description: 'Unlock all premium games this season.', price_cents: 799, category: 'digital', metadata: { type: 'digital' } },
];

async function main() {
  console.log('SkillzStorm — Creating Stripe products...\n');
  console.log(`Using ${key!.startsWith('sk_live') ? 'LIVE' : 'TEST'} mode\n`);

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

      const tag = def.category === 'physical' ? '[SHIP]' : '[DIGITAL]';
      console.log(`${tag} ${def.name} — $${(def.price_cents / 100).toFixed(2)}`);
      console.log(`   Product: ${product.id}`);
      console.log(`   Price:   ${price.id}\n`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`FAILED ${def.name}: ${message}\n`);
    }
  }

  console.log('Done! Products are live in your Stripe Dashboard.');
  console.log('   https://dashboard.stripe.com/products\n');
}

main().catch(console.error);
