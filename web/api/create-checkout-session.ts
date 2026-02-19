import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover' as any });

const PRODUCT_CATALOG: Record<string, { name: string; unit_amount: number; currency: string; mode: 'payment' | 'subscription'; description?: string }> = {
  // Physical products (shipped goods — Apple Guideline 3.1.3(e) compliant)
  vr_lite:      { name: 'StormVR Lite',         unit_amount: 2999,   currency: 'usd', mode: 'payment', description: 'Phone-in-headset for immersive VR learning' },
  vr_pro:       { name: 'StormVR Pro',          unit_amount: 14999,  currency: 'usd', mode: 'payment', description: 'Premium standalone VR headset' },
  vr_ultra:     { name: 'StormVR Ultra',        unit_amount: 29999,  currency: 'usd', mode: 'payment', description: 'Top-tier VR with eye tracking & haptics' },
  '3d_basic':   { name: 'Storm3D Basic (5-pack)', unit_amount: 499, currency: 'usd', mode: 'payment', description: 'Pack of 5 red/cyan 3D glasses' },
  '3d_polarized': { name: 'Storm3D Polarized',  unit_amount: 1499,  currency: 'usd', mode: 'payment', description: 'Polarized 3D glasses' },
  '3d_clip':    { name: 'Storm3D Clip-On',      unit_amount: 999,   currency: 'usd', mode: 'payment', description: 'Clip-on 3D lenses for glasses wearers' },
  controller:   { name: 'StormPad Controller',   unit_amount: 2499,  currency: 'usd', mode: 'payment', description: 'Bluetooth game controller for SkillzStorm' },
  headphones:   { name: 'StormSound Buds',       unit_amount: 1999,  currency: 'usd', mode: 'payment', description: 'Wireless earbuds with low-latency gaming mode' },
  stand:        { name: 'StormStand',            unit_amount: 1299,  currency: 'usd', mode: 'payment', description: 'Adjustable tablet/phone stand' },

  // Digital products (web-only — iOS uses StoreKit IAP per Apple Guideline 3.1.1)
  ad_free:      { name: 'Ad-Free Forever',       unit_amount: 299,   currency: 'usd', mode: 'payment', description: 'Remove all ads from SkillzStorm' },
  premium:      { name: 'Premium Bundle',        unit_amount: 499,   currency: 'usd', mode: 'payment', description: 'Ad-free + 5,000 coins + exclusive content' },
  coins_500:    { name: '500 Storm Coins',       unit_amount: 99,    currency: 'usd', mode: 'payment', description: 'In-game coin pack' },
  coins_2500:   { name: '2,500 Storm Coins',     unit_amount: 399,   currency: 'usd', mode: 'payment', description: 'In-game coin pack (+250 bonus)' },
  coins_10000:  { name: '10,000 Storm Coins',    unit_amount: 999,   currency: 'usd', mode: 'payment', description: 'In-game coin pack (+2,000 bonus)' },
  season_pass:  { name: 'Season Pass',           unit_amount: 799,   currency: 'usd', mode: 'payment', description: 'Unlock all premium games this season' },
};

const PHYSICAL_IDS = new Set(['vr_lite', 'vr_pro', 'vr_ultra', '3d_basic', '3d_polarized', '3d_clip', 'controller', 'headphones', 'stand']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { items, email } = req.body as { items: { id: string; quantity: number }[]; email?: string };

    if (!items?.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const hasPhysical = items.some(item => PHYSICAL_IDS.has(item.id));
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
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: product.unit_amount,
          },
          quantity: item.quantity || 1,
        };
      });

    if (!line_items.length) {
      return res.status(400).json({ error: 'No valid items in cart' });
    }

    if (hasPhysical && subtotal < 5000) {
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Standard Shipping', description: '2-3 business day delivery' },
          unit_amount: 499,
        },
        quantity: 1,
      });
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items,
      success_url: `${req.headers.origin || 'https://skillzstorm.com'}/checkout?success=true`,
      cancel_url: `${req.headers.origin || 'https://skillzstorm.com'}/checkout?canceled=true`,
      ...(email && { customer_email: email }),
      ...(hasPhysical && {
        shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
      }),
      metadata: {
        item_ids: items.map(i => i.id).join(','),
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
