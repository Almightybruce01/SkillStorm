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

      // All order data is stored in the Stripe session itself.
      // Use /api/orders?secret=YOUR_KEY to view recent orders.
      // Use /api/verify-purchase to let the iOS app check entitlements.

      console.log(`[ORDER] $${amount} | ${allItems.join(', ')} | ${email} | code:${linkCode}`);

      if (digitalItems.includes('ad_free') || digitalItems.includes('premium')) {
        console.log(`[DIGITAL] Ad-free granted → ${linkCode || email}`);
      }
      if (meta.has_physical === 'true') {
        console.log(`[SHIP] Physical order needs fulfillment → ${session.id}`);
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
