// PayU surl/furl -> verify payment via PayU API -> order confirmation page.
// Theme uses CSS variables so the Gen-Z theme can be applied in one place.
const crypto = require('crypto');
const lib = require('./_lib');

const PAYU_KEY = process.env.PAYU_KEY;
const PAYU_SALT = process.env.PAYU_SALT;

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const THEME_CSS = [
  ':root{',
  '  --bg:#FFF8EF; --card:#ffffff; --ink:#1C1216; --muted:#8a6f68;',
  '  --brand:#5C1A2E; --brand-deep:#421222; --gold:#C9A227; --gold-soft:#E8C766;',
  '  --blush:#F6D9C3; --line:#f0ddd0; --ok:#2e9e6b; --rose:#C24D6D;',
  '}',
  '*{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--bg);color:var(--ink);',
  'font-family:Outfit,system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;align-items:center;',
  'justify-content:center;padding:20px}',
  '.card{background:var(--card);border:1px solid var(--line);border-radius:22px;max-width:460px;',
  'width:100%;padding:30px 26px;box-shadow:0 18px 50px rgba(224,73,122,.12);text-align:center}',
  '.logo{font-family:Fraunces,serif;font-weight:900;letter-spacing:4px;color:var(--brand);font-size:17px;margin-bottom:6px}',
  '.tick{width:64px;height:64px;border-radius:50%;background:var(--ok);color:#fff;font-size:32px;',
  'display:flex;align-items:center;justify-content:center;margin:6px auto 14px}',
  'h1{font-size:24px;margin:0 0 8px}p{line-height:1.65;color:var(--muted);font-size:15px}',
  '.oid{display:inline-block;background:var(--gold-soft);border:1px dashed var(--gold);',
  'color:var(--brand-deep);font-weight:800;letter-spacing:1px;padding:10px 18px;border-radius:12px;',
  'margin:10px 0;font-size:17px}',
  '.box{background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:14px 16px;',
  'text-align:left;font-size:14px;margin:14px 0}',
  '.box b{color:var(--ink)}',
  '.btn{display:inline-block;margin-top:14px;background:var(--brand);color:#fff;font-weight:700;',
  'padding:14px 30px;border-radius:999px;text-decoration:none}',
  '.note{font-size:12px;margin-top:14px}',
].join('');

function page(title, msg, orderId) {
  const oid = orderId ? '<div class="oid">Order ' + esc(orderId) + '</div>' : '';
  return '<!doctype html><html><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(title) + ' — Hastara</title><style>' + THEME_CSS + '</style></head>'
    + '<body><div class="card"><div class="logo">✦ HASTARA ✦</div>'
    + '<h1>' + esc(title) + '</h1>' + oid + '<p>' + msg + '</p>'
    + '<a class="btn" href="/">Continue shopping</a>'
    + '<p class="note">Need help? Write to <b>support@hastara.shop</b></p>'
    + '</div></body></html>';
}

function successPage(data) {
  const c = data.customer || {};
  const items = (data.lines || []).map((l) =>
    '<div>✦ ' + esc(l.name) + ' × ' + l.qty + ' — ₹' + (l.price * l.qty) + '</div>').join('');
  return '<!doctype html><html><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Order confirmed — Hastara</title><style>' + THEME_CSS + '</style></head>'
    + '<body><div class="card"><div class="logo">✦ HASTARA ✦</div>'
    + '<div class="tick">✓</div>'
    + '<h1>Payment successful!</h1>'
    + '<div class="oid">Order ' + esc(data.orderId) + '</div>'
    + '<p>Thank you, ' + esc(c.firstname || 'beautiful') + '! Your jewels are being packed '
    + 'with love and will ship within 24–48 hours.</p>'
    + '<div class="box"><b>Your order</b><br>' + items
    + '<br><b>Total paid:</b> ₹' + data.total + '</div>'
    + '<div class="box"><b>Delivering to</b><br>' + esc(c.address) + ', ' + esc(c.city)
    + ', ' + esc(c.state) + ' — ' + esc(c.pincode) + '<br>📱 ' + esc(c.phone) + '</div>'
    + '<a class="btn" href="/">Keep shopping ✦</a>'
    + '<p class="note">A confirmation has been sent to ' + esc(c.email) + '</p>'
    + '</div></body></html>';
}

module.exports = async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      const params = new URLSearchParams(body);
      body = {};
      for (const [k, v] of params) body[k] = v;
    }
    body = body || {};
    const q = req.query || {};
    const txnid = body.txnid || q.txnid;
    if (!txnid) {
      res.status(400).send(page('Hmm…', 'No transaction found. This page only opens right after a PayU payment.'));
      return;
    }
    if (!PAYU_KEY || !PAYU_SALT) {
      res.status(500).send(page('Setup incomplete', 'Payments are not configured on the server yet.'));
      return;
    }

    const command = 'verify_payment';
    const hash = crypto.createHash('sha512')
      .update(PAYU_KEY + '|' + command + '|' + txnid + '|' + PAYU_SALT).digest('hex');
    const params = new URLSearchParams({ key: PAYU_KEY, command, var1: txnid, hash });
    const vr = await fetch('https://info.payu.in/merchant/postservice?form=2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: params.toString(),
    });
    const data = await vr.json();
    const txn = data && data.transaction_details && data.transaction_details[txnid];
    if (!txn || txn.status !== 'success') {
      res.status(402).send(page('Payment not verified',
        'We could not confirm your payment. If money was deducted, wait 10 minutes — it usually reflects automatically.'));
      return;
    }

    let order = null;
    try { order = JSON.parse(Buffer.from(txn.udf1 || body.udf1 || '', 'base64').toString('utf8')); }
    catch (e) { /* ignore */ }
    if (!order || !order.orderId) {
      res.status(200).send(page('Payment successful!',
        'Your payment is confirmed. We\'ll email your order details shortly.', txnid));
      return;
    }

    // Idempotency: if a draft was already created for this order (page refresh
    // / PayU retry), don't create another one.
    let nimbusDraftId = '';
    try {
      const existing = await lib.getOrderFields(order.orderId);
      const prev = existing && existing.nimbusDraftId && existing.nimbusDraftId.stringValue;
      if (prev) nimbusDraftId = prev;
    } catch (e) { /* ignore */ }
    // Auto-create a PENDING draft in NimbusPost so it shows up in the
    // dashboard for review/booking. Best-effort: never fail the confirmation over this.
    if (!nimbusDraftId) {
      try {
        nimbusDraftId = await require('./_nimbus').createDraftOrder({
          orderId: order.orderId, payment: 'prepaid', total: order.total, shipping: order.shipping,
          lines: order.lines, customer: order.customer,
        }) || '';
      } catch (e) { /* ignore — confirmation still succeeds */ }
    }

    const record = {
      orderId: order.orderId, txnid, payment: 'prepaid', status: 'confirmed',
      lines: order.lines, subtotal: order.subtotal, discount: order.discount || 0, shipping: order.shipping,
      courier: order.courier || '', nimbusDraftId,
      couponCode: order.couponCode || '', couponDiscount: order.couponDiscount || 0,
      total: order.total, customer: order.customer, createdAt: new Date().toISOString(),
    };
    await lib.saveOrder(record);
    // Redeem the coupon now that payment succeeded — never fail the confirmation over this.
    if (record.couponCode) {
      try { await require('./_coupons').redeemCoupon(record.couponCode); } catch (e) { /* ignore */ }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(successPage(record));
  } catch (e) {
    res.status(500).send(page('Something went wrong', 'A server error occurred. Please try again in a bit.'));
  }
};
