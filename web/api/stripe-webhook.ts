import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover' as any });

export const config = { api: { bodyParser: false } };

async function buffer(readable: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

const PHYSICAL_IDS = new Set([
  'vr_lite', 'vr_pro', 'vr_ultra',
  '3d_basic', '3d_polarized', '3d_clip',
  'controller', 'headphones', 'stand',
  'pencil_case', 'gel_pens', 'sticker_pack', 'backpack', 'erasers', 'notebook',
  'labubu', 'mini_figures', 'squishy_toy', 'blind_bag',
  'pop_it', 'fidget_cube', 'fidget_spinner', 'magnetic_rings', 'stress_ball', 'fidget_slug', 'infinity_cube',
]);

async function autoFulfillPhysical(session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const items = (meta.item_ids || '').split(',').filter(Boolean);
  const physicalItems = items.filter(id => PHYSICAL_IDS.has(id));

  if (physicalItems.length === 0) return;

  const shipping = (session as any).shipping_details;
  if (!shipping?.address) {
    console.log(`[FULFILL] No shipping address for ${session.id}, manual fulfillment needed`);
    return;
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://skillzstorm.com';

  try {
    const resp = await fetch(`${baseUrl}/api/cj-fulfill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-fulfill-secret': process.env.ORDERS_SECRET || '',
      },
      body: JSON.stringify({
        sessionId: session.id,
        items: physicalItems,
        shippingName: shipping.name || '',
        shippingAddress: [shipping.address.line1, shipping.address.line2].filter(Boolean).join(', '),
        shippingCity: shipping.address.city || '',
        shippingState: shipping.address.state || '',
        shippingZip: shipping.address.postal_code || '',
        shippingCountry: shipping.address.country || 'US',
        email: session.customer_email || '',
      }),
    });

    const result = await resp.json();
    console.log(`[FULFILL] ${session.id}: ${JSON.stringify(result)}`);
  } catch (err) {
    console.error(`[FULFILL] Auto-fulfill failed for ${session.id}:`, err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'Missing signature or webhook secret' });
  }

  let event: Stripe.Event;
  try {
    const body = await buffer(req);
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Webhook] Signature verification failed:', message);
    return res.status(400).json({ error: `Webhook error: ${message}` });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata || {};
      const allItems = (meta.item_ids || '').split(',').filter(Boolean);
      const digitalItems = (meta.digital_item_ids || '').split(',').filter(Boolean);
      const linkCode = meta.link_code || '';
      const email = session.customer_email || '';
      const amount = (session.amount_total || 0) / 100;

      console.log(`[ORDER] $${amount} | ${allItems.join(', ')} | ${email} | code:${linkCode}`);

      if (digitalItems.includes('ad_free') || digitalItems.includes('premium')) {
        console.log(`[DIGITAL] Ad-free granted → ${linkCode || email}`);
      }

      if (meta.has_physical === 'true') {
        console.log(`[SHIP] Physical order → auto-fulfilling via CJ...`);
        // Retrieve full session with shipping details for fulfillment
        const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['shipping_details'],
        });
        await autoFulfillPhysical(fullSession);
      }

      break;
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.log(`[FAILED] Payment failed: ${intent.id}`);
      break;
    }
    default:
      console.log(`[Webhook] ${event.type}`);
  }

  return res.status(200).json({ received: true });
}
