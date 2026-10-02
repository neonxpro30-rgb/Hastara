// POST /api/admin/sign-upload {folder} -> Cloudinary signed upload params.
// Browser uploads directly to Cloudinary; secret never leaves the server.
const crypto = require('crypto');
const admin = require('../_admin');

module.exports = async (req, res) => {
  try {
    if (!admin.requireAuth(req, res)) return;
    if (req.method !== 'POST') { admin.json(res, 405, { ok: false }); return; }
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud || !apiKey || !secret) { admin.json(res, 500, { ok: false, error: 'cloudinary not configured' }); return; }
    const body = admin.parseBody(req);
    const folder = String(body.folder || 'hastara_products').replace(/[^a-zA-Z0-9_\/-]/g, '').slice(0, 60) || 'hastara_products';
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = 'folder=' + folder + '&timestamp=' + timestamp + secret;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');
    admin.json(res, 200, { ok: true, cloud_name: cloud, api_key: apiKey, timestamp, signature, folder });
  } catch (e) { admin.json(res, 500, { ok: false }); }
};
