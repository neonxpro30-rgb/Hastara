// COD orders: POST {items, customer} -> validate, create order, save, confirm.
const lib = require('./_lib');
const nimbus = require('./nimbus');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).send(JSON.stringify({ ok: false })); return; }
    const body = lib.parseJsonBody(req);
    const catalog = lib.loadCatalog();
    const order = await lib.buildOrderLive(catalog, body.items, body.customer && body.customer.pincode, false);
    if (order.error) { res.status(400).send(JSON.stringify({ ok: false, error: order.error })); return; }
    const vc = lib.validCustomer(body.customer);
    if (vc.error) { res.status(400).send(JSON.stringify({ ok: false, error: vc.error })); return; }

    const orderId = lib.orderId('HSRC');
    const record = {
      orderId, payment: 'COD', status: 'confirmed',
      lines: order.lines, subtotal: order.subtotal, discount: order.discount, shipping: order.shipping,
      total: order.total, customer: vc.customer, createdAt: new Date().toISOString(),
    };
    const saved = await lib.saveOrder(record);

    // Push to NimbusPost as a PENDING draft (free, no AWB yet). Never fails the order.
    try {
      const nimbusOrderId = await nimbus.createDraftOrder({
        orderId, payment: 'COD', total: order.total, lines: order.lines, customer: vc.customer,
      });
      if (nimbusOrderId) record.nimbusOrderId = nimbusOrderId;
    } catch (e) { /* ignore */ }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(JSON.stringify({ ok: true, orderId, total: order.total, saved }));
  } catch (e) {
    res.status(500).send(JSON.stringify({ ok: false, error: 'Server error. Please try again.' }));
  }
};
