// POST /api/admin/login {password} -> sets hs_admin session cookie.
const admin = require('../_admin');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') { admin.json(res, 405, { ok: false }); return; }
    const body = admin.parseBody(req);
    const key = admin.adminKey();
    if (key && String(body.password || '') === key) {
      const maxAge = 7 * 24 * 3600;
      res.setHeader('Set-Cookie',
        'hs_admin=' + admin.sessionToken() +
        '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=' + maxAge);
      admin.json(res, 200, { ok: true });
    } else {
      admin.json(res, 401, { ok: false, error: 'wrong password' });
    }
  } catch (e) { admin.json(res, 500, { ok: false }); }
};
