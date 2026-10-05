// Public storefront API (consolidated to stay under Vercel Hobby's 12-function limit).
// GET  /api/store                -> {ok, settings}  (public store settings)
// GET  /api/store?action=settings -> same as above
// POST /api/store?action=coupon  -> {ok, code, discount} | {ok:false, error} (coupon quote)
const { getCoupon, quoteCoupon } = require('./_coupons');

const DEFAULTS = {
  announcement_on: true,
  announcement_lines: [
    '✦ FESTIVE SALE',
    '✦ BUY 2 GET ₹100 OFF · 3+ GET ₹200 OFF',
    '✦ COD AVAILABLE',
    '✦ FREE SHIPPING OVER ₹499',
    '✦ 7-DAY EASY RETURNS',
    '✦ 12-MONTH ANTI-TARNISH WARRANTY',
  ],
  support_email: 'support@hastara.shop',
  whatsapp_number: '',
  instagram_handle: '',
};

function json(res, code, obj) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(code).send(JSON.stringify(obj));
}

async function handleSettings(req, res) {
  const s = Object.assign({}, DEFAULTS, { announcement_lines: DEFAULTS.announcement_lines.slice() });
  try {
    const fsdb = require('./_fs');
    const doc = await fsdb.docGet('settings', 'store');
    if (doc) {
      if (doc.announcement_on !== undefined) s.announcement_on = doc.announcement_on !== false;
      if (Array.isArray(doc.announcement_lines) && doc.announcement_lines.length)
        s.announcement_lines = doc.announcement_lines.map(String).filter(Boolean);
      if (doc.support_email) s.support_email = String(doc.support_email);
      if (doc.whatsapp_number) s.whatsapp_number = String(doc.whatsapp_number);
      if (doc.instagram_handle) s.instagram_handle = String(doc.instagram_handle);
    }
  } catch (e) { /* fall back to defaults */ }
  json(res, 200, { ok: true, settings: s });
}

async function handleCoupon(req, res) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const code = String(body.code || '').toUpperCase().trim();
  const subtotal = Number(body.subtotal) || 0;
  const c = await getCoupon(code);
  const q = quoteCoupon(c, subtotal, 0);
  if (!q.ok) { json(res, 200, { ok: false, error: q.error }); return; }
  json(res, 200, { ok: true, code, discount: q.discount });
}

module.exports = async (req, res) => {
  try {
    let action = '';
    try { action = new URL(req.url || '', 'http://x').searchParams.get('action') || ''; }
    catch (e) { action = ''; }
    if (req.method === 'POST' && action === 'coupon') { await handleCoupon(req, res); return; }
    if (req.method === 'GET' && (action === 'settings' || action === '')) { await handleSettings(req, res); return; }
    json(res, 405, { ok: false });
  } catch (e) {
    json(res, 500, { ok: false, error: 'Server error. Please try again.' });
  }
};
