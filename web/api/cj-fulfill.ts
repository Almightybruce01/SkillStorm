import type { VercelRequest, VercelResponse } from '@vercel/node';

// CJ Dropshipping product mapping
// After you find products on CJ, add their variant IDs here
const CJ_PRODUCT_MAP: Record<string, { cjProductId: string; cjVariantId: string; name: string }> = {
  // Tech & VR
  vr_lite:        { cjProductId: '', cjVariantId: '', name: 'VR Phone Headset' },
  vr_pro:         { cjProductId: '', cjVariantId: '', name: 'Standalone VR Headset' },
  vr_ultra:       { cjProductId: '', cjVariantId: '', name: 'Premium VR Headset' },
  '3d_basic':     { cjProductId: '', cjVariantId: '', name: '3D Glasses 5-pack Red/Cyan' },
  '3d_polarized': { cjProductId: '', cjVariantId: '', name: 'Polarized 3D Glasses' },
  '3d_clip':      { cjProductId: '', cjVariantId: '', name: 'Clip-On 3D Glasses' },
  controller:     { cjProductId: '', cjVariantId: '', name: 'Bluetooth Game Controller' },
  headphones:     { cjProductId: '', cjVariantId: '', name: 'Wireless Gaming Earbuds' },
  stand:          { cjProductId: '', cjVariantId: '', name: 'Phone/Tablet Stand' },
  // School Supplies
  pencil_case:    { cjProductId: '', cjVariantId: '', name: 'Cartoon Pencil Case Pouch' },
  gel_pens:       { cjProductId: '', cjVariantId: '', name: 'Kawaii Gel Pens 12-pack' },
  sticker_pack:   { cjProductId: '', cjVariantId: '', name: 'Vinyl Sticker Pack 50pcs' },
  backpack:       { cjProductId: '', cjVariantId: '', name: 'Cartoon School Backpack Kids' },
  erasers:        { cjProductId: '', cjVariantId: '', name: 'Mini Animal Erasers Set 20pcs' },
  notebook:       { cjProductId: '', cjVariantId: '', name: 'Holographic Notebook A5 3-pack' },
  // Toys
  labubu:         { cjProductId: '', cjVariantId: '', name: 'Labubu Blind Box Figure' },
  mini_figures:   { cjProductId: '', cjVariantId: '', name: 'Mini Collectible Figures Pack' },
  squishy_toy:    { cjProductId: '', cjVariantId: '', name: 'Kawaii Squishy Toy Animal' },
  blind_bag:      { cjProductId: '', cjVariantId: '', name: 'Mystery Toy Blind Bag Kids' },
  // Fidgets
  pop_it:         { cjProductId: '', cjVariantId: '', name: 'Rainbow Pop It Fidget' },
  fidget_cube:    { cjProductId: '', cjVariantId: '', name: 'Fidget Cube 6-sided' },
  fidget_spinner: { cjProductId: '', cjVariantId: '', name: 'LED Fidget Spinner Light Up' },
  magnetic_rings: { cjProductId: '', cjVariantId: '', name: 'Magnetic Fidget Rings 3-pack' },
  stress_ball:    { cjProductId: '', cjVariantId: '', name: 'Mesh Stress Ball Neon 4-pack' },
  fidget_slug:    { cjProductId: '', cjVariantId: '', name: 'Articulated Fidget Slug 3D' },
  infinity_cube:  { cjProductId: '', cjVariantId: '', name: 'Infinity Cube Fidget Toy' },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const secret = req.headers['x-fulfill-secret'];
  if (!secret || secret !== process.env.ORDERS_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { sessionId, items, shippingName, shippingAddress, shippingCity, shippingState, shippingZip, shippingCountry, email } = req.body;

  const cjApiKey = process.env.CJ_API_KEY;

  // If CJ API key is configured, auto-place the order
  if (cjApiKey) {
    try {
      const orderProducts = items
        .map((id: string) => CJ_PRODUCT_MAP[id])
        .filter((p: { cjVariantId: string } | undefined) => p && p.cjVariantId);

      if (orderProducts.length === 0) {
        console.log(`[CJ] No mapped CJ products for ${items.join(', ')} — manual fulfillment needed`);
        return res.status(200).json({
          status: 'manual',
          reason: 'Products not mapped to CJ variants yet',
          sessionId,
          items,
          shipping: { name: shippingName, address: shippingAddress, city: shippingCity, state: shippingState, zip: shippingZip, country: shippingCountry },
        });
      }

      // CJ Dropshipping Create Order API
      const cjOrder = await fetch('https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CJ-Access-Token': cjApiKey,
        },
        body: JSON.stringify({
          orderNumber: sessionId.slice(-12),
          shippingZip,
          shippingCountryCode: shippingCountry,
          shippingCountry: shippingCountry,
          shippingProvince: shippingState,
          shippingCity,
          shippingAddress,
          shippingCustomerName: shippingName,
          shippingPhone: '',
          remark: `SkillzStorm order | ${email}`,
          products: orderProducts.map((p: { cjVariantId: string }) => ({
            vid: p.cjVariantId,
            quantity: 1,
          })),
        }),
      });

      const cjResult = await cjOrder.json();
      console.log(`[CJ] Order placed: ${JSON.stringify(cjResult)}`);
      return res.status(200).json({ status: 'auto', cj: cjResult });
    } catch (err) {
      console.error(`[CJ] API error:`, err);
      return res.status(200).json({ status: 'error', error: String(err) });
    }
  }

  // No CJ API key — log for manual fulfillment
  console.log(`[FULFILL] Manual order needed:`);
  console.log(`  Session: ${sessionId}`);
  console.log(`  Items: ${items.join(', ')}`);
  console.log(`  Ship to: ${shippingName}, ${shippingAddress}, ${shippingCity}, ${shippingState} ${shippingZip}, ${shippingCountry}`);
  console.log(`  Email: ${email}`);

  return res.status(200).json({
    status: 'manual',
    reason: 'CJ_API_KEY not set — fulfill manually via CJ dashboard or /api/orders',
    sessionId,
    items: items.map((id: string) => ({ id, search: CJ_PRODUCT_MAP[id]?.name || id })),
    shipping: { name: shippingName, address: shippingAddress, city: shippingCity, state: shippingState, zip: shippingZip, country: shippingCountry },
    email,
  });
}
