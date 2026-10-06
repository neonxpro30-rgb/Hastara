// Admin data API (consolidated to stay under Vercel Hobby's 12-function limit).
// ?resource=products -> GET list, POST upsert {product}, DELETE ?id=
// ?resource=coupons  -> GET list, POST upsert {coupon}, DELETE ?id=CODE
// ?resource=settings -> GET, POST {settings}
// Auth required for all.
const admin = require('../_admin');
const fsdb = require('../_fs');
const { cleanCoupon } = require('../_coupons');

function queryParam(req, k) {
  try { return new URL(req.url || '', 'http://x').searchParams.get(k) || ''; }
  catch (e) { return ''; }
}

/* ---------- products ---------- */
function cleanProduct(p) {
  const o = {
    id: String(p.id || '').trim(),
    name: String(p.name || '').trim(),
    price: Number(p.price) || 0,
    compare_at: Number(p.compare_at) || 0,
    rating: Number(p.rating) || 0,
    category: String(p.category || 'earrings'),
    description: String(p.description || ''),
    material: String(p.material || ''),
    dimensions: String(p.dimensions || ''),
    weight: String(p.weight || ''),
    sku: String(p.sku || ''),
    badges: Array.isArray(p.badges) ? p.badges.map(String) : [],
    images: Array.isArray(p.images) ? p.images.map(String).filter(Boolean) : [],
    active: p.active !== false,
    // Stock: units available. Missing/blank = untracked (treated as ample).
    stock: (p.stock === undefined || p.stock === null || p.stock === '')
      ? undefined
      : Math.max(0, parseInt(p.stock, 10) || 0),
  };
  o.image = o.images[0] || String(p.image || '');
  // Don't persist an undefined stock key — keeps old docs clean.
  if (o.stock === undefined) delete o.stock;
  return o;
}

async function handleProducts(req, res) {
  if (req.method === 'GET') {
    const docs = await fsdb.colList('products', 100);
    docs.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    admin.json(res, 200, { ok: true, products: docs });
    return;
  }
  if (req.method === 'POST') {
    const body = admin.parseBody(req);
    const p = cleanProduct(body.product || {});
    if (!p.id || !p.name || !p.price) { admin.json(res, 400, { ok: false, error: 'id, name, price required' }); return; }
    if (!p.images.length) { admin.json(res, 400, { ok: false, error: 'at least 1 image required' }); return; }
    const saved = await fsdb.docSet('products', p.id, p);
    admin.json(res, 200, { ok: true, product: saved });
    return;
  }
  if (req.method === 'DELETE') {
    const body = admin.parseBody(req) || {};
    const id = String(queryParam(req, 'id') || body.id || '').trim();
    if (!id) { admin.json(res, 400, { ok: false, error: 'id required' }); return; }
    await fsdb.docDel('products', id);
    admin.json(res, 200, { ok: true, deleted: id });
    return;
  }
  admin.json(res, 405, { ok: false });
}

/* ---------- coupons ---------- */
async function handleCoupons(req, res) {
  if (req.method === 'GET') {
    const docs = await fsdb.colList('coupons', 200);
    docs.sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')));
    admin.json(res, 200, { ok: true, coupons: docs });
    return;
  }
  if (req.method === 'POST') {
    const body = admin.parseBody(req);
    const c = cleanCoupon(body.coupon || {});
    if (!c.code) { admin.json(res, 400, { ok: false, error: 'code required' }); return; }
    if (c.type !== 'flat' && c.type !== 'percent') { admin.json(res, 400, { ok: false, error: 'type must be flat or percent' }); return; }
    if (!(c.value > 0)) { admin.json(res, 400, { ok: false, error: 'value must be > 0' }); return; }
    const existing = await fsdb.docGet('coupons', c.code);
    // Never reset the redemption counter on edit — keep the live count.
    c.used_count = (existing && existing.used_count != null) ? (Number(existing.used_count) || 0) : c.used_count;
    const saved = await fsdb.docSet('coupons', c.code, c);
    admin.json(res, 200, { ok: true, coupon: saved });
    return;
  }
  if (req.method === 'DELETE') {
    const body = admin.parseBody(req) || {};
    const id = String(queryParam(req, 'id') || body.id || '').toUpperCase().trim();
    if (!id) { admin.json(res, 400, { ok: false, error: 'id required' }); return; }
    await fsdb.docDel('coupons', id);
    admin.json(res, 200, { ok: true, deleted: id });
    return;
  }
  admin.json(res, 405, { ok: false });
}

/* ---------- settings ---------- */
function cleanSettings(s) {
  s = s || {};
  const lines = String(s.announcement_lines == null ? '' : s.announcement_lines)
    .split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 12);
  return {
    announcement_on: s.announcement_on !== false,
    announcement_lines: lines,
    support_email: String(s.support_email || '').trim().slice(0, 100),
    whatsapp_number: String(s.whatsapp_number || '').replace(/\D/g, '').slice(0, 15),
    instagram_handle: String(s.instagram_handle || '').replace(/^@/, '').trim().slice(0, 40),
  };
}

async function handleSettings(req, res) {
  if (req.method === 'GET') {
    const doc = await fsdb.docGet('settings', 'store');
    admin.json(res, 200, { ok: true, settings: doc || {} });
    return;
  }
  if (req.method === 'POST') {
    const body = admin.parseBody(req);
    const clean = cleanSettings(body.settings || {});
    const existing = (await fsdb.docGet('settings', 'store')) || {};
    delete existing._id;
    const saved = await fsdb.docSet('settings', 'store', Object.assign({}, existing, clean));
    admin.json(res, 200, { ok: true, settings: saved });
    return;
  }
  admin.json(res, 405, { ok: false });
}

module.exports = async (req, res) => {
  try {
    if (!admin.requireAuth(req, res)) return;
    const resource = queryParam(req, 'resource');
    if (resource === 'products') { await handleProducts(req, res); return; }
    if (resource === 'coupons') { await handleCoupons(req, res); return; }
    if (resource === 'settings') { await handleSettings(req, res); return; }
    admin.json(res, 400, { ok: false, error: 'unknown resource' });
  } catch (e) { admin.json(res, 500, { ok: false, error: 'server error' }); }
};
