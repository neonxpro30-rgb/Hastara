// POST {pincode, paymentMode ('cod'|'prepaid'), subtotal?} ->
// {ok, live, cost, etaDays, courier} — live NimbusPost rate, or flat fallback.
const lib = require('./_lib');
const nimbus = require('./_nimbus');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    if (req.method !== 'POST') {
      res.status(405).send(JSON.stringify({ ok: false }));
      return;
    }
    const body = lib.parseJsonBody(req);
    const pincode = String(body.pincode || '').replace(/\D/g, '').slice(0, 6);
    const paymentMode = body.paymentMode === 'prepaid' ? 'prepaid' : 'cod';
    const subtotal = Math.max(0, parseFloat(body.subtotal) || 0);

    if (!/^\d{6}$/.test(pincode)) {
      res.status(400).send(JSON.stringify({ ok: false, error: 'Invalid pincode.' }));
      return;
    }

    // FREE shipping over ₹499 stays (store absorbs the courier cost).
    if (subtotal >= 499) {
      res.status(200).send(JSON.stringify({ ok: true, live: false, cost: 0, etaDays: null, courier: '' }));
      return;
    }

    const live = await nimbus.getRate(pincode, paymentMode, subtotal);
    if (live && live.cost > 0) {
      res.status(200).send(JSON.stringify({
        ok: true, live: true, cost: live.cost, etaDays: live.etaDays, courier: live.courier,
      }));
      return;
    }

    // Fallback: old flat-rate table.
    const metro = /^(11|40|41|38|56|60|70|50)/.test(pincode);
    res.status(200).send(JSON.stringify({
      ok: true, live: false, cost: metro ? 49 : 69,
      etaDays: null, courier: '',
    }));
  } catch (e) {
    res.status(500).send(JSON.stringify({ ok: false, error: 'Server error.' }));
  }
};
