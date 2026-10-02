// Admin orders: GET list, PATCH {orderId, status}. Auth required.
const admin = require('../_admin');
const fsdb = require('../_fs');

const STATUSES = ['confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

module.exports = async (req, res) => {
  try {
    if (!admin.requireAuth(req, res)) return;
    if (req.method === 'GET') {
      const docs = await fsdb.colList('orders', 200);
      admin.json(res, 200, { ok: true, orders: docs, statuses: STATUSES });
      return;
    }
    if (req.method === 'PATCH') {
      const body = admin.parseBody(req);
      const orderId = String(body.orderId || '');
      const status = String(body.status || '');
      if (!orderId || STATUSES.indexOf(status) < 0) { admin.json(res, 400, { ok: false, error: 'bad orderId/status' }); return; }
      const cur = await fsdb.docGet('orders', orderId);
      if (!cur) { admin.json(res, 404, { ok: false, error: 'order not found' }); return; }
      cur.status = status;
      const saved = await fsdb.docSet('orders', orderId, cur);
      admin.json(res, 200, { ok: true, order: saved });
      return;
    }
    admin.json(res, 405, { ok: false });
  } catch (e) { admin.json(res, 500, { ok: false, error: 'server error' }); }
};
