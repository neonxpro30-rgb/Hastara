export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number;
  description: string;
  shortDescription: string;
  image: string;
  images?: string[];
  category: string;
  tags: string[];
  rating: number;
  reviews: number;
  inStock: boolean;
  featured: boolean;
  bestSeller: boolean;
  material?: string;
  weight?: string;
  dimensions?: string;
  packageWeight?: number;
  packageLength?: number;
  packageBreadth?: number;
  packageHeight?: number;
}

export const products: Product[] = [
  {
    id: 'HST001',
    name: 'Lotus Pearl Chandbali',
    slug: 'lotus-pearl-chandbali',
    price: 349,
    originalPrice: 599,
    description: 'Exquisite oxidized silver chandbali earrings featuring a stunning lotus motif with a vibrant pink stone center. Adorned with delicate pearl clusters that dance with every movement, these statement pieces blend traditional Indian craftsmanship with contemporary elegance. The crescent moon (chand) shape with intricate lotus engravings makes them perfect for festive occasions, weddings, and ethnic wear styling.',
    shortDescription: 'Oxidized silver chandbali with lotus motif & pearl clusters',
    image: '/images/product-chandbali.png',
    images: ['/images/product-chandbali.png'],
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
    description: 'Stunning oxidized silver jhumka earrings featuring beautiful pink kundan stones on the stud with mint green bead cascades flowing from the traditional dome-shaped jhumka. The contrasting pastel tones of pink and mint create a refreshing modern twist on the classic jhumka design. Perfect for both casual outings and dressed-up occasions.',
    shortDescription: 'Pink stone jhumka with mint green bead drops',
    image: '/images/product-jhumka.png',
    images: ['/images/product-jhumka.png'],
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
    description: 'Elegant oxidized silver floral dangler earrings with a gorgeous pink tourmaline-inspired stone nestled within delicate silver flower petals. Three chains of lustrous pearls cascade gracefully below, creating a beautiful waterfall effect. These danglers are perfect for adding a touch of vintage charm to your everyday look or special occasions.',
    shortDescription: 'Silver floral earrings with pink stone & pearl chain drops',
    image: '/images/product-floral-danglers.png',
    images: ['/images/product-floral-danglers.png'],
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
    description: 'Petite and elegant oxidized silver kundan stud earrings featuring a brilliant pink stone center surrounded by a circle of tiny seed pearls. These versatile studs are perfect for everyday wear while maintaining that premium, handcrafted appeal. Lightweight and comfortable, they complement both western and ethnic outfits beautifully.',
    shortDescription: 'Pink kundan studs with pearl border — everyday elegance',
    image: '/images/product-kundan-studs.png',
    images: ['/images/product-kundan-studs.png'],
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
    description: 'Majestic oxidized silver chandbali earrings featuring an intricate peacock motif with emerald green stones and a pearl & green bead fringe. The peacock feather design inside the crescent is a masterpiece of Indian artistry. These statement earrings are perfect for weddings, festivities, and making a grand style statement.',
    shortDescription: 'Peacock motif chandbali with emerald stones & pearl fringe',
    image: '/images/product-peacock.png',
    images: ['/images/product-peacock.png'],
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
    description: 'A compact and charming oxidized silver jhumka with a beautiful lotus petal stud top and an intricately carved dome. Tiny pearl drops line the bottom edge, adding delicate movement and grace. Perfect for those who love the jhumka silhouette but prefer a more subtle, wearable size for daily wear.',
    shortDescription: 'Compact lotus design jhumka with pearl drops',
    image: '/images/product-mini-lotus.png',
    images: ['/images/product-mini-lotus.png'],
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
    description: 'Bold and beautiful oxidized silver tribal hoop earrings with intricate geometric patterns inspired by ancient Indian tribal art. The antique finish and substantial size make these hoops a true statement piece. Lightweight despite their bold appearance, they are perfect for boho-chic styling and fusion looks.',
    shortDescription: 'Large oxidized hoops with geometric tribal patterns',
    image: '/images/product-tribal-hoops.png',
    images: ['/images/product-tribal-hoops.png'],
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
    description: 'Graceful and romantic pearl cascade drop earrings featuring multiple tiers of lustrous pearls on oxidized silver chains, flowing from a delicate floral stud top. The waterfall silhouette creates elegant movement and catches the light beautifully. These earrings are perfect for receptions, date nights, and any occasion that calls for understated luxury.',
    shortDescription: 'Multi-tier cascading pearl drops with floral stud',
    image: '/images/product-pearl-cascade.png',
    images: ['/images/product-pearl-cascade.png'],
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

export const categories = [
  { id: 'all', name: 'All', icon: '✨' },
  { id: 'chandbali', name: 'Chandbali', icon: '🌙' },
  { id: 'jhumka', name: 'Jhumka', icon: '🔔' },
  { id: 'danglers', name: 'Danglers', icon: '💎' },
  { id: 'studs', name: 'Studs', icon: '⭐' },
  { id: 'hoops', name: 'Hoops', icon: '⭕' },
  { id: 'drops', name: 'Drops', icon: '💧' },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getProductsByCategory(category: string): Product[] {
  if (category === 'all') return products;
  return products.filter((p) => p.category === category);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.featured);
}

export function getBestSellers(): Product[] {
  return products.filter((p) => p.bestSeller);
}
