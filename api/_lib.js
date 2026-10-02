// Shared order helpers for Hastara (duplicated per serverless function).
// Orders are saved to Firestore (`orders` collection) via FIREBASE_SERVICE_ACCOUNT_JSON;
// without it the order is still confirmed but not persisted (testing phase).

function loadCatalog() {
  const fs = require('fs');
  const path = require('path');
  try {
    const p = path.join(process.cwd(), 'products.json');
    return (JSON.parse(fs.readFileSync(p, 'utf8')).products || []).filter((x) => x && x.active);
  } catch (e) { return []; }
}

function findProduct(catalog, id) {
  return catalog.filter((p) => p.id === id)[0] || null;
}

// Pincode delivery zones (mirrored in the storefront JS).
// Metros: Delhi 11, Mumbai 40, Pune 41, Ahmedabad 38, Bangalore 56, Chennai 60, Kolkata 70, Hyderabad 50.
const METRO_PIN = ['11', '40', '41', '38', '56', '60', '70', '50'];
const FREE_SHIP = 499, SHIP_METRO = 49, SHIP_OTHER = 69;
const PREPAID_PERK = 40; // ₹40 prepaid perk (PayU orders only), mirrored in the storefront checkout.

function isMetroPin(pin) {
  return /^\d{6}$/.test(pin || '') && METRO_PIN.indexOf(String(pin).slice(0, 2)) !== -1;
}

// Server-side totals: never trust client amounts.
// Async because an optional coupon code is validated against Firestore.
async function buildOrder(catalog, items, pincode, isPrepaid, couponCode) {
  const lines = [];
  let subtotal = 0;
  for (const it of items || []) {
    const p = findProduct(catalog, String(it.id || ''));
    const qty = Math.max(1, Math.min(10, parseInt(it.qty, 10) || 1));
    if (!p) return { error: 'Unknown product: ' + it.id };
    lines.push({ id: p.id, name: p.name, sku: p.sku, price: p.price, qty, image: p.image });
    subtotal += p.price * qty;
  }
  if (!lines.length) return { error: 'Your bag is empty.' };
  // Zone-based shipping: FREE over ₹499; ₹49 metros / ₹69 rest of India below that.
  const shipping = subtotal >= FREE_SHIP ? 0 : (isMetroPin(pincode) ? SHIP_METRO : SHIP_OTHER);
  // Tiered festive offer (mirrored in the storefront): 2 pairs -> ₹100 off, 3+ -> ₹200 off.
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const discount = count >= 3 ? 200 : count >= 2 ? 100 : 0;
  // ₹40 prepaid perk (mirrored in the storefront): PayU/prepaid orders only, never COD.
  const perk = isPrepaid ? PREPAID_PERK : 0;
  const order = { lines, subtotal, shipping, discount, perk, total: Math.max(0, subtotal + shipping - discount - perk) };
  // Optional coupon code: validated + quoted server-side, stacks after the tier offer.
  if (couponCode) {
    const { applyCoupon } = require('./_coupons');
    const withCoupon = await applyCoupon(order, couponCode);
    if (withCoupon.error) return { error: withCoupon.error };
    return withCoupon;
  }
  return order;
}

function validCustomer(c) {
  c = c || {};
  const firstname = String(c.firstname || '').replace(/[^a-zA-Z ]/g, '').trim().slice(0, 50);
  const email = String(c.email || '').trim().slice(0, 100);
  let phone = String(c.phone || '').replace(/[\s-]/g, '');
  if (phone.startsWith('+91')) phone = phone.slice(3);
  if (phone.startsWith('91') && phone.length === 12) phone = phone.slice(2);
  const address = String(c.address || '').trim().slice(0, 200);
  const city = String(c.city || '').trim().slice(0, 60);
  const state = String(c.state || '').trim().slice(0, 60);
  const pincode = String(c.pincode || '').replace(/\D/g, '').slice(0, 6);
  if (firstname.length < 2) return { error: 'Please enter a valid name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Please enter a valid email address.' };
  if (!/^[6-9]\d{9}$/.test(phone)) return { error: 'Please enter a valid 10-digit mobile number.' };
  if (address.length < 8) return { error: 'Please enter your full delivery address.' };
  if (city.length < 2) return { error: 'Please enter your city.' };
  if (state.length < 2) return { error: 'Please enter your state.' };
  if (!/^\d{6}$/.test(pincode)) return { error: 'Please enter a valid 6-digit pincode.' };
  return { customer: { firstname, email, phone, address, city, state, pincode } };
}

function orderId(prefix) {
  return prefix + Date.now().toString(36).toUpperCase() + Math.floor(100 + Math.random() * 900);
}

const crypto = require('crypto');

// --- Firestore order saving (REST API, no extra dependencies) ---
// Uses FIREBASE_SERVICE_ACCOUNT_JSON env var (already configured in Vercel).
// Writes each order as a document in the `orders` collection, id = orderId.
let _fsToken = null, _fsTokenExp = 0;
function _b64url(s) {
  return Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function _fsAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  if (_fsToken && _fsTokenExp > now + 60) return _fsToken;
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
  _fsToken = j.access_token; _fsTokenExp = now + 3500;
  return _fsToken;
}
// Plain JS value -> Firestore REST typed value.
function _fv(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(_fv) } };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'object') {
    const fields = {};
    for (const k of Object.keys(v)) fields[k] = _fv(v[k]);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

async function saveOrder(order) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) return false;
    const sa = JSON.parse(raw);
    if (!sa.client_email || !sa.private_key || !sa.project_id) return false;
    const token = await _fsAccessToken(sa);
    const url = 'https://firestore.googleapis.com/v1/projects/' + sa.project_id +
      '/databases/(default)/documents/orders?documentId=' + encodeURIComponent(order.orderId);
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: _fv(order).mapValue.fields }),
    });
    return r.ok;
  } catch (e) { return false; }
}

function parseJsonBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b || {};
}

module.exports = { loadCatalog, findProduct, buildOrder, validCustomer, orderId, saveOrder, parseJsonBody };
