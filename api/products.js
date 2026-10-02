// Public product catalog for the Hastara storefront.
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const p = path.join(process.cwd(), 'products.json');
    const all = JSON.parse(fs.readFileSync(p, 'utf8')).products || [];
    const products = all.filter((x) => x && x.active);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(200).send(JSON.stringify({ products }));
  } catch (e) {
    res.status(500).send(JSON.stringify({ products: [], error: 'catalog unavailable' }));
  }
};
