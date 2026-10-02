// Public product catalog for the Hastara storefront.
// Reads Firestore `products` first (admin-editable); falls back to products.json.
const fs = require('fs');
const path = require('path');

function fromFile() {
  try {
    const p = path.join(process.cwd(), 'products.json');
    return (JSON.parse(fs.readFileSync(p, 'utf8')).products || []).filter((x) => x && x.active);
  } catch (e) { return []; }
}

module.exports = async (req, res) => {
  try {
    let products = [];
    try {
      const fsdb = require('./_fs');
      const docs = await fsdb.colList('products', 100);
      products = docs.filter((x) => x && x.active !== false && x.id);
    } catch (e) { products = []; }
    if (!products.length) products = fromFile();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(200).send(JSON.stringify({ products }));
  } catch (e) {
    res.status(500).send(JSON.stringify({ products: [], error: 'catalog unavailable' }));
  }
};
