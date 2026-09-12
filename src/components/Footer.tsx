import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="footer__grid">
          {/* Brand */}
          <div className="footer__brand">
            <Link to="/" className="footer__logo" aria-label="Hastara Home">
              <img src="/images/logo.png" alt="Hastara" className="footer__logo-img" />
            </Link>
            <p className="footer__tagline">
              Curated Indian earrings for the modern woman — lightweight,
              skin-friendly, and designed to shine on every occasion.
            </p>
            <div className="footer__social">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="footer__social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="footer__social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                </svg>
              </a>
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="footer__social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer__section">
            <h4 className="footer__heading">Quick Links</h4>
            <ul className="footer__list">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/products">All Earrings</Link></li>
              <li><Link to="/products?category=chandbali">Chandbali</Link></li>
              <li><Link to="/products?category=jhumka">Jhumka</Link></li>
              <li><Link to="/products?category=studs">Studs</Link></li>
            </ul>
          </div>

          {/* Policies */}
          <div className="footer__section">
            <h4 className="footer__heading">Policies</h4>
            <ul className="footer__list">
              <li><Link to="/policies#shipping">Shipping Policy</Link></li>
              <li><Link to="/policies#returns">Returns &amp; Refund</Link></li>
              <li><Link to="/policies#privacy">Privacy Policy</Link></li>
              <li><Link to="/policies#terms">Terms &amp; Conditions</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer__section">
            <h4 className="footer__heading">Get in Touch</h4>
            <ul className="footer__list footer__contact-list">
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <a href="mailto:support@hastara.shop">support@hastara.shop</a>
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                India
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer__bottom">
          <p>© {currentYear} Hastara. All rights reserved.</p>
          <div className="footer__payment-icons">
            <span className="footer__payment-label">We accept:</span>
            {/* UPI */}
            <span className="footer__payment-badge footer__payment-badge--upi" title="UPI">
              <svg viewBox="0 0 48 20" height="18" aria-label="UPI">
                <rect width="48" height="20" rx="3" fill="#2F2C7B"/>
                <text x="50%" y="14" textAnchor="middle" fill="white" fontSize="10" fontWeight="700" fontFamily="Arial">UPI</text>
              </svg>
            </span>
            {/* GPay */}
            <span className="footer__payment-badge" title="Google Pay">
              <svg viewBox="0 0 48 20" height="18" aria-label="GPay">
                <rect width="48" height="20" rx="3" fill="#fff" stroke="#e8e8e8" strokeWidth="1"/>
                <text x="50%" y="14" textAnchor="middle" fill="#333" fontSize="9" fontWeight="700" fontFamily="Arial">G Pay</text>
              </svg>
            </span>
            {/* Visa */}
            <span className="footer__payment-badge footer__payment-badge--visa" title="Visa">
              <svg viewBox="0 0 48 20" height="18" aria-label="Visa">
                <rect width="48" height="20" rx="3" fill="#1A1F71"/>
                <text x="50%" y="14" textAnchor="middle" fill="white" fontSize="12" fontWeight="700" fontFamily="Arial" fontStyle="italic">VISA</text>
              </svg>
            </span>
            {/* Mastercard */}
            <span className="footer__payment-badge" title="Mastercard">
              <svg viewBox="0 0 48 20" height="18" aria-label="Mastercard">
                <rect width="48" height="20" rx="3" fill="#fff" stroke="#e8e8e8" strokeWidth="1"/>
                <circle cx="17" cy="10" r="7" fill="#EB001B" opacity="0.9"/>
                <circle cx="31" cy="10" r="7" fill="#F79E1B" opacity="0.9"/>
                <ellipse cx="24" cy="10" rx="3.5" ry="7" fill="#FF5F00" opacity="0.85"/>
              </svg>
            </span>
            {/* RuPay */}
            <span className="footer__payment-badge footer__payment-badge--rupay" title="RuPay">
              <svg viewBox="0 0 48 20" height="18" aria-label="RuPay">
                <rect width="48" height="20" rx="3" fill="#006EB3"/>
                <text x="50%" y="14" textAnchor="middle" fill="white" fontSize="8.5" fontWeight="700" fontFamily="Arial">RuPay</text>
              </svg>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
