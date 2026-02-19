import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover' as any });

// Digital product IDs that grant specific entitlements
const AD_FREE_PRODUCTS = new Set(['ad_free', 'premium']);
const PREMIUM_PRODUCTS = new Set(['premium']);
const SEASON_PASS_PRODUCTS = new Set(['season_pass']);
const COIN_AMOUNTS: Record<string, number> = {
  coins_500: 500,
  coins_2500: 2750,
  coins_10000: 12000,
  premium: 5000,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { linkCode, sessionId } = req.body as { linkCode?: string; sessionId?: string };

    if (!linkCode && !sessionId) {
      return res.status(400).json({ error: 'Provide linkCode or sessionId' });
    }

    // Search Stripe for completed checkout sessions matching this link code
    let entitlements = {
      isAdFree: false,
      isPremium: false,
      hasSeasonPass: false,
      totalCoins: 0,
      purchases: [] as { id: string; items: string[]; amount: number; date: string }[],
    };

    if (sessionId) {
      // Verify a specific session
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid' && session.metadata) {
          const digitalItems = (session.metadata.digital_item_ids || '').split(',').filter(Boolean);
          applyEntitlements(entitlements, digitalItems);
          entitlements.purchases.push({
            id: session.id,
            items: (session.metadata.item_ids || '').split(',').filter(Boolean),
            amount: (session.amount_total || 0) / 100,
            date: new Date(session.created * 1000).toISOString(),
          });
        }
      } catch {
        // Session not found
      }
    }

    if (linkCode) {
      // Search recent checkout sessions for this link code
      // In production, use a database. For MVP, search last 100 sessions.
      const sessions = await stripe.checkout.sessions.list({
        limit: 100,
        status: 'complete',
      });

      for (const session of sessions.data) {
        if (session.metadata?.link_code === linkCode && session.payment_status === 'paid') {
          const digitalItems = (session.metadata.digital_item_ids || '').split(',').filter(Boolean);
          applyEntitlements(entitlements, digitalItems);
          entitlements.purchases.push({
            id: session.id,
            items: (session.metadata.item_ids || '').split(',').filter(Boolean),
            amount: (session.amount_total || 0) / 100,
            date: new Date(session.created * 1000).toISOString(),
          });
        }
      }
    }

    return res.status(200).json(entitlements);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Verify] Error:', message);
    return res.status(500).json({ error: message });
  }
}

function applyEntitlements(
  e: { isAdFree: boolean; isPremium: boolean; hasSeasonPass: boolean; totalCoins: number },
  digitalItems: string[]
) {
  for (const item of digitalItems) {
    if (AD_FREE_PRODUCTS.has(item)) e.isAdFree = true;
    if (PREMIUM_PRODUCTS.has(item)) e.isPremium = true;
    if (SEASON_PASS_PRODUCTS.has(item)) e.hasSeasonPass = true;
    if (COIN_AMOUNTS[item]) e.totalCoins += COIN_AMOUNTS[item];
  }
}
