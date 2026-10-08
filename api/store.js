// Public storefront API (consolidated to stay under Vercel Hobby's 12-function limit).
// GET  /api/store                -> {ok, settings}  (public store settings)
// GET  /api/store?action=settings -> same as above
// POST /api/store?action=coupon  -> {ok, code, discount} | {ok:false, error} (coupon quote)
// POST /api/store?action=track   -> {ok:true} (public visit beacon; no auth)
//   body {type:'visit'|'pdp'|'bag'|'engage'|'time', product?, seconds?, ad?}
//   -> increments stats_daily/{YYYY-MM-DD} (IST). visit=once/session,
//      pdp=+product id into product_views map, engage=once/session with any
//      product interaction (for bounce rate), time=session seconds on pagehide.
//      ad=utm_content tag (image/video/unknown) -> ad_breakdown map for per-ad
//      visit/tap/engage comparison.
function istDay(d) {
  const t = d instanceof Date ? d : new Date(d);
  if (isNaN(t.getTime())) return '';
  return new Date(t.getTime() + (330 + t.getTimezoneOffset()) * 60000).toISOString().slice(0, 10);
}

// Per-ad sub-counter inside a stats_daily doc: doc.ad_breakdown[ad] = {visits, pdp_views, bag_adds, engaged}
function adObj(doc, rawAd) {
  const key = String(rawAd || '').slice(0, 40) || 'unknown';
  const ab = (doc.ad_breakdown && typeof doc.ad_breakdown === 'object') ? doc.ad_breakdown : {};
  const o = (ab[key] && typeof ab[key] === 'object') ? ab[key] : {};
  ab[key] = o;
  doc.ad_breakdown = ab;
  return o;
}
function bump(o, k) { o[k] = (Number(o[k]) || 0) + 1; }

async function handleTrack(req, res) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const type = String(body.type || '');
  const valid = type === 'visit' || type === 'pdp' || type === 'bag' || type === 'engage' || type === 'time';
  if (!valid) { json(res, 400, { ok: false }); return; }
  try {
    const fsdb = require('./_fs');
    const day = istDay(new Date());
    const doc = (await fsdb.docGet('stats_daily', day)) || {};
    delete doc._id;
    doc.date = day;
    if (type === 'visit') {
      doc.visits = (Number(doc.visits) || 0) + 1;
      bump(adObj(doc, body.ad), 'visits');
    } else if (type === 'pdp') {
      doc.pdp_views = (Number(doc.pdp_views) || 0) + 1;
      bump(adObj(doc, body.ad), 'pdp_views');
      const pid = String(body.product || '').slice(0, 60);
      if (pid) {
        const pv = (doc.product_views && typeof doc.product_views === 'object') ? doc.product_views : {};
        pv[pid] = (Number(pv[pid]) || 0) + 1;
        doc.product_views = pv;
      }
    } else if (type === 'bag') {
      doc.bag_adds = (Number(doc.bag_adds) || 0) + 1;
      bump(adObj(doc, body.ad), 'bag_adds');
    } else if (type === 'engage') {
      doc.engaged = (Number(doc.engaged) || 0) + 1;
      bump(adObj(doc, body.ad), 'engaged');
    } else if (type === 'time') {
      const s = Math.min(7200, Math.max(0, parseInt(body.seconds, 10) || 0));
      if (s >= 3) {
        doc.time_total = (Number(doc.time_total) || 0) + s;
        doc.time_n = (Number(doc.time_n) || 0) + 1;
      }
    }
    await fsdb.docSet('stats_daily', day, doc);
  } catch (e) { /* best-effort: never fail the storefront over analytics */ }
  json(res, 200, { ok: true });
}
const { getCoupon, quoteCoupon } = require('./_coupons');

const DEFAULTS = {
  announcement_on: true,
  announcement_lines: [
    '✦ FESTIVE SALE',
    '✦ BUY 2 GET ₹100 OFF · 3+ GET ₹200 OFF',
    '✦ COD AVAILABLE',
    '✦ FREE SHIPPING OVER ₹499',
    '✦ 7-DAY EASY RETURNS',
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
    if (req.method === 'POST' && action === 'track') { await handleTrack(req, res); return; }
    if (req.method === 'GET' && (action === 'settings' || action === '')) { await handleSettings(req, res); return; }
    json(res, 405, { ok: false });
  } catch (e) {
    json(res, 500, { ok: false, error: 'Server error. Please try again.' });
  }
};
