// Public coupon quote: POST {code, subtotal} -> {ok:true, code, discount} | {ok:false, error}.
// No auth. Quoting only — redemption happens server-side after a successful order.
const { getCoupon, quoteCoupon } = require('./_coupons');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).send(JSON.stringify({ ok: false })); return; }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};
    const code = String(body.code || '').toUpperCase().trim();
    const subtotal = Number(body.subtotal) || 0;
    const c = await getCoupon(code);
    const q = quoteCoupon(c, subtotal, 0);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (!q.ok) { res.status(200).send(JSON.stringify({ ok: false, error: q.error })); return; }
    res.status(200).send(JSON.stringify({ ok: true, code, discount: q.discount }));
  } catch (e) {
    res.status(500).send(JSON.stringify({ ok: false, error: 'Server error. Please try again.' }));
  }
};
