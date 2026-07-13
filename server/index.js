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
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
let db = null;

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount)
    });
    db = getFirestore();
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
  }
} else {
  console.log('⚠️ serviceAccountKey.json not found. Firebase features will be disabled.');
}

// PayU credentials
const PAYU_MERCHANT_KEY = process.env.PAYU_MERCHANT_KEY || 'YOUR_MERCHANT_KEY';
const PAYU_SALT = process.env.PAYU_SALT || 'YOUR_SALT';

// Shiprocket credentials
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Shiprocket Token Cache
let shiprocketToken = null;
let tokenExpiry = null;

/**
 * Authenticate with Shiprocket and return token
 */
async function getShiprocketToken() {
  // Return cached token if valid
  if (shiprocketToken && tokenExpiry && new Date() < tokenExpiry) {
    return shiprocketToken;
  }
  
  if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
    throw new Error('Shiprocket credentials missing in .env');
  }

  try {
    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: SHIPROCKET_EMAIL,
      password: SHIPROCKET_PASSWORD
    });
    
    shiprocketToken = response.data.token;
    // Token is valid for 10 days, cache for 9 days
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 9);
    tokenExpiry = expiry;
    
    return shiprocketToken;
  } catch (error) {
    console.error('Shiprocket Auth Error:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Shiprocket');
  }
}

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
 * Create a new order in Shiprocket
 */
app.post('/api/orders/create', async (req, res) => {
  try {
    const { 
      order_id, date, billing_customer_name, billing_last_name, 
      billing_address, billing_city, billing_pincode, billing_state, 
      billing_country, billing_email, billing_phone, 
      order_items, sub_total, length, breadth, height, weight 
    } = req.body;

    const orderData = {
      order_id: order_id || `HST${Date.now()}`,
      order_date: date || new Date().toISOString().split('T')[0],
      pickup_location: "Primary",
      billing_customer_name,
      billing_last_name: billing_last_name || "",
      billing_address,
      billing_address_2: "",
      billing_city,
      billing_pincode,
      billing_state,
      billing_country: billing_country || "India",
      billing_email,
      billing_phone,
      shipping_is_billing: true,
      order_items,
      payment_method: "Prepaid",
      shipping_charges: 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: 0,
      sub_total,
      length: length || 10,
      breadth: breadth || 10,
      height: height || 5,
      weight: weight || 0.5
    };

    // 1. Save to Firebase First (So Admin Panel always sees the order)
    if (db) {
      try {
        await db.collection('orders').doc(orderData.order_id).set({
          ...orderData,
          created_at: FieldValue.serverTimestamp(),
          status: 'New'
        });
        console.log(`✅ Order ${orderData.order_id} saved to Firestore`);
      } catch (dbError) {
        console.error('⚠️ Failed to save order to Firestore:', dbError.message);
      }
    }

    // 2. Try pushing to Shiprocket
    try {
      const token = await getShiprocketToken();
      const response = await axios.post('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', orderData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Update Firebase with Shiprocket ID if successful
      if (db) {
        await db.collection('orders').doc(orderData.order_id).update({
          shiprocket_response: response.data,
          shiprocket_order_id: response.data.order_id
        });
      }
      return res.json({ success: true, shiprocket_order: response.data });
      
    } catch (srError) {
      console.error('Shiprocket order creation error:', srError.response?.data || srError.message);
      // Return success because the order is saved locally, but indicate Shiprocket failed
      return res.json({ 
        success: true, 
        warning: 'Order saved locally, but failed to push to Shiprocket (check credentials).',
        errorDetails: srError.response?.data || srError.message 
      });
    }
  } catch (error) {
    console.error('Order creation error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Calculate Shipping via Shiprocket Serviceability API
 */
app.get('/api/shipping/calculate', async (req, res) => {
  try {
    const { pincode, weight } = req.query;
    if (!pincode || pincode.length !== 6) {
      return res.status(400).json({ error: 'Valid 6-digit pincode is required' });
    }

    const token = await getShiprocketToken();
    const pickupPincode = process.env.PICKUP_PINCODE || '110001';
    
    // Fallback if weight is not provided or invalid
    const actualWeight = parseFloat(weight) > 0 ? parseFloat(weight) : 0.5;

    const response = await axios.get(`https://apiv2.shiprocket.in/v1/external/courier/serviceability/`, {
      params: {
        pickup_postcode: pickupPincode,
        delivery_postcode: pincode,
        weight: actualWeight,
        cod: 0 // Prepaid
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = response.data;
    if (data.status === 200 && data.data && data.data.available_courier_companies && data.data.available_courier_companies.length > 0) {
      // Find the most recommended or cheapest prepaid rate
      const couriers = data.data.available_courier_companies;
      
      // Sort by rate (cheapest first)
      couriers.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));
      
      const bestCourier = couriers[0];
      return res.json({
        available: true,
        rate: parseFloat(bestCourier.rate),
        courierName: bestCourier.courier_name,
        estimatedDays: bestCourier.etd,
        message: `Delivery by ${bestCourier.etd}`
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
app.post('/api/admin/products', upload.single('image'), async (req, res) => {
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
app.put('/api/admin/products/:id', upload.single('image'), async (req, res) => {
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
app.delete('/api/admin/products/:id', async (req, res) => {
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
app.get('/api/admin/orders', async (req, res) => {
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
app.get('/api/admin/payments', async (req, res) => {
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
app.get('/api/admin/stats', async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`🔒 Hastara Payment Server running on http://localhost:${PORT}`);
});

