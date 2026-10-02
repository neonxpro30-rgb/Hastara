// POST /api/admin/seed -> copy products.json catalog into Firestore `products`. Auth required.
const admin = require('../_admin');
const fsdb = require('../_fs');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    if (!admin.requireAuth(req, res)) return;
    if (req.method !== 'POST') { admin.json(res, 405, { ok: false }); return; }
    const p = path.join(process.cwd(), 'products.json');
    const all = (JSON.parse(fs.readFileSync(p, 'utf8')).products || []).filter((x) => x && x.id);
    let n = 0;
    for (const prod of all) {
      const clean = Object.assign({}, prod);
      delete clean._id;
      await fsdb.docSet('products', String(prod.id), clean);
      n++;
    }
    admin.json(res, 200, { ok: true, seeded: n });
  } catch (e) { admin.json(res, 500, { ok: false, error: 'seed failed: ' + String((e && e.message) || e).slice(0, 120) }); }
};
