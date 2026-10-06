// TEMPORARY test endpoint — sends a sample order-confirmation email.
// Delete after use. Not counted as a permanent route.
const mail = require('./_mail');

module.exports = async (req, res) => {
  const to = (req.query && req.query.to) || 'neonxpro30@gmail.com';
  const sample = {
    orderId: 'HSR-TEST-001',
    payment: 'cod',
    subtotal: 548,
    discount: 100,
    couponDiscount: 0,
    couponCode: '',
    perk: 0,
    shipping: 0,
    total: 448,
    customer: {
      firstname: 'Naksh',
      phone: '9999999999',
      address: 'Test Street 123',
      city: 'Gurgaon',
      state: 'Haryana',
      pincode: '122001',
      email: to,
    },
    lines: [
      { name: 'Butterfly Studs', qty: 1, price: 299, image: 'https://www.hastara.shop/assets/butterfly-1.jpg' },
      { name: 'Tups', qty: 1, price: 249, image: 'https://www.hastara.shop/assets/tups-1.jpg' },
    ],
  };
  const html = mail.orderEmail(sample);
  const ok = await mail.send(to, '✦ Hastara — Order HSR-TEST-001 confirmed!', html);
  res.status(200).json({ sent: ok, to });
};
