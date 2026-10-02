// Admin auth helpers. Password gate via ADMIN_PASSWORD env + HMAC session cookie.
const crypto = require('crypto');

function adminKey() { return process.env.ADMIN_PASSWORD || ''; }

function sessionToken() {
  return crypto.createHmac('sha256', adminKey()).update('hastara-admin-session').digest('hex');
}

function isAuthed(req) {
  const key = adminKey();
  if (!key) return false;
  const c = String((req.headers && req.headers.cookie) || '');
  const m = c.match(/(?:^|;\s*)hs_admin=([a-f0-9]{64})/);
  if (!m) return false;
  const a = Buffer.from(m[1], 'utf8'), b = Buffer.from(sessionToken(), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireAuth(req, res) {
  if (!isAuthed(req)) {
    res.status(401).send(JSON.stringify({ ok: false, error: 'unauthorized' }));
    return false;
  }
  return true;
}

function parseBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b || {};
}

function json(res, code, obj) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(code).send(JSON.stringify(obj));
}

module.exports = { adminKey, sessionToken, isAuthed, requireAuth, parseBody, json };
