// Transactional emails for Hastara via Resend (underscore-prefixed: helper, not a route).
// Env: RESEND_API_KEY. All sends fail soft (return false) so checkout/orders
// never break when email is unconfigured — same pattern as NimbusPost.
// From: orders@hastara.shop (verify hastara.shop domain in Resend first).

function configured() {
  return !!process.env.RESEND_API_KEY;
}

async function send(to, subject, html) {
  if (!configured() || !to) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Hastara ✦ <orders@hastara.shop>',
        to: [to],
        subject,
        html,
      }),
    });
    return r.ok;
  } catch (e) { return false; }
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const CSS = [
  'body{margin:0;padding:0;background:#FFF8EF;font-family:Outfit,system-ui,-apple-system,"Segoe UI",sans-serif;color:#1C1216}',
  '.wrap{max-width:560px;margin:0 auto;padding:24px 16px}',
  '.card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(92,26,46,.10);border:1px solid #f0ddd0}',
  '.head{background:#5C1A2E;color:#fff;text-align:center;padding:28px 20px}',
  '.head .logo{font-family:Fraunces,Georgia,serif;font-weight:900;letter-spacing:6px;font-size:20px;color:#E8C766}',
  '.head h1{margin:10px 0 4px;font-size:24px}',
  '.head p{margin:0;opacity:.85;font-size:14px}',
  '.body{padding:24px 22px}',
  '.oid{display:inline-block;background:#FFF3D6;border:1.5px dashed #C9A227;color:#5C1A2E;font-weight:800;letter-spacing:1px;padding:10px 18px;border-radius:12px;margin:6px 0 14px;font-size:16px}',
  '.items{margin:14px 0;border-top:1px solid #f0ddd0}',
  '.it{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f0ddd0;align-items:center}',
  '.it img{width:56px;height:70px;object-fit:cover;border-radius:10px;background:#F6D9C3}',
  '.it .n{font-weight:700;font-size:14px}',
  '.it .q{color:#8a6f68;font-size:13px}',
  '.it .p{margin-left:auto;font-weight:800;white-space:nowrap}',
  '.tot{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}',
  '.tot.grand{font-size:18px;font-weight:800;color:#5C1A2E;border-top:2px solid #5C1A2E;margin-top:8px;padding-top:12px}',
  '.addr{background:#FFF8EF;border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6;margin:14px 0}',
  '.next{background:#FDF2E9;border-left:4px solid #C9A227;border-radius:0 12px 12px 0;padding:14px 16px;font-size:14px;line-height:1.7;margin:14px 0}',
  '.track{background:#5C1A2E;color:#fff;text-align:center;border-radius:14px;padding:18px;margin:14px 0}',
  '.track .awb{font-size:26px;font-weight:900;letter-spacing:3px;color:#E8C766;margin:8px 0}',
  '.btn{display:inline-block;background:#C9A227;color:#5C1A2E;font-weight:800;text-decoration:none;padding:13px 34px;border-radius:999px;margin-top:10px}',
  '.foot{text-align:center;color:#8a6f68;font-size:12px;padding:18px;line-height:1.7}',
].join('');

function shell(inner) {
  // <style> MUST be in <head> — Gmail strips <style> tags placed inside <body>.
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<style>' + CSS + '</style></head>'
    + '<body style="margin:0;padding:0;background:#FFF8EF;">'
    + '<div class="wrap"><div class="card">' + inner
    + '</div><div class="foot">Need help? Reply to this email or write to <b>support@hastara.shop</b><br>✦ HASTARA — Earrings with main-character energy ✦</div></div></body></html>';
}

function itemsHTML(lines) {
  return '<div class="items">' + (lines || []).map((l) =>
    '<div class="it">' + (l.image ? '<img src="' + esc(l.image) + '" alt="">' : '') +
    '<div><div class="n">' + esc(l.name) + '</div><div class="q">Qty ' + l.qty + ' × ₹' + l.price + '</div></div>' +
    '<div class="p">₹' + (l.price * l.qty) + '</div></div>').join('') + '</div>';
}

