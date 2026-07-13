import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import type { Product } from '../data/products';
import ProductCard from '../components/ProductCard';
import './ProductDetailPage.css';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart, openCart } = useCart();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch('/api/products')
      .then(res => res.json())
      .then((products: Product[]) => {
        const found = products.find(p => p.slug === slug);
        setProduct(found || null);
        if (found) {
          setRelatedProducts(
            products.filter(p => p.category === found.category && p.id !== found.id).slice(0, 4)
          );
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch product:', err);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <main className="pdp-not-found container">
        <div className="pdp-not-found__content">
          <span className="pdp-not-found__icon">⏳</span>
          <h1>Loading...</h1>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="pdp-not-found container">
        <div className="pdp-not-found__content">
          <span className="pdp-not-found__icon">😢</span>
          <h1>Product Not Found</h1>
          <p>The earring you're looking for doesn't exist.</p>
          <Link to="/products" className="btn btn-primary">
            Browse All Earrings
          </Link>
        </div>
      </main>
    );
  }

  const discount = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  const handleAddToCart = () => {
    addToCart(product);
    showToast(`${product.name} added to cart! 🛍️`);
    openCart();
  };

  const handleBuyNow = () => {
    addToCart(product);
    navigate('/checkout');
  };

  return (
    <main className="pdp" id="product-detail-page">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="pdp__breadcrumb" aria-label="Breadcrumb" id="pdp-breadcrumb">
          <Link to="/">Home</Link>
          <span className="pdp__breadcrumb-sep">/</span>
          <Link to="/products">Shop</Link>
          <span className="pdp__breadcrumb-sep">/</span>
          <Link to={`/products?category=${product.category}`}>{product.category}</Link>
          <span className="pdp__breadcrumb-sep">/</span>
          <span className="pdp__breadcrumb-current">{product.name}</span>
        </nav>

        {/* Product Layout */}
        <div className="pdp__layout">
          {/* Image Gallery */}
          <div className="pdp__gallery animate-fade-in">
            <div className="pdp__image-main">
              <img
                src={product.image}
                alt={product.name}
                className="pdp__image"
                fetchPriority="high"
                width="600"
                height="600"
              />
              {/* Badges */}
              <div className="pdp__badges">
                {discount > 0 && (
                  <span className="pdp__badge pdp__badge--discount">-{discount}% OFF</span>
                )}
                {product.tags.map((tag) => (
                  <span className="pdp__badge pdp__badge--tag" key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="pdp__info animate-fade-in-up">
            <div className="pdp__info-top">
              <span className="pdp__category">{product.category}</span>
              <div className="pdp__rating-full">
                <span className="pdp__stars">
                  {'★'.repeat(Math.round(product.rating))}
                  {'☆'.repeat(5 - Math.round(product.rating))}
                </span>
                <span className="pdp__rating-text">
                  {product.rating} ({product.reviews} reviews)
                </span>
              </div>
            </div>

            <h1 className="pdp__title display-text">{product.name}</h1>

            {/* Pricing */}
            <div className="pdp__pricing">
              <span className="pdp__price price">₹{product.price}</span>
              <span className="pdp__original-price price-original">₹{product.originalPrice}</span>
              {discount > 0 && (
                <span className="pdp__discount-badge tag">Save ₹{product.originalPrice - product.price}</span>
              )}
            </div>

            <p className="pdp__tax-note">Inclusive of all taxes</p>

            {/* Description */}
            <div className="pdp__description">
              <p>{product.description}</p>
            </div>

            {/* Product Details */}
            <div className="pdp__details">
              <h3 className="pdp__details-title">Product Details</h3>
              <div className="pdp__details-grid">
                <div className="pdp__detail-item">
                  <span className="pdp__detail-label">Material</span>
                  <span className="pdp__detail-value">{product.material}</span>
                </div>
                <div className="pdp__detail-item">
                  <span className="pdp__detail-label">Weight</span>
                  <span className="pdp__detail-value">{product.weight}</span>
                </div>
                <div className="pdp__detail-item">
                  <span className="pdp__detail-label">Dimensions</span>
                  <span className="pdp__detail-value">{product.dimensions}</span>
                </div>
                <div className="pdp__detail-item">
                  <span className="pdp__detail-label">SKU</span>
                  <span className="pdp__detail-value">{product.id}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pdp__actions">
              <button
                className="btn btn-primary btn-lg pdp__add-btn"
                onClick={handleAddToCart}
                disabled={!product.inStock}
                id="pdp-add-to-cart"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                {product.inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
              <button
                className="btn btn-secondary btn-lg pdp__buy-btn"
                onClick={handleBuyNow}
                disabled={!product.inStock}
                id="pdp-buy-now"
              >
                Buy Now
              </button>
            </div>

            {/* Trust Signals */}
            <div className="pdp__trust">
              <div className="pdp__trust-item">
                <span>🚚</span>
                <span>Free shipping above ₹499</span>
              </div>
              <div className="pdp__trust-item">
                <span>🔄</span>
                <span>7-day easy returns</span>
              </div>
              <div className="pdp__trust-item">
                <span>🔒</span>
                <span>Secure payments via PayU</span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="pdp__related section">
            <div className="section-header">
              <span className="section-header__label">You may also like</span>
              <h2 className="section-header__title display-text">
                Similar <span className="text-gradient">Earrings</span>
              </h2>
            </div>
            <div className="product-grid stagger">
              {relatedProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
