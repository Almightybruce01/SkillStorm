import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover' as any });

const PHYSICAL_IDS = new Set(['vr_lite', 'vr_pro', 'vr_ultra', '3d_basic', '3d_polarized', '3d_clip', 'controller', 'headphones', 'stand']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  // Simple secret-based auth — set ORDERS_SECRET in Vercel env vars
  const secret = req.query.secret as string;
  if (!secret || secret !== process.env.ORDERS_SECRET) {
    return res.status(401).json({ error: 'Unauthorized. Add ?secret=YOUR_ORDERS_SECRET' });
  }

  const filter = (req.query.filter as string) || 'all'; // all, physical, digital

  try {
    const sessions = await stripe.checkout.sessions.list({
      limit: 50,
      status: 'complete',
      expand: ['data.shipping_details'],
    });

    const orders = sessions.data
      .filter(s => s.payment_status === 'paid')
      .map(s => {
        const meta = s.metadata || {};
        const items = (meta.item_ids || '').split(',').filter(Boolean);
        const hasPhysical = items.some(id => PHYSICAL_IDS.has(id));
        const hasDigital = items.some(id => !PHYSICAL_IDS.has(id));
        const shipping = s.shipping_details as Stripe.Checkout.Session.ShippingDetails | null;

        return {
          id: s.id,
          date: new Date(s.created * 1000).toISOString(),
          amount: `$${((s.amount_total || 0) / 100).toFixed(2)}`,
          email: s.customer_email || 'N/A',
          items,
          hasPhysical,
          hasDigital,
          linkCode: meta.link_code || '',
          shippingName: shipping?.name || '',
          shippingAddress: shipping?.address ? [
            shipping.address.line1,
            shipping.address.line2,
            shipping.address.city,
            shipping.address.state,
            shipping.address.postal_code,
            shipping.address.country,
          ].filter(Boolean).join(', ') : '',
        };
      })
      .filter(o => {
        if (filter === 'physical') return o.hasPhysical;
        if (filter === 'digital') return o.hasDigital;
        return true;
      });

    return res.status(200).json({
      total: orders.length,
      orders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
