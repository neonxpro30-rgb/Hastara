// Admin store settings: GET -> {ok, settings}, POST {settings} -> merge + upsert.
// Auth required. Stored as Firestore doc `settings/store`.
const admin = require('../_admin');
const fsdb = require('../_fs');

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

module.exports = async (req, res) => {
  try {
    if (!admin.requireAuth(req, res)) return;
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
  } catch (e) { admin.json(res, 500, { ok: false, error: 'server error' }); }
};
