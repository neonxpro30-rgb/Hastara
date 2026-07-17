import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import cors from 'cors';
import axios from 'axios';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5001;

// Initialize Firebase Admin SDK
// Supports both local file (dev) and environment variable (Vercel production)
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
let db = null;

try {
  let serviceAccount = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Running on Vercel — read from environment variable
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else if (fs.existsSync(serviceAccountPath)) {
    // Running locally — read from file
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  }

  if (serviceAccount) {
    initializeApp({ credential: cert(serviceAccount) });
    db = getFirestore();
    console.log('✅ Firebase Admin initialized successfully');
  } else {
    console.log('⚠️ Firebase credentials not found. Firebase features disabled.');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error.message);
}

// PayU credentials
const PAYU_MERCHANT_KEY = process.env.PAYU_MERCHANT_KEY || 'YOUR_MERCHANT_KEY';
const PAYU_SALT = process.env.PAYU_SALT || 'YOUR_SALT';

// NimbusPost API Key
const NIMBUSPOST_API_KEY = process.env.NIMBUSPOST_API_KEY;

// Allow all origins in production (Vercel), restrict in dev
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Admin password (set ADMIN_PASSWORD in .env file)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'hastara_admin_2024';

/**
 * Admin authentication middleware
 * Checks for a valid password in the Authorization header
 */
const adminAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or missing admin credentials.' });
  }
  next();
};

/**
 * Admin login endpoint — verifies password and returns a token
 */
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: ADMIN_PASSWORD });
  }
  return res.status(401).json({ success: false, error: 'Invalid password' });
});

// NimbusPost Token is used directly from env variable as an API Key
// We don't need a dynamic login token cache if we use API Keys.

/**
 * Generate PayU payment hash
 * Hash sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
 */