function totalsHTML(o) {
  let h = '<div class="tot"><span>Subtotal</span><span>₹' + o.subtotal + '</span></div>';
  if (o.discount) h += '<div class="tot"><span>Festive offer</span><span>−₹' + o.discount + '</span></div>';
  if (o.couponDiscount) h += '<div class="tot"><span>Coupon ' + esc(o.couponCode || '') + '</span><span>−₹' + o.couponDiscount + '</span></div>';
  if (o.perk) h += '<div class="tot"><span>Prepaid perk</span><span>−₹' + o.perk + '</span></div>';
  h += '<div class="tot"><span>Shipping</span><span>' + (o.shipping ? '₹' + o.shipping : 'FREE ✦') + '</span></div>';
  h += '<div class="tot grand"><span>Total ' + (o.payment === 'prepaid' ? 'paid' : 'to pay') + '</span><span>₹' + o.total + '</span></div>';
  return h;
}

function addrHTML(c) {
  c = c || {};
  return '<div class="addr"><b>Delivering to</b><br>' + esc(c.firstname) + ' · ' + esc(c.phone) + '<br>'
    + esc(c.address) + ', ' + esc(c.city) + ', ' + esc(c.state) + ' — ' + esc(c.pincode) + '</div>';
}

// --- Order confirmation (COD + prepaid) ---
function orderEmail(o) {
  const c = o.customer || {};
  const first = esc((c.firstname || 'beautiful').split(' ')[0]);
  const inner =
    '<div class="head"><div class="logo">✦ HASTARA ✦</div><h1>Order confirmed!</h1><p>Your jewels are being packed with love 💛</p></div>' +
    '<div class="body"><p>Hey ' + first + '!</p>' +
    '<p>We got your order and it\'s officially in the queue. Here\'s what you got:</p>' +
    '<div class="oid">Order ' + esc(o.orderId) + '</div>' +
    itemsHTML(o.lines) + totalsHTML(o) + addrHTML(c) +
    '<div class="next"><b>What happens next?</b><br>📦 Packed &amp; shipped within 24–48 hrs<br>📍 Tracking ID lands in your inbox the moment it ships<br>💵 ' +
    (o.payment === 'prepaid' ? 'Paid online — nothing due on delivery.' : 'Keep ₹' + o.total + ' ready in cash/UPI for delivery.') + '</div>' +
    '</div>';
  return shell(inner);
}

// --- Shipping update with NimbusPost AWB ---
function shipEmail(o) {
  const c = o.customer || {};
  const first = esc((c.firstname || 'beautiful').split(' ')[0]);
  const inner =
    '<div class="head"><div class="logo">✦ HASTARA ✦</div><h1>It\'s on its way! 📦</h1><p>Your jewels left our studio</p></div>' +
    '<div class="body"><p>Hey ' + first + ' — good news! Your order is shipped and racing toward you.</p>' +
    '<div class="oid">Order ' + esc(o.orderId) + '</div>' +
    '<div class="track"><div>TRACKING ID</div><div class="awb">' + esc(o.awb || o.trackingId || '') + '</div>' +
    '<div style="opacity:.8;font-size:13px">Courier: ' + esc(o.courier || 'NimbusPost partner') + '</div>' +
    '<a class="btn" href="' + esc(o.trackUrl || 'https://www.hastara.shop/') + '">Track my order</a></div>' +
    itemsHTML(o.lines) + addrHTML(c) +
    '<div class="next"><b>Delivery tip:</b> keep your phone handy — the delivery partner will call on arrival. ' +
    (o.payment === 'cod' ? 'Keep ₹' + o.total + ' ready in cash/UPI.' : 'Nothing to pay — it\'s all yours!') + '</div>' +
    '</div>';
  return shell(inner);
}

module.exports = { configured, send, orderEmail, shipEmail };
