import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { toggleCart, totalItems } = useCart();
  const location = useLocation();

  const isHomePage = location.pathname === '/';
  const isDarkHero = isHomePage && !scrolled;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/products', label: 'Shop' },
    { to: '/policies', label: 'Policies' },
  ];

  return (
    <>
      <nav className={`navbar ${isDarkHero ? 'navbar--transparent' : 'navbar--solid'}`} id="main-nav">
        <div className="navbar__inner container">
          {/* Hamburger */}
          <button
            className={`navbar__hamburger ${menuOpen ? 'navbar__hamburger--open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            id="nav-hamburger"
          >
            <span />
            <span />
            <span />
          </button>

          {/* Logo + Wordmark */}
          <Link to="/" className="navbar__logo" id="nav-logo" aria-label="Hastara Home">
            <img
              src={isDarkHero ? "/images/h-logo-white.png" : "/images/h-logo-black.png"}
              alt="Hastara"
              className="navbar__logo-img"
            />
            <span className={`navbar__wordmark ${isDarkHero ? 'navbar__wordmark--light' : 'navbar__wordmark--dark'}`}>
              HASTARA
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <ul className="navbar__links" id="nav-links-desktop">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`navbar__link ${location.pathname === link.to ? 'navbar__link--active' : ''}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Actions: Search, Wishlist, Cart */}
          <div className="navbar__actions">
            {/* Search */}
            <button
              className="navbar__icon-btn"
              aria-label="Search"
              id="nav-search-btn"
              onClick={() => {/* search handler placeholder */}}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>

            {/* Wishlist */}
            <button
              className="navbar__icon-btn"
              aria-label="Wishlist"
              id="nav-wishlist-btn"
              onClick={() => {/* wishlist handler placeholder */}}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </button>

            {/* Cart */}
            <button
              className="navbar__cart-btn"
              onClick={toggleCart}
              aria-label={`Cart with ${totalItems} items`}
              id="nav-cart-btn"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              {totalItems > 0 && (
                <span className="navbar__cart-badge animate-scale-in">{totalItems}</span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="mobile-overlay" onClick={() => setMenuOpen(false)} />
      )}

      {/* Mobile Menu */}
      <div className={`mobile-menu ${menuOpen ? 'mobile-menu--open' : ''}`} id="mobile-menu">
        <div className="mobile-menu__header">
          <img src="/images/logo.png" alt="Hastara" className="mobile-menu__logo-img" />
          <button
            className="mobile-menu__close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <ul className="mobile-menu__links">
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`mobile-menu__link ${location.pathname === link.to ? 'mobile-menu__link--active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Quick Category Jump on Mobile */}
        <div className="mobile-menu__categories">
          <p className="mobile-menu__section-title">Categories</p>
          <div className="mobile-menu__cat-grid">
            {[
              { id: 'chandbali', icon: '🌙', label: 'Chandbali' },
              { id: 'jhumka', icon: '🔔', label: 'Jhumka' },
              { id: 'danglers', icon: '💎', label: 'Danglers' },
              { id: 'studs', icon: '⭐', label: 'Studs' },
              { id: 'hoops', icon: '⭕', label: 'Hoops' },
              { id: 'drops', icon: '💧', label: 'Drops' },
            ].map(cat => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.id}`}
                className="mobile-menu__cat-chip"
                onClick={() => setMenuOpen(false)}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mobile-menu__footer">
          <p>Made with ♥ in India</p>
        </div>
      </div>
    </>
  );
}
