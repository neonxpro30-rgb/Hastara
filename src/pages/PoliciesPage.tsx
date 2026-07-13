import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './PoliciesPage.css';

export default function PoliciesPage() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [hash]);

  return (
    <main className="policies" id="policies-page">
      <div className="container">
        <div className="policies__header animate-fade-in-up">
          <h1 className="policies__title display-text">
            Our <span className="text-gradient">Policies</span>
          </h1>
          <p className="policies__subtitle">
            Transparency is our priority. Read our complete policies below.
          </p>
        </div>

        {/* Quick Nav */}
        <nav className="policies__nav glass" aria-label="Policy navigation" id="policy-nav">
          <a href="#shipping" className="policies__nav-link">🚚 Shipping</a>
          <a href="#returns" className="policies__nav-link">🔄 Returns</a>
          <a href="#privacy" className="policies__nav-link">🔒 Privacy</a>
          <a href="#terms" className="policies__nav-link">📋 Terms</a>
        </nav>

        <div className="policies__content">
          {/* Shipping Policy */}
          <section className="policy-section" id="shipping">
            <div className="policy-section__icon">🚚</div>
            <h2 className="policy-section__title">Shipping Policy</h2>
            <div className="policy-section__body">
              <h3>Delivery Areas</h3>
              <p>We deliver across all pincodes in India. Currently, we do not offer international shipping.</p>

              <h3>Shipping Charges</h3>
              <ul>
                <li><strong>Free Shipping</strong> on all orders above ₹499</li>
                <li>A flat shipping charge of <strong>₹49</strong> applies to orders below ₹499</li>
              </ul>

              <h3>Processing Time</h3>
              <p>Orders are processed within <strong>1-2 business days</strong> after payment confirmation. You will receive a tracking number via email and SMS once your order is dispatched.</p>

              <h3>Estimated Delivery</h3>
              <ul>
                <li><strong>Metro cities:</strong> 3-5 business days</li>
                <li><strong>Other cities:</strong> 5-7 business days</li>
                <li><strong>Remote areas:</strong> 7-10 business days</li>
              </ul>

              <h3>Order Tracking</h3>
              <p>Once shipped, you'll receive a tracking link via email. You can track your order status in real-time through our courier partner's website.</p>

              <div className="policy-note">
                <strong>Note:</strong> Delivery timelines may vary during festive seasons, sales, or due to unforeseen circumstances like natural disasters or courier delays.
              </div>
            </div>
          </section>

          {/* Returns & Refund Policy */}
          <section className="policy-section" id="returns">
            <div className="policy-section__icon">🔄</div>
            <h2 className="policy-section__title">Returns & Refund Policy</h2>
            <div className="policy-section__body">
              <h3>Return Window</h3>
              <p>We offer a <strong>7-day return policy</strong> from the date of delivery. If you're not completely satisfied with your purchase, you can initiate a return within this period.</p>

              <h3>Conditions for Return</h3>
              <ul>
                <li>The product must be <strong>unused, unworn, and in its original packaging</strong></li>
                <li>The product should not be <strong>damaged, altered, or tampered with</strong></li>
                <li>All <strong>tags and labels must be intact</strong></li>
                <li>Include the <strong>original invoice/receipt</strong> with the return</li>
              </ul>

              <h3>Non-Returnable Items</h3>
              <ul>
                <li>Products bought during <strong>clearance sales</strong> or marked as "Final Sale"</li>
                <li>Products showing <strong>signs of use, wear, or damage by the customer</strong></li>
              </ul>

              <h3>Refund Process</h3>
              <ul>
                <li>Once we receive and inspect the returned product, we will process your refund within <strong>5-7 business days</strong></li>
                <li>Refund will be credited to your <strong>original payment method</strong></li>
                <li>Shipping charges (if any) are <strong>non-refundable</strong></li>
              </ul>

              <h3>How to Initiate a Return</h3>
              <p>Contact us at <strong>support@hastara.in</strong> with your Order ID and reason for return. Our team will guide you through the process.</p>

              <h3>Exchange Policy</h3>
              <p>We currently do not offer direct exchanges. Please return the original item and place a new order for the desired product.</p>
            </div>
          </section>

          {/* Privacy Policy */}
          <section className="policy-section" id="privacy">
            <div className="policy-section__icon">🔒</div>
            <h2 className="policy-section__title">Privacy Policy</h2>
            <div className="policy-section__body">
              <p>At Hastara, we value your privacy and are committed to protecting your personal information. This policy outlines how we collect, use, and safeguard your data.</p>

              <h3>Information We Collect</h3>
              <ul>
                <li><strong>Personal Information:</strong> Name, email address, phone number, shipping address (provided during checkout)</li>
                <li><strong>Payment Information:</strong> Processed securely through PayU; we <strong>never store</strong> your card details or UPI PINs</li>
                <li><strong>Usage Data:</strong> Browser type, IP address, pages visited (collected via cookies for analytics)</li>
              </ul>

              <h3>How We Use Your Information</h3>
              <ul>
                <li>To process and deliver your orders</li>
                <li>To communicate order updates and shipping notifications</li>
                <li>To improve our website and customer experience</li>
                <li>To respond to your queries and provide customer support</li>
              </ul>

              <h3>Data Security</h3>
              <p>We use industry-standard <strong>256-bit SSL encryption</strong> to protect your data during transmission. All payment transactions are processed through PayU's PCI-DSS compliant payment gateway.</p>

              <h3>Third-Party Sharing</h3>
              <p>We do not sell, trade, or rent your personal information to third parties. We may share limited information with trusted service providers (courier partners, payment processors) solely for order fulfillment.</p>

              <h3>Cookies</h3>
              <p>We use cookies to enhance your browsing experience. You can disable cookies in your browser settings, though this may affect some website functionality.</p>

              <h3>Your Rights</h3>
              <p>You have the right to access, correct, or delete your personal data. Contact us at <strong>support@hastara.in</strong> for any data-related requests.</p>
            </div>
          </section>

          {/* Terms & Conditions */}
          <section className="policy-section" id="terms">
            <div className="policy-section__icon">📋</div>
            <h2 className="policy-section__title">Terms & Conditions</h2>
            <div className="policy-section__body">
              <p>By using the Hastara website and making a purchase, you agree to the following terms and conditions.</p>

              <h3>General</h3>
              <ul>
                <li>The products listed on this website are for personal use only</li>
                <li>We reserve the right to update or modify product details, prices, and policies at any time without prior notice</li>
                <li>Product images are representative; actual colors may vary slightly due to screen settings</li>
              </ul>

              <h3>Orders & Payment</h3>
              <ul>
                <li>All orders are subject to <strong>product availability</strong></li>
                <li>Prices are listed in <strong>Indian Rupees (₹)</strong> and include all applicable taxes</li>
                <li>We accept payments via <strong>UPI, Credit/Debit Cards, Net Banking, and Wallets</strong> through PayU</li>
                <li>We reserve the right to <strong>cancel orders</strong> that appear fraudulent or violate these terms</li>
              </ul>

              <h3>Product Quality</h3>
              <ul>
                <li>Our earrings are made from <strong>oxidized silver alloy</strong> — they are not pure silver or gold</li>
                <li>Avoid contact with <strong>water, perfume, and chemicals</strong> to maintain the finish</li>
                <li>Store in a <strong>cool, dry place</strong> in the provided pouch</li>
              </ul>

              <h3>Intellectual Property</h3>
              <p>All content on this website — including images, text, logos, and designs — is the property of Hastara and is protected by copyright laws. Unauthorized reproduction or distribution is prohibited.</p>

              <h3>Limitation of Liability</h3>
              <p>Hastara shall not be liable for any indirect, incidental, or consequential damages arising from the use of our website or products. Our liability is limited to the purchase price of the product.</p>

              <h3>Contact</h3>
              <p>For questions about these terms, contact us at <strong>support@hastara.in</strong></p>

              <div className="policy-note">
                <strong>Last Updated:</strong> July 2026
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
