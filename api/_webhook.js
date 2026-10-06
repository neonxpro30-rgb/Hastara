// NimbusPost shipment webhook -> auto-sync order status + shipping email with AWB.
// NimbusPost dashboard -> Settings -> Webhooks: register
//   https://www.hastara.shop/api/nimbus-webhook?key=YOUR_WEBHOOK_SECRET
// Set NIMBUS_WEBHOOK_SECRET in Vercel env to the same value.
// The handler is defensive about payload shape: it tries common field names
// for order id, AWB, status and courier. Unknown payloads are logged, never crash.

const lib = require('./_lib');
const fsdb = require('./_fs');

function pick(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return '';
}

function parseBody(req) {
  let b = req.body;
  if (typeof b === 'string') {
    try { b = JSON.parse(b); } catch (e) {
      try {
        const p = new URLSearchParams(b); b = {};
        for (const [k, v] of p) b[k] = v;
      } catch (e2) { b = {}; }
    }
  }
  return b || {};
}

// NimbusPost status text -> Hastara admin status (or '' to leave unchanged).
function mapStatus(raw) {
  const s = String(raw || '').toLowerCase().replace(/[_\s]+/g, ' ').trim();
  if (/deliver/.test(s) && !/out for/.test(s) && !/reached|attempt/.test(s)) {
    if (/^delivered$|delivered successfully|shipment delivered/.test(s)) return 'delivered';
  }
  if (/rto|return to origin|returned to seller/.test(s)) return 'rto_flag';
  if (/out for delivery/.test(s)) return 'shipped';
  if (/shipped|in transit|dispatched|picked up|reached.*hub|in transit/.test(s)) return 'shipped';
  if (/booked|manifested|pending pickup/.test(s)) return 'packed';
  return '';
}

async function handleNimbusWebhook(req, res) {
  try {
    if (req.method !== 'POST') { res.status(405).send(JSON.stringify({ ok: false })); return; }
    // Shared-secret auth via query param.
    const secret = process.env.NIMBUS_WEBHOOK_SECRET || '';
    let key = '';
    try { key = new URL(req.url || '', 'http://x').searchParams.get('key') || ''; } catch (e) {}
    if (secret && key !== secret) { res.status(401).send(JSON.stringify({ ok: false })); return; }

    const body = parseBody(req);
    const data = body.data || body.shipment || body.order || body;

    const orderId = String(pick(data, ['order_id', 'orderId', 'orderid', 'reference_id', 'client_order_id']) || '').trim();
    const awb = String(pick(data, ['awb', 'awb_number', 'awbNumber', 'tracking_id', 'trackingId', 'lrnum']) || '').trim();
    const rawStatus = String(pick(data, ['status', 'shipment_status', 'current_status', 'event']) || '').trim();
    const courier = String(pick(data, ['courier', 'courier_name', 'courierName', 'carrier']) || '').trim();

    if (!orderId) { res.status(200).send(JSON.stringify({ ok: true, note: 'no order id' })); return; }

    const cur = await fsdb.docGet('orders', orderId);
    if (!cur) { res.status(200).send(JSON.stringify({ ok: true, note: 'order not found' })); return; }

    const mapped = mapStatus(rawStatus);
    const upd = Object.assign({}, cur);
    delete upd._id;
    upd.nimbusStatus = rawStatus;
    upd.nimbusUpdatedAt = new Date().toISOString();
    if (awb) upd.awb = awb;
    if (courier) upd.courier = courier;
    if (awb) upd.trackUrl = 'https://track.nimbuspost.com/' + encodeURIComponent(awb);

    let emailSent = false;
    if (mapped === 'shipped' && cur.status !== 'shipped' && cur.status !== 'delivered') {
      upd.status = 'shipped';
      // Shipping email with tracking ID — once per order.
      if (!cur.shipEmailSent && awb) {
        try {
          const mail = require('./_mail');
          const ok = await mail.send(cur.customer && cur.customer.email,
            'Your Hastara order is on its way! 📦 — ' + orderId,
            mail.shipEmail(Object.assign({}, upd, { payment: cur.payment })));
          if (ok) { upd.shipEmailSent = true; emailSent = true; }
        } catch (e) { /* ignore */ }
      }
    } else if (mapped === 'delivered') {
      upd.status = 'delivered';
    } else if (mapped === 'packed' && cur.status === 'confirmed') {
      upd.status = 'packed';
    } else if (mapped === 'rto_flag') {
      upd.rtoFlag = true; // product coming back; admin reviews manually
    }

    await fsdb.docSet('orders', orderId, upd);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(JSON.stringify({ ok: true, orderId, status: upd.status || cur.status, emailSent }));
  } catch (e) {
    res.status(200).send(JSON.stringify({ ok: true, note: 'error ignored' }));
  }
}

module.exports = { handleNimbusWebhook };
