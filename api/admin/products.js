// Admin products: GET list, POST upsert {product}, DELETE ?id=. Auth required.
const admin = require('../_admin');
const fsdb = require('../_fs');

function queryId(req) {
  try { return new URL(req.url || '', 'http://x').searchParams.get('id') || ''; }
  catch (e) { return ''; }
}

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
  };
  o.image = o.images[0] || String(p.image || '');
  return o;
}

module.exports = async (req, res) => {
  try {
    if (!admin.requireAuth(req, res)) return;
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
      const id = String(queryId(req) || body.id || '').trim();
      if (!id) { admin.json(res, 400, { ok: false, error: 'id required' }); return; }
      await fsdb.docDel('products', id);
      admin.json(res, 200, { ok: true, deleted: id });
      return;
    }
    admin.json(res, 405, { ok: false });
  } catch (e) { admin.json(res, 500, { ok: false, error: 'server error' }); }
};
