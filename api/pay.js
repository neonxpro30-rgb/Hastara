// POST {items, customer} -> validates, computes server-side total, then
// auto-submits a PayU hosted-checkout form. GET shows a small notice.
const crypto = require('crypto');
const lib = require('./_lib');

const PAYU_KEY = process.env.PAYU_KEY || process.env.PAYU_MERCHANT_KEY;
const PAYU_SALT = process.env.PAYU_SALT;
const PAYU_URL = 'https://secure.payu.in/_payment';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function baseUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'hastara.shop';
  return 'https://' + host;
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      res.status(200).send('Hastara checkout — please order from the store page.');
      return;
    }
    if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }
    if (!PAYU_KEY || !PAYU_SALT) { res.status(500).send('Payments are not configured yet.'); return; }

    const body = lib.parseJsonBody(req);
    const catalog = lib.loadCatalog();
    const order = lib.buildOrder(catalog, body.items, body.customer && body.customer.pincode);
    if (order.error) { res.status(400).send(order.error); return; }
    const vc = lib.validCustomer(body.customer);
    if (vc.error) { res.status(400).send(vc.error); return; }

    const orderId = lib.orderId('HSR');
    const txnid = orderId;
    const amount = order.total.toFixed(2);
    const productinfo = 'Hastara jewellery order ' + orderId;
    // Stash the order in udf1 so /api/verify can rebuild it after payment.
    const udf1 = Buffer.from(JSON.stringify({
      orderId, lines: order.lines, subtotal: order.subtotal, discount: order.discount,
      shipping: order.shipping, total: order.total, customer: vc.customer,
    })).toString('base64');

    const hashStr = [PAYU_KEY, txnid, amount, productinfo, vc.customer.firstname,
      vc.customer.email, udf1, '', '', '', '', '', '', '', '', '', PAYU_SALT].join('|');
    const hash = crypto.createHash('sha512').update(hashStr).digest('hex');

    const surl = baseUrl(req) + '/api/verify';
    const fields = {
      key: PAYU_KEY, txnid, amount, productinfo,
      firstname: vc.customer.firstname, email: vc.customer.email, phone: vc.customer.phone,
      udf1, surl, furl: surl, hash,
    };
    const inputs = Object.keys(fields).map((k) =>
      '<input type="hidden" name="' + k + '" value="' + esc(fields[k]) + '">').join('');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send('<!doctype html><html><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>Taking you to PayU…</title>'
      + '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;'
      + 'background:#fff7f5;color:#7a2d2d;font-family:system-ui,sans-serif}</style></head>'
      + '<body><p>Taking you to PayU\'s secure payment page…</p>'
      + '<form id="payu" action="' + PAYU_URL + '" method="post">' + inputs + '</form>'
      + '<script>document.getElementById("payu").submit();</script></body></html>');
  } catch (e) {
    res.status(500).send('Server error. Please try again in a bit.');
  }
};