app.post('/api/payment/generate-hash', (req, res) => {
  try {
    const { txnid, amount, productinfo, firstname, email } = req.body;

    // Validate required fields
    if (!txnid || !amount || !productinfo || !firstname || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Sanitize inputs
    const sanitized = {
      txnid: String(txnid).replace(/[^a-zA-Z0-9]/g, ''),
      amount: parseFloat(amount).toFixed(2),
      productinfo: String(productinfo).slice(0, 255),
      firstname: String(firstname).replace(/[<>"'&]/g, '').slice(0, 100),
      email: String(email).toLowerCase().trim(),
    };

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate amount
    if (isNaN(parseFloat(sanitized.amount)) || parseFloat(sanitized.amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Generate hash
    const hashString = `${PAYU_MERCHANT_KEY}|${sanitized.txnid}|${sanitized.amount}|${sanitized.productinfo}|${sanitized.firstname}|${sanitized.email}|||||||||||${PAYU_SALT}`;

    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    return res.json({
      hash,
      key: PAYU_MERCHANT_KEY,
    });
  } catch (error) {
    console.error('Hash generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle PayU payment response (success/failure callback)
 */
app.post('/api/payment/response', async (req, res) => {
  try {
    const {
      mihpayid, status, txnid, amount, productinfo,
      firstname, email, hash: receivedHash,
    } = req.body;

    // Verify response hash (reverse hash)
    const reverseHashString = `${PAYU_SALT}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${PAYU_MERCHANT_KEY}`;
    const calculatedHash = crypto.createHash('sha512').update(reverseHashString).digest('hex');

    if (calculatedHash !== receivedHash) {
      console.error('Hash mismatch! Possible tampered transaction.');
      return res.redirect(`/?payment=failed&reason=hash_mismatch`);
    }

    if (status === 'success') {
      console.log(`Payment successful: ${mihpayid} for txn ${txnid}`);
      if (db) {
        try {
          await db.collection('payments').doc(txnid).set({
            mihpayid, status, txnid, amount, productinfo, firstname, email,
            created_at: FieldValue.serverTimestamp()
          });
        } catch (e) {
          console.error('Firebase payment save error:', e.message);
        }
      }
      return res.redirect(`/order-confirmation?txnid=${txnid}&status=success`);
    } else {
      console.log(`Payment failed: ${status} for txn ${txnid}`);
      return res.redirect(`/checkout?payment=failed&status=${status}`);
    }
  } catch (error) {
    console.error('Payment response error:', error);
    return res.redirect('/?payment=error');
  }
});

/**
 * Save payment record from frontend (for PayU Bolt and demo mode)
 * Since PayU Bolt processes payment in the browser, the webhook may not always fire.
 * This endpoint allows the frontend to save the payment record directly.
 */
app.post('/api/payment/save-record', async (req, res) => {
  try {
    const { txnid, amount, productinfo, firstname, email, phone, status } = req.body;
    if (!txnid || !amount) {
      return res.status(400).json({ error: 'txnid and amount are required' });
    }
    if (db) {
      await db.collection('payments').doc(txnid).set({
        txnid,
        amount,
        productinfo: productinfo || '',
        firstname: firstname || '',
        email: email || '',
        phone: phone || '',
        status: status || 'success',
        source: 'frontend',
        created_at: FieldValue.serverTimestamp(),
      });
      return res.json({ success: true });
    }
    return res.json({ success: false, warning: 'Firebase not initialized' });
  } catch (error) {
    console.error('Save payment record error:', error);
    return res.status(500).json({ error: 'Failed to save payment record' });
  }
});

/**
 * Create a new order in NimbusPost

 */
app.post('/api/orders/create', async (req, res) => {
  try {
    const { 
      order_id, date, billing_customer_name, billing_last_name, 
      billing_address, billing_city, billing_pincode, billing_state, 
      billing_country, billing_email, billing_phone, 
      order_items, sub_total, length, breadth, height, weight 
    } = req.body;

    const finalOrderId = order_id || `HST${Date.now()}`;

    // 1. Save to Firebase First (So Admin Panel always sees the order)
    if (db) {
      try {
        await db.collection('orders').doc(finalOrderId).set({
          order_id: finalOrderId,
          order_date: date || new Date().toISOString().split('T')[0],
          billing_customer_name,
          billing_last_name: billing_last_name || "",
          billing_address,
          billing_city,
          billing_pincode,
          billing_state,
          billing_country: billing_country || "India",
          billing_email,
          billing_phone,
          order_items,
          sub_total,
          weight: weight || 0.5,
          created_at: FieldValue.serverTimestamp(),
          status: 'New'
        });
        console.log(`✅ Order ${finalOrderId} saved to Firestore`);
      } catch (dbError) {
        console.error('⚠️ Failed to save order to Firestore:', dbError.message);
      }
    }

    // 2. Try pushing to NimbusPost
    try {
      if (!NIMBUSPOST_API_KEY) {
        throw new Error('NIMBUSPOST_API_KEY is not configured');
      }

      // Convert weight to grams as NimbusPost usually prefers grams (e.g., 0.5 kg = 500 gm)
      const weightInGrams = Math.max(500, (weight || 0.5) * 1000);

      const nimbusPayload = {
        "order_number": finalOrderId,
        "payment_type": "prepaid",
        "order_amount": sub_total,
        "package_weight": weightInGrams,
        "package_length": length || 10,
        "package_breadth": breadth || 10,
        "package_height": height || 5,
        "consignee": {
          "name": `${billing_customer_name} ${billing_last_name || ""}`.trim(),
          "address": billing_address,
          "city": billing_city,
          "state": billing_state,
          "pincode": billing_pincode,
          "phone": billing_phone,
          "email": billing_email
        },
        "pickup": {
          "warehouse_name": "Primary"
        },
        "order_items": order_items.map(item => ({
          "name": item.name,
          "qty": item.units || item.quantity || 1,
          "price": item.selling_price || item.price || 0,
          "sku": item.sku || `HST-${Date.now()}`
        }))
      };

      const response = await axios.post('https://api.nimbuspost.com/v1/shipments', nimbusPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NIMBUSPOST_API_KEY}`
        }
      });
      
      // Update Firebase with NimbusPost ID if successful
      if (db && response.data && response.data.status) {
        await db.collection('orders').doc(finalOrderId).update({
          nimbuspost_response: response.data,
          nimbuspost_order_id: response.data.data?.order_id || 'unknown'
        });
      }
      return res.json({ success: true, nimbuspost_order: response.data });
      
    } catch (npError) {
      console.error('NimbusPost order creation error:', npError.response?.data || npError.message);
      // Return success because the order is saved locally, but indicate NimbusPost failed
      return res.json({ 
        success: true, 
        warning: 'Order saved locally, but failed to push to NimbusPost (check API Key).',
        errorDetails: npError.response?.data || npError.message 
      });
    }
  } catch (error) {
    console.error('Order creation error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Calculate Shipping via NimbusPost Serviceability API (or Fallback)
 */
app.get('/api/shipping/calculate', async (req, res) => {
  try {
    const { pincode, weight } = req.query;
    if (!pincode || pincode.length !== 6) {
      return res.status(400).json({ error: 'Valid 6-digit pincode is required' });
    }

    const pickupPincode = process.env.PICKUP_PINCODE || '110001';
    
    // Fallback if weight is not provided or invalid
    const actualWeightInGrams = (parseFloat(weight) > 0 ? parseFloat(weight) : 0.5) * 1000;

    if (!NIMBUSPOST_API_KEY) {
      // Fallback rate if NimbusPost API key is missing
      return res.json({
        available: true,
        rate: 50,
        courierName: "Standard Shipping",
        estimatedDays: "3-5 days",
        message: `Delivery by standard shipping`
      });
    }

    const response = await axios.post(`https://api.nimbuspost.com/v1/courier/serviceability`, {
      origin: pickupPincode,
      destination: pincode,
      payment_type: "prepaid",
      weight: actualWeightInGrams
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NIMBUSPOST_API_KEY}`
      }
    });

    const data = response.data;
    if (data.status && data.data && data.data.length > 0) {
      // Find the most recommended or cheapest prepaid rate
      const couriers = data.data;
      
      // Sort by rate (cheapest first)
      couriers.sort((a, b) => parseFloat(a.freight_charges) - parseFloat(b.freight_charges));
      
      const bestCourier = couriers[0];
      return res.json({
        available: true,
        rate: parseFloat(bestCourier.freight_charges),
        courierName: bestCourier.courier_name,
        estimatedDays: "3-5 days", // NimbusPost etd format varies, safe fallback
        message: `Delivery by ${bestCourier.courier_name}`
      });
    } else {
      return res.json({ available: false, message: 'Delivery not available for this pincode.' });
    }
  } catch (error) {
    console.error('Shipping calculation error:', error.response?.data || error.message);
    // Return a graceful fallback rate or error
    return res.status(500).json({ error: 'Failed to calculate shipping', fallbackRate: 49 });
  }
});

// Cloudinary Configuration
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// Multer Setup for Memory Storage
const upload = multer({ storage: multer.memoryStorage() });

// ==================== PRODUCT ROUTES ====================

/**
 * Fetch all products from Firestore
 */
app.get('/api/products', async (req, res) => {
  try {
    if (!db) return res.json([]);
    const snapshot = await db.collection('products').orderBy('created_at', 'desc').get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * Get single product by ID
 */
app.get('/api/products/:id', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not initialized' });
    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Product not found' });
    return res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

/**
 * Upload product with image to Cloudinary and save to Firestore
 */
app.post('/api/admin/products', adminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase is not initialized.' });
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const { 
      name, price, originalPrice, description, shortDescription, 
      category, tags, material, weight, dimensions, inStock, 
      featured, bestSeller, packageWeight, packageLength, packageBreadth, packageHeight 
    } = req.body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'hastara_products', public_id: slug },
        (error, result) => error ? reject(error) : resolve(result)
      );
      stream.end(req.file.buffer);
    });

    const productData = {
      name,
      slug,
      price: parseFloat(price),
      originalPrice: parseFloat(originalPrice || price),
      description: description || '',
      shortDescription: shortDescription || '',
      category: category || 'all',
      tags: tags ? JSON.parse(tags) : [],
      material: material || '',
      weight: weight || '',
      dimensions: dimensions || '',
      inStock: inStock !== 'false',
      featured: featured === 'true',
      bestSeller: bestSeller === 'true',
      rating: 4.5,
      reviews: 0,
      image: uploadResult.secure_url,
      images: [uploadResult.secure_url],
      created_at: FieldValue.serverTimestamp(),
      packageWeight: parseFloat(packageWeight) || 0.5,
      packageLength: parseFloat(packageLength) || 10,
      packageBreadth: parseFloat(packageBreadth) || 10,
      packageHeight: parseFloat(packageHeight) || 5,
    };

    const docRef = await db.collection('products').add(productData);
    console.log(`✅ Product "${name}" added`);
    return res.json({ success: true, product: { id: docRef.id, ...productData } });
  } catch (error) {
    console.error('Product upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update product (with optional new image)
 */
app.put('/api/admin/products/:id', adminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase not initialized' });

    const { 
      name, price, originalPrice, description, shortDescription, 
      category, tags, material, weight, dimensions, inStock, 
      featured, bestSeller, packageWeight, packageLength, packageBreadth, packageHeight 
    } = req.body;
    
    const updateData = {};
    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (price) updateData.price = parseFloat(price);
    if (originalPrice) updateData.originalPrice = parseFloat(originalPrice);
    if (description !== undefined) updateData.description = description;
    if (shortDescription !== undefined) updateData.shortDescription = shortDescription;
    if (category) updateData.category = category;
    if (tags) updateData.tags = JSON.parse(tags);
    if (material !== undefined) updateData.material = material;
    if (weight !== undefined) updateData.weight = weight;
    if (dimensions !== undefined) updateData.dimensions = dimensions;
    if (inStock !== undefined) updateData.inStock = inStock !== 'false';
    if (featured !== undefined) updateData.featured = featured === 'true';
    if (bestSeller !== undefined) updateData.bestSeller = bestSeller === 'true';
    if (packageWeight) updateData.packageWeight = parseFloat(packageWeight);
    if (packageLength) updateData.packageLength = parseFloat(packageLength);
    if (packageBreadth) updateData.packageBreadth = parseFloat(packageBreadth);
    if (packageHeight) updateData.packageHeight = parseFloat(packageHeight);

    // Upload new image if provided
    if (req.file) {
      const slug = updateData.slug || req.params.id;
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'hastara_products', public_id: slug },
          (error, result) => error ? reject(error) : resolve(result)
        );
        stream.end(req.file.buffer);
      });
      updateData.image = uploadResult.secure_url;
      updateData.images = [uploadResult.secure_url];
    }

    updateData.updated_at = FieldValue.serverTimestamp();
    await db.collection('products').doc(req.params.id).update(updateData);
    console.log(`✅ Product ${req.params.id} updated`);
    return res.json({ success: true, message: 'Product updated' });
  } catch (error) {
    console.error('Product update error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * Delete product
 */
app.delete('/api/admin/products/:id', adminAuth, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase not initialized' });
    await db.collection('products').doc(req.params.id).delete();
    console.log(`🗑️ Product ${req.params.id} deleted`);
    return res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Product delete error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ==================== ORDER / DASHBOARD ROUTES ====================

/**
 * Get all orders
 */
app.get('/api/admin/orders', adminAuth, async (req, res) => {
  try {
    if (!db) return res.json([]);
    const snapshot = await db.collection('orders').orderBy('created_at', 'desc').get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * Get all payments
 */
app.get('/api/admin/payments', adminAuth, async (req, res) => {
  try {
    if (!db) return res.json([]);
    const snapshot = await db.collection('payments').orderBy('created_at', 'desc').get();
    const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

/**
 * Dashboard stats
 */
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    if (!db) return res.json({ totalProducts: 0, totalOrders: 0, totalRevenue: 0, totalPayments: 0 });

    const [productsSnap, ordersSnap, paymentsSnap] = await Promise.all([
      db.collection('products').get(),
      db.collection('orders').get(),
      db.collection('payments').get(),
    ]);

    let totalRevenue = 0;
    paymentsSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.status === 'success' && data.amount) {
        totalRevenue += parseFloat(data.amount);
      }
    });

    return res.json({
      totalProducts: productsSnap.size,
      totalOrders: ordersSnap.size,
      totalPayments: paymentsSnap.size,
      totalRevenue,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Keep the old upload-product route for backward compat
app.post('/api/admin/upload-product', upload.single('image'), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase is not initialized.' });
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const { name, price, description, category } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'hastara_products', public_id: slug },
        (error, result) => error ? reject(error) : resolve(result)
      );
      stream.end(req.file.buffer);
    });
    const productData = {
      name, slug,
      price: parseFloat(price),
      originalPrice: parseFloat(price),
      description: description || '',
      shortDescription: '',
      category: category || 'all',
      tags: [], material: '', weight: '', dimensions: '',
      inStock: true, featured: false, bestSeller: false,
      rating: 4.5, reviews: 0,
      image: uploadResult.secure_url,
      images: [uploadResult.secure_url],
      created_at: FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection('products').add(productData);
    return res.json({ success: true, product: { id: docRef.id, ...productData } });
  } catch (error) {
    console.error('Product upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server locally (skip if running in Vercel serverless environment)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🔒 Hastara Payment Server running on http://localhost:${PORT}`);
  });
}

// Export the Express app for Vercel
export default app;
