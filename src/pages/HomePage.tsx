import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import type { Product } from '../data/products';
import './HomePage.css';

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then((products: Product[]) => {
        const feat = products.filter(p => p.featured);
        const best = products.filter(p => p.bestSeller);
        setFeatured(feat.length > 0 ? feat : products.slice(0, 4));
        setBestSellers(best.length > 0 ? best : products.slice(0, 4));
      })
      .catch(err => console.error('Failed to fetch products:', err));
  }, []);

  return (
    <main className="home" id="home-page">
      {/* Hero Section */}
      <section className="hero" id="hero-section">
        <div className="hero__bg">
          <img
            src="/images/hero-bg-new.jpg"
            alt="Hastara — Premium Indian Earrings Collection"
            className="hero__bg-image"
            fetchPriority="high"
            width="1920"
            height="1080"
          />
          <div className="hero__bg-overlay" />
        </div>
        <div className="hero__content container">
          <div className="hero__text animate-fade-in-up">
            <span className="hero__badge">✦ The Festive &amp; Statement Edit</span>
            <h1 className="hero__title display-text">
              Adorn Your <br />
              <span className="text-gradient">Elegance</span>
            </h1>
            <p className="hero__subtitle">
              Discover curated Indian earrings designed to blend timeless grace
              with contemporary style. Lightweight, skin-friendly, and crafted
              to shine on every occasion.
            </p>
            <div className="hero__actions">
              <Link to="/products" className="btn btn-hero btn-lg" id="hero-shop-btn">
                Shop Collection
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
        {/* Scroll indicator */}
        <div className="hero__scroll-indicator">
          <div className="hero__scroll-line" />
        </div>
      </section>

      {/* Trust Strip */}
      <section className="trust-strip" id="trust-strip">
        <div className="trust-strip__inner container">
          <div className="trust-strip__item">
            <span className="trust-strip__icon">🌿</span>
            <span className="trust-strip__text">Skin-Friendly Alloys</span>
          </div>
          <div className="trust-strip__divider" />
          <div className="trust-strip__item">
            <span className="trust-strip__icon">🚚</span>
            <span className="trust-strip__text">Free Shipping Above ₹499</span>
          </div>
          <div className="trust-strip__divider" />
          <div className="trust-strip__item">
            <span className="trust-strip__icon">🔄</span>
            <span className="trust-strip__text">7-Day Easy Returns</span>
          </div>
          <div className="trust-strip__divider" />
          <div className="trust-strip__item">
            <span className="trust-strip__icon">⚡</span>
            <span className="trust-strip__text">Fast Pan-India Dispatch</span>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section" id="featured">
        <div className="container">
          <div className="section-header animate-fade-in-up">
            <span className="section-header__label">Curated for You</span>
            <h2 className="section-header__title display-text">
              Featured <span className="text-gradient">Collection</span>
            </h2>
            <p className="section-header__desc">
              Our most loved pieces, handpicked for their exceptional beauty and style
            </p>
          </div>
          <div className="product-grid stagger">
            {featured.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
          <div className="section-cta">
            <Link to="/products" className="btn btn-secondary btn-lg">
              View All Earrings →
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section why-section" id="why-us">
        <div className="container">
          <div className="section-header animate-fade-in-up">
            <span className="section-header__label">Why Hastara</span>
            <h2 className="section-header__title display-text">
              The <span className="text-gradient">Hastara</span> Promise
            </h2>
          </div>
          <div className="why-grid stagger">
            <div className="why-card glass">
              <span className="why-card__icon">💎</span>
              <h3 className="why-card__title">Premium Quality</h3>
              <p className="why-card__desc">
                High-grade skin-friendly alloys and durable plating ensuring lasting shine, wear after wear.
              </p>
            </div>
            <div className="why-card glass">
              <span className="why-card__icon">✨</span>
              <h3 className="why-card__title">Curated Aesthetic</h3>
              <p className="why-card__desc">
                Handpicked contemporary and heritage designs for daily wear and every celebration.
              </p>
            </div>
            <div className="why-card glass">
              <span className="why-card__icon">🔒</span>
              <h3 className="why-card__title">100% Secure Checkout</h3>
              <p className="why-card__desc">
                Encrypted payments via UPI, Cards, and Net Banking. Your data is always safe.
              </p>
            </div>
            <div className="why-card glass">
              <span className="why-card__icon">🔄</span>
              <h3 className="why-card__title">7-Day Hassle-Free Returns</h3>
              <p className="why-card__desc">
                Easy exchanges and returns if you're not completely in love with your purchase.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section className="section" id="best-sellers">
        <div className="container">
          <div className="section-header animate-fade-in-up">
            <span className="section-header__label">🔥 Top Picks</span>
            <h2 className="section-header__title display-text">
              Best <span className="text-gradient">Sellers</span>
            </h2>
            <p className="section-header__desc">
              The earrings everyone is talking about — grab yours before they sell out!
            </p>
          </div>
          <div className="product-grid stagger">
            {bestSellers.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" id="cta-section">
        <div className="container">
          <div className="cta-card glass">
            <div className="cta-card__content animate-fade-in-up">
              <span className="cta-card__icon">✦</span>
              <h2 className="cta-card__title display-text">
                Ready to find your <span className="text-gradient">perfect pair</span>?
              </h2>
              <p className="cta-card__desc">
                Browse our complete collection of premium earrings and find the one that speaks to your soul.
              </p>
              <Link to="/products" className="btn btn-primary btn-lg" id="cta-shop-btn">
                Shop All Earrings
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
