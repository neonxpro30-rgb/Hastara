// Shared Firestore REST helpers (no npm dependencies).
// Auth: service-account JWT -> OAuth token, via FIREBASE_SERVICE_ACCOUNT_JSON env.
const crypto = require('crypto');

function _b64url(s) {
  return Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let _tok = null, _exp = 0;

function serviceAccount() {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) return null;
    const j = JSON.parse(raw);
    if (j.client_email && j.private_key && j.project_id) return j;
  } catch (e) {}
  return null;
}

async function accessToken() {
  const sa = serviceAccount();
  if (!sa) throw new Error('firebase not configured');
  const now = Math.floor(Date.now() / 1000);
  if (_tok && _exp > now + 60) return _tok;
  const header = _b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = _b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header + '.' + claims);
  const sig = signer.sign({ key: String(sa.private_key).replace(/\\n/g, '\n') }, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + header + '.' + claims + '.' + sig,
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('firestore auth failed');
  _tok = j.access_token; _exp = now + 3500;
  return _tok;
}

// Plain JS -> Firestore typed value.
function fv(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fv) } };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'object') {
    const fields = {};
    for (const k of Object.keys(v)) fields[k] = fv(v[k]);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

// Firestore typed value -> plain JS.
function unfv(v) {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return ((v.arrayValue || {}).values || []).map(unfv);
  if ('mapValue' in v) {
    const o = {};
    const f = (v.mapValue || {}).fields || {};
    for (const k of Object.keys(f)) o[k] = unfv(f[k]);
    return o;
  }
  return v;
}

async function _req(method, path, body) {
  const sa = serviceAccount();
  if (!sa) throw new Error('firebase not configured');
  const t = await accessToken();
  const r = await fetch(
    'https://firestore.googleapis.com/v1/projects/' + sa.project_id + '/databases/(default)' + path,
    {
      method,
      headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }
  );
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('firestore ' + r.status + ': ' + JSON.stringify(j).slice(0, 200));
  return j;
}

function _docId(name) {
  const m = String(name || '').match(/\/([^\/]+)$/);
  return m ? m[1] : null;
}

// List documents in a collection, newest first by createdAt when present.
async function colList(col, limit) {
  const j = await _req('GET', '/documents/' + col + '?pageSize=' + (limit || 100));
  const docs = (j.documents || []).map((d) => Object.assign({ _id: _docId(d.name) }, unfv({ mapValue: { fields: d.fields || {} } })));
  docs.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return docs;
}

async function docGet(col, id) {
  try {
    const d = await _req('GET', '/documents/' + col + '/' + encodeURIComponent(id));
    return Object.assign({ _id: _docId(d.name) }, unfv({ mapValue: { fields: d.fields || {} } }));
  } catch (e) { return null; }
}

// Upsert a document (creates or replaces). PATCH without mask replaces all fields.
async function docSet(col, id, obj) {
  const clean = Object.assign({}, obj);
  delete clean._id;
  const d = await _req('PATCH', '/documents/' + col + '/' + encodeURIComponent(id), { fields: fv(clean).mapValue.fields });
  return Object.assign({ _id: _docId(d.name) }, unfv({ mapValue: { fields: d.fields || {} } }));
}

// Delete a document.
async function docDel(col, id) {
  await _req('DELETE', '/documents/' + col + '/' + encodeURIComponent(id));
  return true;
}

module.exports = { serviceAccount, fv, unfv, colList, docGet, docSet, docDel };
