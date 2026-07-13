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
        setFeatured(products.filter(p => p.featured));
        setBestSellers(products.filter(p => p.bestSeller));
      })
      .catch(err => console.error('Failed to fetch products:', err));
  }, []);

  return (
    <main className="home" id="home-page">
      {/* Hero Section */}
      <section className="hero" id="hero-section">
        <div className="hero__bg">
          <img
            src="/images/hero-banner.png"
            alt="Hastara — Handcrafted Earrings Collection"
            className="hero__bg-image"
            fetchPriority="high"
            width="1440"
            height="800"
          />
          <div className="hero__bg-overlay" />
        </div>
        <div className="hero__content container">
          <div className="hero__text animate-fade-in-up">
            <span className="hero__badge">✦ Handcrafted in India</span>
            <h1 className="hero__title display-text">
              Adorn Your <br />
              <span className="text-gradient">Elegance</span>
            </h1>
            <p className="hero__subtitle">
              Discover handcrafted earrings that blend traditional Indian artistry
              with modern elegance. Each piece is a story of timeless beauty.
            </p>
            <div className="hero__actions">
              <Link to="/products" className="btn btn-primary btn-lg" id="hero-shop-btn">
                Shop Collection
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
              <a href="#featured" className="btn btn-secondary btn-lg">
                Explore ↓
              </a>
            </div>
            <div className="hero__stats">
              <div className="hero__stat">
                <span className="hero__stat-number">500+</span>
                <span className="hero__stat-label">Happy Customers</span>
              </div>
              <div className="hero__stat-divider" />
              <div className="hero__stat">
                <span className="hero__stat-number">4.8★</span>
                <span className="hero__stat-label">Average Rating</span>
              </div>
              <div className="hero__stat-divider" />
              <div className="hero__stat">
                <span className="hero__stat-number">50+</span>
                <span className="hero__stat-label">Unique Designs</span>
              </div>
            </div>
          </div>
        </div>
        {/* Scroll indicator */}
        <div className="hero__scroll-indicator">
          <div className="hero__scroll-line" />
        </div>
      </section>

      {/* Marquee Trust Band */}
      <section className="trust-band" id="trust-band">
        <div className="trust-band__track">
          {[...Array(2)].map((_, i) => (
            <div className="trust-band__content" key={i}>
              <span>🚚 Free Shipping Above ₹499</span>
              <span className="trust-band__dot">✦</span>
              <span>🔄 7-Day Easy Returns</span>
              <span className="trust-band__dot">✦</span>
              <span>🔒 100% Secure Payments</span>
              <span className="trust-band__dot">✦</span>
              <span>💎 Handcrafted Quality</span>
              <span className="trust-band__dot">✦</span>
              <span>📦 Quick Dispatch</span>
              <span className="trust-band__dot">✦</span>
            </div>
          ))}
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
              Our most loved pieces, handpicked for their exceptional beauty and craftsmanship
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
              <span className="why-card__icon">✋</span>
              <h3 className="why-card__title">Handcrafted</h3>
              <p className="why-card__desc">
                Each piece is handcrafted by skilled artisans with decades of experience in traditional Indian jewelry making.
              </p>
            </div>
            <div className="why-card glass">
              <span className="why-card__icon">💎</span>
              <h3 className="why-card__title">Premium Quality</h3>
              <p className="why-card__desc">
                We use only high-grade alloys and stones, ensuring each earring maintains its beauty wear after wear.
              </p>
            </div>
            <div className="why-card glass">
              <span className="why-card__icon">🔒</span>
              <h3 className="why-card__title">Secure Shopping</h3>
              <p className="why-card__desc">
                Shop with confidence using our encrypted payment gateway. Your data is always safe with us.
              </p>
            </div>
            <div className="why-card glass">
              <span className="why-card__icon">🔄</span>
              <h3 className="why-card__title">Easy Returns</h3>
              <p className="why-card__desc">
                Not satisfied? Return within 7 days for a full refund. No questions asked, hassle-free process.
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
                Browse our complete collection of handcrafted earrings and find the one that speaks to your soul.
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
