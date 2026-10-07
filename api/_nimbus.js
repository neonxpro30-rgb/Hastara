// NimbusPost v2 Partner API helpers for Hastara (underscore-prefixed: helper, not a route).
// Env: NIMBUSPOST_API_KEY, NIMBUSPOST_API_SECRET (falls back to NIMBUSPOST_SECRET).
// Env: NIMBUSPOST_API_KEY, NIMBUSPOST_API_SECRET (dashboard -> Settings -> API Keys).
// Every call fails soft (returns null) so checkout/orders never break when
// NimbusPost is down or keys are missing — the flat-rate fallback applies.

const BASE = 'https://api-v2.nimbuspost.com';
const TIMEOUT_MS = 8000;

// Standard parcel for jewellery orders: box 18.5 x 13.5 x 10 cm, 100g
// (measured 90g actual — Naksh 2026-10-07).
const PARCEL = { weightG: 100, length: 18.5, width: 13.5, height: 10 };

function apiSecret() {
  return process.env.NIMBUSPOST_API_SECRET || process.env.NIMBUSPOST_SECRET || '';
}

function configured() {
  return !!(process.env.NIMBUSPOST_API_KEY && apiSecret());
}

function headers() {
  return {
    'x-api-key': process.env.NIMBUSPOST_API_KEY,
    'x-api-secret': apiSecret(),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function api(method, path, body) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(BASE + path, {
      method,
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    });
    const j = await r.json().catch(() => null);
    if (!j || j.success !== true) return null;
    return j.data || null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Primary pickup warehouse (cached 5 min). Gives warehouse_id + pincode.
let whCache = null;
let whCacheAt = 0;
async function primaryWarehouse() {
  if (!configured()) return null;
  if (whCache && Date.now() - whCacheAt < 5 * 60 * 1000) return whCache;
  const data = await api('GET', '/v2/warehouses');
  const list = Array.isArray(data) ? data : (data && data.warehouses) || [];
  const primary = list.find((w) => w && w.is_primary) || list[0] || null;
  if (primary) {
    whCache = primary;
    whCacheAt = Date.now();
  }
  return primary;
}

function warehousePincode(wh) {
  if (!wh) return '';
  const p = String((wh.address && wh.address.pincode) || wh.pincode || '');
  return /^\d{6}$/.test(p) ? p : '';
}

// Live shipping rates for a delivery pincode.
// paymentMode: 'cod' | 'prepaid'.
// Returns [{cost (₹), etaDays, courier}] sorted cheapest-first (de-duplicated by
// courier name), or null when NimbusPost is unavailable. `limit` caps the list.
async function getRates(deliveryPincode, paymentMode, orderValue, limit) {
  if (!configured()) return null;
  if (!/^\d{6}$/.test(deliveryPincode || '')) return null;
  const wh = await primaryWarehouse();
  const pickup = warehousePincode(wh);
  if (!pickup) return null;
  const data = await api('POST', '/v2/serviceability', {
    pickupPincode: pickup,
    deliveryPincode: String(deliveryPincode),
    paymentMode: paymentMode === 'cod' ? 'cod' : 'prepaid',
    packages: [{ weight: PARCEL.weightG, length: PARCEL.length, width: PARCEL.width, height: PARCEL.height }],
    orderValuePaise: Math.round((orderValue || 0) * 100),
  });
  const avail = (data && data.available) || [];
  const out = [];
  for (const c of avail) {
    const paise = c && c.result && c.result.totalPaise;
    if (!c || !c.courierId || !(paise > 0)) continue;
    out.push({
      cost: Math.ceil(paise / 100),
      etaDays: c.tatDays || null,
      courier: c.courierDisplayName || c.courierName || '',
    });
  }
  out.sort((a, b) => a.cost - b.cost);
  const seen = {};
  const deduped = out.filter((o) => {
    const k = String(o.courier).toLowerCase();
    if (!k || seen[k]) return false;
    seen[k] = 1;
    return true;
  });
  return deduped.slice(0, Math.max(1, limit || 4));
}

// Cheapest single rate (backward-compat wrapper over getRates).
// paymentMode: 'cod' | 'prepaid'. Returns {cost (₹), etaDays, courier} or null.
async function getRate(deliveryPincode, paymentMode, orderValue) {
  const rates = await getRates(deliveryPincode, paymentMode, orderValue, 1);
  return (rates && rates[0]) || null;
}

// Create a PENDING draft order in NimbusPost (no courier, no AWB, no wallet
// charge). It appears in the NimbusPost dashboard for review/booking.
// order: {orderId, payment: 'COD'|'prepaid', total, lines, customer}
// Returns the NimbusPost order_id or null.
async function createDraftOrder(order) {
  if (!configured()) return null;
  const wh = await primaryWarehouse();
  if (!wh || !wh.warehouse_id) return null;
  const c = order.customer || {};
  const isCod = order.payment === 'COD';
  const pincode = parseInt(String(c.pincode || '').replace(/\D/g, ''), 10);
  const phone = parseInt(String(c.phone || '').replace(/\D/g, '').slice(-10), 10);
  if (!pincode || !phone) return null;
  // NimbusPost computes the order total from items only, and rejects a COD
  // collectable amount greater than that total — so shipping goes in as a
  // line item, keeping items total == collectable total.
  const items = (order.lines || []).map((l) => ({
    name: String(l.name || 'Jewellery').slice(0, 100),
    qty: l.qty || 1,
    price: l.price || 0,
  }));
  const shipCost = Math.round(order.shipping || 0);
  if (shipCost > 0) items.push({ name: 'Shipping charges', qty: 1, price: shipCost });
  const body = {
    order_number: String(order.orderId),
    order_type: 'b2c',
    payment_mode: isCod ? 'cod' : 'prepaid',
    warehouse_id: wh.warehouse_id,
    shipping_address: {
      name: String(c.firstname || '').slice(0, 50),
      address: String(c.address || '').slice(0, 200),
      city: String(c.city || '').slice(0, 60),
      state: String(c.state || '').slice(0, 60),
      country: 'India',
      pincode,
      phone,
    },
    items,
    package: {
      weight: PARCEL.weightG / 1000,
      length: PARCEL.length,
      width: PARCEL.width,
      height: PARCEL.height,
    },
  };
  if (isCod) body.order_collectable_amount = Math.round(order.total || 0);
  const data = await api('POST', '/v2/orders', body);
  return (data && data.order_id) || null;
}

module.exports = { configured, getRate, getRates, createDraftOrder, primaryWarehouse };
