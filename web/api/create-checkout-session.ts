import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover' as any });

// Prices are what the CUSTOMER pays (retail). Your cost is ~30-40% of these
// for dropship items, giving you 60-70% gross margin.
const PRODUCT_CATALOG: Record<string, {
  name: string;
  unit_amount: number;
  currency: string;
  description?: string;
  type: 'physical' | 'digital';
}> = {
  // ── Physical products (dropshipped) ──
  // Retail prices set for healthy 55-70% margins on AliExpress/CJ Dropshipping sourced goods
  vr_lite:       { name: 'StormVR Lite',              unit_amount: 3999,  currency: 'usd', type: 'physical', description: 'Phone-in-headset for immersive VR learning' },
  vr_pro:        { name: 'StormVR Pro',               unit_amount: 17999, currency: 'usd', type: 'physical', description: 'Standalone VR headset with built-in SkillzStorm' },
  vr_ultra:      { name: 'StormVR Ultra',             unit_amount: 34999, currency: 'usd', type: 'physical', description: 'Top-tier VR — eye tracking, haptics, 4K' },
  '3d_basic':    { name: 'Storm3D Basic (5-pack)',    unit_amount: 799,   currency: 'usd', type: 'physical', description: 'Pack of 5 red/cyan anaglyph 3D glasses' },
  '3d_polarized':{ name: 'Storm3D Polarized',         unit_amount: 1999,  currency: 'usd', type: 'physical', description: 'Polarized 3D glasses — no color distortion' },
  '3d_clip':     { name: 'Storm3D Clip-On',           unit_amount: 1499,  currency: 'usd', type: 'physical', description: 'Clip-on 3D lenses for glasses wearers' },
  controller:    { name: 'StormPad Controller',        unit_amount: 3499,  currency: 'usd', type: 'physical', description: 'Bluetooth game controller for SkillzStorm' },
  headphones:    { name: 'StormSound Buds',            unit_amount: 2999,  currency: 'usd', type: 'physical', description: 'Wireless earbuds — low-latency gaming mode' },
  stand:         { name: 'StormStand',                 unit_amount: 1799,  currency: 'usd', type: 'physical', description: 'Adjustable tablet/phone stand' },

  // ── School Supplies (cartoonish, fun for kids) ──
  pencil_case:   { name: 'Storm Pencil Case',            unit_amount: 1299,  currency: 'usd', type: 'physical', description: 'Cartoon lightning-bolt pencil pouch — holds 40+ pens' },
  gel_pens:      { name: 'Rainbow Gel Pens (12-pack)',    unit_amount: 999,   currency: 'usd', type: 'physical', description: '12 vibrant gel pens with kawaii toppers' },
  sticker_pack:  { name: 'Storm Sticker Pack (50pc)',     unit_amount: 799,   currency: 'usd', type: 'physical', description: '50 waterproof vinyl stickers — gaming & school mix' },
  backpack:      { name: 'Storm Cartoon Backpack',        unit_amount: 2999,  currency: 'usd', type: 'physical', description: 'Lightweight school backpack with cartoon lightning design' },
  erasers:       { name: 'Fun Erasers Set (20pc)',        unit_amount: 699,   currency: 'usd', type: 'physical', description: '20 mini animal & food shaped erasers' },
  notebook:      { name: 'Storm Notebook (3-pack)',       unit_amount: 899,   currency: 'usd', type: 'physical', description: 'A5 lined notebooks with holographic covers' },

  // ── Toys & Collectibles ──
  labubu:        { name: 'Labubu Mystery Figure',         unit_amount: 1499,  currency: 'usd', type: 'physical', description: 'Blind box collectible Labubu mini figure' },
  mini_figures:  { name: 'Mini Figures 5-Pack',           unit_amount: 1199,  currency: 'usd', type: 'physical', description: 'Surprise pack of 5 collectible mini characters' },
  squishy_toy:   { name: 'Kawaii Squishy Set (3pc)',      unit_amount: 999,   currency: 'usd', type: 'physical', description: 'Slow-rise squishy toys — animal edition' },
  blind_bag:     { name: 'Mystery Blind Bag',             unit_amount: 899,   currency: 'usd', type: 'physical', description: 'Surprise toy bag — could be anything!' },

  // ── Fidgets ──
  pop_it:        { name: 'Rainbow Pop-It',                unit_amount: 899,   currency: 'usd', type: 'physical', description: 'Tie-dye rainbow push-pop fidget — satisfying clicks' },
  fidget_cube:   { name: 'Fidget Cube Pro',               unit_amount: 999,   currency: 'usd', type: 'physical', description: '6-sided fidget cube — click, spin, flip, glide' },
  fidget_spinner:{ name: 'LED Fidget Spinner',            unit_amount: 799,   currency: 'usd', type: 'physical', description: 'Light-up spinner with 3 LED modes' },
  magnetic_rings:{ name: 'Magnetic Fidget Rings (3pc)',   unit_amount: 1199,  currency: 'usd', type: 'physical', description: 'Magnetic ring fidgets — spin, stack, roll' },
  stress_ball:   { name: 'Squishy Stress Balls (4pc)',    unit_amount: 899,   currency: 'usd', type: 'physical', description: 'Neon mesh squeeze balls — 4 colors' },
  fidget_slug:   { name: 'Articulated Fidget Slug',       unit_amount: 1099,  currency: 'usd', type: 'physical', description: '3D-printed articulated slug — satisfying movement' },
  infinity_cube: { name: 'Infinity Cube',                 unit_amount: 999,   currency: 'usd', type: 'physical', description: 'Endless flipping cube — pocket-sized focus tool' },

  // ── Digital products (pure profit minus Stripe's 2.9% + $0.30) ──
  ad_free:       { name: 'Ad-Free Forever',            unit_amount: 299,   currency: 'usd', type: 'digital', description: 'Remove all ads from SkillzStorm permanently' },
  premium:       { name: 'Premium Bundle',             unit_amount: 499,   currency: 'usd', type: 'digital', description: 'Ad-free + 5,000 coins + exclusive content' },
  coins_500:     { name: '500 Storm Coins',            unit_amount: 99,    currency: 'usd', type: 'digital', description: 'In-game coin pack' },
  coins_2500:    { name: '2,500 Storm Coins (+250)',   unit_amount: 399,   currency: 'usd', type: 'digital', description: 'In-game coin pack with bonus' },
  coins_10000:   { name: '10,000 Storm Coins (+2K)',   unit_amount: 999,   currency: 'usd', type: 'digital', description: 'Best value coin pack' },
  season_pass:   { name: 'Season Pass',               unit_amount: 799,   currency: 'usd', type: 'digital', description: 'Unlock all premium games this season' },
};

