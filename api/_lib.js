// Shared order helpers for Hastara (duplicated per serverless function).
// Orders are appended to orders.json in the GitHub repo when GITHUB_TOKEN +
// GITHUB_REPO are set; otherwise the order is still confirmed (testing phase).

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
function buildOrder(catalog, items, pincode, isPrepaid) {
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
  return { lines, subtotal, shipping, discount, perk, total: Math.max(0, subtotal + shipping - discount - perk) };
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

async function saveOrder(order) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // e.g. "user/hastara-store"
  if (!token || !repo) return false;
  try {
    const api = 'https://api.github.com/repos/' + repo + '/contents/orders.json';
    const headers = {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'hastara-store',
    };
    let list = [];
    let sha = null;
    const cur = await fetch(api + '?ref=main', { headers });
    if (cur.ok) {
      const j = await cur.json();
      sha = j.sha;
      list = JSON.parse(Buffer.from(j.content, 'base64').toString('utf8'));
    }
    list.push(order);
    const body = {
      message: 'order ' + order.orderId,
      content: Buffer.from(JSON.stringify(list, null, 2)).toString('base64'),
      sha: sha || undefined,
    };
    const put = await fetch(api, { method: 'PUT', headers, body: JSON.stringify(body) });
    return put.ok;
  } catch (e) { return false; }
}

function parseJsonBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b || {};
}

module.exports = { loadCatalog, findProduct, buildOrder, validCustomer, orderId, saveOrder, parseJsonBody };
