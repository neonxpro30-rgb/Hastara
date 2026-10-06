// COD orders: POST {items, customer} -> validate, create order, save, confirm.
const lib = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).send(JSON.stringify({ ok: false })); return; }
    const body = lib.parseJsonBody(req);
    const catalog = lib.loadCatalog();
    const order = await lib.buildOrder(catalog, body.items, body.customer && body.customer.pincode, false, body.coupon, body.courier);
    if (order.error) { res.status(400).send(JSON.stringify({ ok: false, error: order.error })); return; }
    const vc = lib.validCustomer(body.customer);
    if (vc.error) { res.status(400).send(JSON.stringify({ ok: false, error: vc.error })); return; }
    // Stock: block overselling, then reserve the units.
    const sc = await lib.checkAndDecrementStock(order.lines);
    if (sc.error) { res.status(400).send(JSON.stringify({ ok: false, error: sc.error })); return; }

    const orderId = lib.orderId('HSRC');
    // Auto-create a PENDING draft in NimbusPost so it shows up in the
    // dashboard for review/booking. Best-effort: never fail the order over this.
    let nimbusDraftId = '';
    try {
      nimbusDraftId = await require('./_nimbus').createDraftOrder({
        orderId, payment: 'COD', total: order.total, shipping: order.shipping,
        lines: order.lines, customer: vc.customer,
      }) || '';
    } catch (e) { /* ignore — order still succeeds */ }
    const record = {
      orderId, payment: 'COD', status: 'confirmed',
      lines: order.lines, subtotal: order.subtotal, discount: order.discount, shipping: order.shipping,
      courier: order.courier || '', nimbusDraftId,
      couponCode: order.couponCode || '', couponDiscount: order.couponDiscount || 0,
      total: order.total, customer: vc.customer, createdAt: new Date().toISOString(),
    };
    const saved = await lib.saveOrder(record);
    // Redeem the coupon only once the order is accepted — never fail the order over this.
    if (order.couponCode) {
      try { await require('./_coupons').redeemCoupon(order.couponCode); } catch (e) { /* ignore */ }
    }
    // Order confirmation email — best-effort, never fail the order over this.
    try {
      const mail = require('./_mail');
      await mail.send(vc.customer.email, 'Order confirmed! Your jewels are being packed ✦ — ' + orderId,
        mail.orderEmail(Object.assign({}, record, { payment: 'COD' })));
    } catch (e) { /* ignore */ }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(JSON.stringify({ ok: true, orderId, total: order.total, saved }));
  } catch (e) {
    res.status(500).send(JSON.stringify({ ok: false, error: 'Server error. Please try again.' }));
  }
};