const PHYSICAL_IDS = new Set(
  Object.entries(PRODUCT_CATALOG).filter(([, v]) => v.type === 'physical').map(([k]) => k)
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { items, email, linkCode } = req.body as {
      items: { id: string; quantity: number }[];
      email?: string;
      linkCode?: string;
    };

    if (!items?.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const hasPhysical = items.some(item => PHYSICAL_IDS.has(item.id));
    const hasDigital = items.some(item => !PHYSICAL_IDS.has(item.id) && PRODUCT_CATALOG[item.id]);
    const subtotal = items.reduce((sum, item) => {
      const product = PRODUCT_CATALOG[item.id];
      return sum + (product ? product.unit_amount * (item.quantity || 1) : 0);
    }, 0);

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items
      .filter(item => PRODUCT_CATALOG[item.id])
      .map(item => {
        const product = PRODUCT_CATALOG[item.id];
        return {
          price_data: {
            currency: product.currency,
            product_data: { name: product.name, description: product.description },
            unit_amount: product.unit_amount,
          },
          quantity: item.quantity || 1,
        };
      });

    if (!line_items.length) {
      return res.status(400).json({ error: 'No valid items in cart' });
    }

    // Free shipping on orders $50+, otherwise $5.99
    if (hasPhysical && subtotal < 5000) {
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Standard Shipping', description: '5-10 business day delivery' },
          unit_amount: 599,
        },
        quantity: 1,
      });
    }

    const digitalItemIds = items
      .filter(item => !PHYSICAL_IDS.has(item.id) && PRODUCT_CATALOG[item.id])
      .map(i => i.id);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items,
      success_url: `${req.headers.origin || 'https://skillzstorm.com'}/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://skillzstorm.com'}/checkout?canceled=true`,
      ...(email && { customer_email: email }),
      ...(hasPhysical && {
        shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
      }),
      metadata: {
        item_ids: items.map(i => i.id).join(','),
        digital_item_ids: digitalItemIds.join(','),
        has_physical: hasPhysical ? 'true' : 'false',
        has_digital: hasDigital ? 'true' : 'false',
        link_code: linkCode || '',
        source: 'skillzstorm_web',
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.status(200).json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe] Checkout session error:', message);
    return res.status(500).json({ error: message });
  }
}
