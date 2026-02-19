import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover' as any });

const PHYSICAL_IDS = new Set(['vr_lite', 'vr_pro', 'vr_ultra', '3d_basic', '3d_polarized', '3d_clip', 'controller', 'headphones', 'stand']);

// Map product IDs to CJ Dropshipping search terms so you can find + order instantly
const CJ_SEARCH: Record<string, string> = {
  vr_lite: 'VR headset phone holder 3D glasses',
  vr_pro: 'standalone VR headset 6DOF',
  vr_ultra: 'VR headset 4K eye tracking',
  '3d_basic': 'red cyan 3D glasses pack',
  '3d_polarized': 'polarized 3D glasses',
  '3d_clip': 'clip on 3D glasses',
  controller: 'bluetooth game controller mobile',
  headphones: 'wireless earbuds low latency gaming',
  stand: 'adjustable phone tablet stand',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const secret = req.query.secret as string;
  if (!secret || secret !== process.env.ORDERS_SECRET) {
    return res.status(401).json({ error: 'Unauthorized. Add ?secret=YOUR_ORDERS_SECRET' });
  }

  const filter = (req.query.filter as string) || 'all';
  const format = (req.query.format as string) || 'json';

  try {
    const sessions = await stripe.checkout.sessions.list({
      limit: 50,
      status: 'complete',
    });

    const orders = sessions.data
      .filter(s => s.payment_status === 'paid')
      .map(s => {
        const meta = s.metadata || {};
        const items = (meta.item_ids || '').split(',').filter(Boolean);
        const physicalItems = items.filter(id => PHYSICAL_IDS.has(id));
        const hasPhysical = physicalItems.length > 0;
        const hasDigital = items.some(id => !PHYSICAL_IDS.has(id));
        const shipping = (s as any).shipping_details as { name?: string; address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string } } | null;

        return {
          id: s.id,
          date: new Date(s.created * 1000).toISOString(),
          amount: `$${((s.amount_total || 0) / 100).toFixed(2)}`,
          email: s.customer_email || 'N/A',
          items,
          physicalItems,
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
          cjLinks: physicalItems.map(id => ({
            product: id,
            searchUrl: `https://cjdropshipping.com/search?keyword=${encodeURIComponent(CJ_SEARCH[id] || id)}`,
          })),
          stripeUrl: `https://dashboard.stripe.com/payments/${s.payment_intent}`,
        };
      })
      .filter(o => {
        if (filter === 'physical') return o.hasPhysical;
        if (filter === 'digital') return o.hasDigital;
        return true;
      });

    // HTML dashboard view
    if (format === 'html') {
      const html = renderDashboard(orders);
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    }

    return res.status(200).json({ total: orders.length, orders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

interface Order {
  id: string; date: string; amount: string; email: string;
  items: string[]; physicalItems: string[]; hasPhysical: boolean; hasDigital: boolean;
  linkCode: string; shippingName: string; shippingAddress: string;
  cjLinks: { product: string; searchUrl: string }[];
  stripeUrl: string;
}

function renderDashboard(orders: Order[]): string {
  const physicalOrders = orders.filter(o => o.hasPhysical);
  const digitalOrders = orders.filter(o => o.hasDigital);
  const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.amount.replace('$', '')), 0);

  const orderRows = orders.map(o => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:12px 8px;font-size:13px;color:#666">${new Date(o.date).toLocaleDateString()}</td>
      <td style="padding:12px 8px;font-weight:700;color:#10b981">${o.amount}</td>
      <td style="padding:12px 8px;font-size:13px">${o.items.map(i =>
        `<span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;margin:2px;${PHYSICAL_IDS.has(i) ? 'background:#dbeafe;color:#2563eb' : 'background:#f3e8ff;color:#7c3aed'}">${i}</span>`
      ).join('')}</td>
      <td style="padding:12px 8px;font-size:13px">${o.email}</td>
      <td style="padding:12px 8px;font-size:13px">${o.shippingName ? `${o.shippingName}<br><span style="color:#999;font-size:11px">${o.shippingAddress}</span>` : '—'}</td>
      <td style="padding:12px 8px">${o.cjLinks.map(l =>
        `<a href="${l.searchUrl}" target="_blank" style="display:inline-block;padding:4px 10px;border-radius:8px;background:#f59e0b;color:#000;font-size:11px;font-weight:700;text-decoration:none;margin:2px">Order ${l.product} on CJ</a>`
      ).join('') || '<span style="color:#999;font-size:12px">Digital</span>'}</td>
      <td style="padding:12px 8px"><a href="${o.stripeUrl}" target="_blank" style="color:#3b82f6;font-size:12px">Stripe</a></td>
    </tr>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SkillzStorm Orders</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,system-ui,sans-serif;background:#f8fafc;color:#1e293b}</style></head>
<body>
<div style="max-width:1200px;margin:0 auto;padding:24px">
  <h1 style="font-size:28px;font-weight:900;margin-bottom:8px">SkillzStorm Orders</h1>
  <p style="color:#64748b;margin-bottom:24px">Fulfillment dashboard — click "Order on CJ" to fulfill physical orders</p>
  <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap">
    <div style="flex:1;min-width:150px;background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px">Total Orders</div>
      <div style="font-size:32px;font-weight:900;color:#1e293b">${orders.length}</div>
    </div>
    <div style="flex:1;min-width:150px;background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px">Revenue</div>
      <div style="font-size:32px;font-weight:900;color:#10b981">$${totalRevenue.toFixed(2)}</div>
    </div>
    <div style="flex:1;min-width:150px;background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px">Physical Orders</div>
      <div style="font-size:32px;font-weight:900;color:#2563eb">${physicalOrders.length}</div>
    </div>
    <div style="flex:1;min-width:150px;background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px">Digital Orders</div>
      <div style="font-size:32px;font-weight:900;color:#7c3aed">${digitalOrders.length}</div>
    </div>
  </div>
  <div style="background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow-x:auto">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:2px solid #e2e8f0">
        <th style="padding:12px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Date</th>
        <th style="padding:12px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Amount</th>
        <th style="padding:12px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Items</th>
        <th style="padding:12px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Email</th>
        <th style="padding:12px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Ship To</th>
        <th style="padding:12px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Fulfill</th>
        <th style="padding:12px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Stripe</th>
      </tr></thead>
      <tbody>${orderRows || '<tr><td colspan="7" style="padding:40px;text-align:center;color:#94a3b8">No orders yet</td></tr>'}</tbody>
    </table>
  </div>
</div></body></html>`;
}
