// Public store settings: GET -> {ok, settings}.
// Defaults merged with the Firestore `settings/store` doc when present. No auth.
const DEFAULTS = {
  announcement_on: true,
  announcement_lines: [
    '✦ FESTIVE SALE',
    '✦ BUY 2 GET ₹100 OFF · 3+ GET ₹200 OFF',
    '✦ COD AVAILABLE',
    '✦ FREE SHIPPING OVER ₹499',
    '✦ 7-DAY EASY RETURNS',
    '✦ 12-MONTH ANTI-TARNISH WARRANTY',
  ],
  support_email: 'support@hastara.shop',
  whatsapp_number: '',
  instagram_handle: '',
};

module.exports = async (req, res) => {
  try {
    const s = Object.assign({}, DEFAULTS, { announcement_lines: DEFAULTS.announcement_lines.slice() });
    try {
      const fsdb = require('./_fs');
      const doc = await fsdb.docGet('settings', 'store');
      if (doc) {
        if (doc.announcement_on !== undefined) s.announcement_on = doc.announcement_on !== false;
        if (Array.isArray(doc.announcement_lines) && doc.announcement_lines.length)
          s.announcement_lines = doc.announcement_lines.map(String).filter(Boolean);
        if (doc.support_email) s.support_email = String(doc.support_email);
        if (doc.whatsapp_number) s.whatsapp_number = String(doc.whatsapp_number);
        if (doc.instagram_handle) s.instagram_handle = String(doc.instagram_handle);
      }
    } catch (e) { /* fall back to defaults */ }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(JSON.stringify({ ok: true, settings: s }));
  } catch (e) {
    res.status(500).send(JSON.stringify({ ok: false, error: 'server error' }));
  }
};
