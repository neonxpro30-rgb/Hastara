// POST {pincode, paymentMode ('cod'|'prepaid'), subtotal?} ->
// {ok, live, options:[{courier, cost, etaDays}]} — live NimbusPost courier choices,
// cheapest-first. `cost/courier/etaDays` of the cheapest are also top-level for
// backward compat. Falls back to a single flat-rate option when NimbusPost is down.
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

    // FREE shipping over ₹499 stays (store absorbs the courier cost, store picks courier).
    if (subtotal >= 499) {
      res.status(200).send(JSON.stringify({ ok: true, live: false, options: [], cost: 0, etaDays: null, courier: '' }));
      return;
    }

    const live = await nimbus.getRates(pincode, paymentMode, subtotal, 4);
    if (live && live.length) {
      res.status(200).send(JSON.stringify({
        ok: true, live: true, options: live,
        cost: live[0].cost, etaDays: live[0].etaDays, courier: live[0].courier,
      }));
      return;
    }

    // Fallback: old flat-rate table as a single non-live option.
    const metro = /^(11|40|41|38|56|60|70|50)/.test(pincode);
    const flat = metro ? 49 : 69;
    res.status(200).send(JSON.stringify({
      ok: true, live: false,
      options: [{ courier: '', cost: flat, etaDays: null }],
      cost: flat, etaDays: null, courier: '',
    }));
  } catch (e) {
    res.status(500).send(JSON.stringify({ ok: false, error: 'Server error.' }));
  }
};
