/**
 * Migration Script: Upload existing product images to Cloudinary 
 * and save product data to Firebase Firestore
 */
import 'dotenv/config';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Init Firebase
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Init Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const products = [
  {
    id: 'HST001',
    name: 'Lotus Pearl Chandbali',
    slug: 'lotus-pearl-chandbali',
    price: 349,
    originalPrice: 599,
    description: 'Exquisite oxidized silver chandbali earrings featuring a stunning lotus motif with a vibrant pink stone center. Adorned with delicate pearl clusters that dance with every movement, these statement pieces blend traditional Indian craftsmanship with contemporary elegance.',
    shortDescription: 'Oxidized silver chandbali with lotus motif & pearl clusters',
    localImage: 'product-chandbali.png',
    category: 'chandbali',
    tags: ['Bestseller', 'Festive'],
    inStock: true,
    rating: 4.8,
    reviews: 234,
    featured: true,
    bestSeller: true,
    material: 'Oxidized Silver Alloy, Faux Pearls, Pink Stone',
    weight: '18g (pair)',
    dimensions: '7.5 cm × 4 cm',
  },
  {
    id: 'HST002',
    name: 'Rose Quartz Jhumka',
    slug: 'rose-quartz-jhumka',
    price: 399,
    originalPrice: 699,
    description: 'Stunning oxidized silver jhumka earrings featuring beautiful pink kundan stones on the stud with mint green bead cascades flowing from the traditional dome-shaped jhumka.',
    shortDescription: 'Pink stone jhumka with mint green bead drops',
    localImage: 'product-jhumka.png',
    category: 'jhumka',
    tags: ['Trending', 'Party Wear'],
    inStock: true,
    rating: 4.7,
    reviews: 189,
    featured: true,
    bestSeller: true,
    material: 'Oxidized Silver Alloy, Kundan Stone, Glass Beads',
    weight: '22g (pair)',
    dimensions: '8 cm × 3.5 cm',
  },
  {
    id: 'HST003',
    name: 'Floral Pearl Danglers',
    slug: 'floral-pearl-danglers',
    price: 329,
    originalPrice: 549,
    description: 'Elegant oxidized silver floral dangler earrings with a gorgeous pink tourmaline-inspired stone nestled within delicate silver flower petals.',
    shortDescription: 'Silver floral earrings with pink stone & pearl chain drops',
    localImage: 'product-floral-danglers.png',
    category: 'danglers',
    tags: ['New Arrival', 'Daily Wear'],
    inStock: true,
    rating: 4.6,
    reviews: 156,
    featured: true,
    bestSeller: false,
    material: 'Oxidized Silver Alloy, Pink Stone, Faux Pearls',
    weight: '14g (pair)',
    dimensions: '6.5 cm × 2.5 cm',
  },
  {
    id: 'HST004',
    name: 'Royal Kundan Studs',
    slug: 'royal-kundan-studs',
    price: 199,
    originalPrice: 349,
    description: 'Petite and elegant oxidized silver kundan stud earrings featuring a brilliant pink stone center surrounded by a circle of tiny seed pearls.',
    shortDescription: 'Pink kundan studs with pearl border — everyday elegance',
    localImage: 'product-kundan-studs.png',
    category: 'studs',
    tags: ['Daily Wear', 'Lightweight'],
    inStock: true,
    rating: 4.9,
    reviews: 312,
    featured: false,
    bestSeller: true,
    material: 'Oxidized Silver Alloy, Kundan, Seed Pearls',
    weight: '6g (pair)',
    dimensions: '1.8 cm × 1.8 cm',
  },
  {
    id: 'HST005',
    name: 'Peacock Emerald Chandbali',
    slug: 'peacock-emerald-chandbali',
    price: 449,
    originalPrice: 799,
    description: 'Majestic oxidized silver chandbali earrings featuring an intricate peacock motif with emerald green stones and a pearl & green bead fringe.',
    shortDescription: 'Peacock motif chandbali with emerald stones & pearl fringe',
    localImage: 'product-peacock.png',
    category: 'chandbali',
    tags: ['Premium', 'Wedding'],
    inStock: true,
    rating: 4.9,
    reviews: 198,
    featured: true,
    bestSeller: true,
    material: 'Oxidized Silver Alloy, Green Stones, Faux Pearls',
    weight: '24g (pair)',
    dimensions: '8.5 cm × 5 cm',
  },
  {
    id: 'HST006',
    name: 'Mini Lotus Jhumka',
    slug: 'mini-lotus-jhumka',
    price: 279,
    originalPrice: 449,
    description: 'A compact and charming oxidized silver jhumka with a beautiful lotus petal stud top and an intricately carved dome.',
    shortDescription: 'Compact lotus design jhumka with pearl drops',
    localImage: 'product-mini-lotus.png',
    category: 'jhumka',
    tags: ['Daily Wear', 'Compact'],
    inStock: true,
    rating: 4.5,
    reviews: 143,
    featured: false,
    bestSeller: false,
    material: 'Oxidized Silver Alloy, Faux Pearls',
    weight: '12g (pair)',
    dimensions: '5 cm × 2.5 cm',
  },
  {
    id: 'HST007',
    name: 'Statement Tribal Hoops',
    slug: 'statement-tribal-hoops',
    price: 369,
    originalPrice: 599,
    description: 'Bold and beautiful oxidized silver tribal hoop earrings with intricate geometric patterns inspired by ancient Indian tribal art.',
    shortDescription: 'Large oxidized hoops with geometric tribal patterns',
    localImage: 'product-tribal-hoops.png',
    category: 'hoops',
    tags: ['Boho', 'Statement'],
    inStock: true,
    rating: 4.6,
    reviews: 167,
    featured: false,
    bestSeller: false,
    material: 'Oxidized Silver Alloy',
    weight: '16g (pair)',
    dimensions: '5.5 cm × 5.5 cm',
  },
  {
    id: 'HST008',
    name: 'Pearl Cascade Drops',
    slug: 'pearl-cascade-drops',
    price: 299,
    originalPrice: 499,
    description: 'Graceful and romantic pearl cascade drop earrings featuring multiple tiers of lustrous pearls on oxidized silver chains.',
    shortDescription: 'Multi-tier cascading pearl drops with floral stud',
    localImage: 'product-pearl-cascade.png',
    category: 'drops',
    tags: ['Elegant', 'Party Wear'],
    inStock: true,
    rating: 4.7,
    reviews: 201,
    featured: true,
    bestSeller: false,
    material: 'Oxidized Silver Alloy, Faux Pearls',
    weight: '15g (pair)',
    dimensions: '9 cm × 3 cm',
  },
];

async function migrate() {
  console.log('🚀 Starting migration...\n');

  for (const product of products) {
    const imagePath = path.join(__dirname, '..', 'public', 'images', product.localImage);

    try {
      // Upload to Cloudinary
      console.log(`📸 Uploading ${product.name} image to Cloudinary...`);
      const result = await cloudinary.uploader.upload(imagePath, {
        folder: 'hastara_products',
        public_id: product.slug,
      });
      console.log(`   ✅ Uploaded: ${result.secure_url}`);

      // Save to Firestore
      const { localImage, ...productData } = product;
      await db.collection('products').doc(product.id).set({
        ...productData,
        image: result.secure_url,
        images: [result.secure_url],
        created_at: FieldValue.serverTimestamp(),
      });
      console.log(`   ✅ Saved ${product.name} to Firestore\n`);
    } catch (error) {
      console.error(`   ❌ Failed for ${product.name}:`, error.message, '\n');
    }
  }

  console.log('🎉 Migration complete!');
  process.exit(0);
}

migrate();
