// Coupon helpers for Hastara: Firestore `coupons` collection (doc id = UPPERCASE code).
// Pure quoting logic + helpers shared by the public quote API, checkout APIs and admin.
const fsdb = require('./_fs');

// Sanitize admin coupon input into a clean, storable object.
function cleanCoupon(c) {
  c = c || {};
  const code = String(c.code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
  const type = c.type === 'percent' ? 'percent' : 'flat';
  const value = Math.max(0, Number(c.value) || 0);
  const min_order = Math.max(0, Math.floor(Number(c.min_order) || 0));
  const mx = (c.max_discount === '' || c.max_discount == null) ? 0 : Math.max(0, Math.floor(Number(c.max_discount) || 0));
  const ul = (c.usage_limit === '' || c.usage_limit == null) ? 0 : Math.max(0, Math.floor(Number(c.usage_limit) || 0));
  return {
    code,
    type,
    value,
    min_order,
    max_discount: mx,
    active: c.active !== false,
    starts_at: String(c.starts_at || '').slice(0, 32),
    ends_at: String(c.ends_at || '').slice(0, 32),
    usage_limit: ul,
    used_count: Math.max(0, Math.floor(Number(c.used_count) || 0)),
    note: String(c.note || '').slice(0, 120),
  };
}

// Pure validation + quote: returns {ok:true, discount} or {ok:false, error}.
// tierDiscount is the already-applied festive-tier discount; coupon applies on the remainder.
function quoteCoupon(c, subtotal, tierDiscount) {
  if (!c || !c.code) return { ok: false, error: 'Invalid coupon code.' };
  if (!c.active) return { ok: false, error: 'This coupon is no longer active.' };
  const now = Date.now();
  if (c.starts_at) {
    const s = new Date(c.starts_at).getTime();
    if (!isNaN(s) && now < s) return { ok: false, error: 'This coupon is not live yet.' };
  }
  if (c.ends_at) {
    const e = new Date(c.ends_at).getTime();
    if (!isNaN(e) && now > e) return { ok: false, error: 'This coupon has expired.' };
  }
  subtotal = Math.max(0, Number(subtotal) || 0);
  if (c.min_order > 0 && subtotal < c.min_order)
    return { ok: false, error: 'This coupon needs a minimum order of ₹' + c.min_order + '.' };
  if (c.usage_limit > 0 && (Number(c.used_count) || 0) >= c.usage_limit)
    return { ok: false, error: 'This coupon has reached its usage limit.' };
  const payable = Math.max(0, subtotal - (Number(tierDiscount) || 0));
  let discount = 0;
  if (c.type === 'percent') {
    discount = payable * (Number(c.value) || 0) / 100;
    if (c.max_discount > 0) discount = Math.min(discount, c.max_discount);
  } else {
    discount = Math.min(Number(c.value) || 0, payable);
  }
  discount = Math.round(discount);
  if (discount <= 0) return { ok: false, error: 'This coupon gives no discount on this order.' };
  return { ok: true, discount };
}

async function getCoupon(code) {
  const id = String(code || '').toUpperCase().trim();
  if (!id) return null;
  return fsdb.docGet('coupons', id);
}

// Apply a coupon to a buildOrder result. No code -> order unchanged.
// On validation failure returns {error}.
async function applyCoupon(order, code) {
  if (!code) return order;
  const c = await getCoupon(code);
  const q = quoteCoupon(c, order.subtotal, order.discount);
  if (!q.ok) return { error: q.error };
  order.couponCode = String(code).toUpperCase().trim();
  order.couponDiscount = q.discount;
  order.total = Math.max(0, order.subtotal + order.shipping - order.discount - q.discount - (order.perk || 0));
  return order;
}

// Increment a coupon's used_count after a successful order. Never throws.
async function redeemCoupon(code) {
  try {
    const c = await getCoupon(code);
    if (!c || !c.code) return false;
    c.used_count = (Number(c.used_count) || 0) + 1;
    await fsdb.docSet('coupons', c.code, c);
    return true;
  } catch (e) { return false; }
}

module.exports = { cleanCoupon, quoteCoupon, getCoupon, applyCoupon, redeemCoupon };
