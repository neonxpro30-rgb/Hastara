// Admin coupons: GET list, POST upsert {coupon}, DELETE ?id=CODE. Auth required.
const admin = require('../_admin');
const fsdb = require('../_fs');
const { cleanCoupon } = require('../_coupons');

function queryId(req) {
  try { return new URL(req.url || '', 'http://x').searchParams.get('id') || ''; }
  catch (e) { return ''; }
}

module.exports = async (req, res) => {
  try {
    if (!admin.requireAuth(req, res)) return;
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
      const id = String(queryId(req) || body.id || '').toUpperCase().trim();
      if (!id) { admin.json(res, 400, { ok: false, error: 'id required' }); return; }
      await fsdb.docDel('coupons', id);
      admin.json(res, 200, { ok: true, deleted: id });
      return;
    }
    admin.json(res, 405, { ok: false });
  } catch (e) { admin.json(res, 500, { ok: false, error: 'server error' }); }
};
