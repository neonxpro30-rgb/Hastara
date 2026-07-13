import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import './CheckoutPage.css';

interface ShippingForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

interface FormErrors {
  [key: string]: string;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh',
];

const SHIPPING_CHARGE = 1;
const FREE_SHIPPING_THRESHOLD = 499;

export default function CheckoutPage() {
  const { state: cartState, totalPrice, totalSavings, clearCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Dynamically load the PayU Bolt script on mount
  useEffect(() => {
    if (!document.getElementById('bolt')) {
      const script = document.createElement('script');
      script.id = 'bolt';
      // Using production bolt script for PayU
      script.src = 'https://checkout-static.citruspay.com/bolt/run/bolt.min.js';
      script.setAttribute('bolt-color', 'c4956a');
      script.setAttribute('bolt-logo', '');
      document.head.appendChild(script);
    }
  }, []);

  const [form, setForm] = useState<ShippingForm>({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', pincode: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isProcessing, setIsProcessing] = useState(false);
  
  const shippingCost = totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
  const grandTotal = totalPrice + shippingCost;

  const sanitize = (value: string): string => {
    return value.replace(/<[^>]*>/g, '').replace(/[<>"'&]/g, '');
  };

  const handleChange = (field: keyof ShippingForm, value: string) => {
    const sanitized = sanitize(value);
    setForm((prev) => ({ ...prev, [field]: sanitized }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(form.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit Indian phone number';
    }

    if (!form.address.trim()) newErrors.address = 'Address is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.state) newErrors.state = 'Please select a state';

    if (!form.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(form.pincode)) {
      newErrors.pincode = 'Please enter a valid 6-digit pincode';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      showToast('Please fix the form errors', 'error');
      return;
    }

    if (cartState.items.length === 0) {
      showToast('Your cart is empty', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      // Generate unique transaction ID
      const txnId = `HST${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const productInfo = cartState.items.map(i => `${i.product.name} x${i.quantity}`).join(', ');

      // Call backend to generate PayU hash
      const hashResponse = await fetch('/api/payment/generate-hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txnid: txnId,
          amount: grandTotal.toFixed(2),
          productinfo: productInfo,
          firstname: form.firstName,
          email: form.email,
          phone: form.phone,
        }),
      });

      if (!hashResponse.ok) {
        throw new Error('Failed to generate payment hash');
      }

      const { hash, key } = await hashResponse.json();

      // Launch PayU Bolt checkout
      const payuData = {
        key,
        txnid: txnId,
        amount: grandTotal.toFixed(2),
        productinfo: productInfo,
        firstname: form.firstName,
        lastname: form.lastName,
        email: form.email,
        phone: form.phone,
        surl: `${window.location.origin}/api/payment/response`,
        furl: `${window.location.origin}/api/payment/response`,
        hash,
      };

      // Function to create Shiprocket Order
      const createShiprocketOrder = async (transactionId: string) => {
        try {
          showToast('Creating shipping order...', 'info');
          const orderItems = cartState.items.map(item => ({
            name: item.product.name,
            sku: `HST-${item.product.id}`,
            units: item.quantity,
            selling_price: item.product.price,
            discount: 0,
            tax: 0,
            hsn: 7117
          }));

          // Calculate package dimensions and weight dynamically based on cart items
          let totalWeight = 0;
          let maxLength = 10;
          let maxBreadth = 10;
          let totalHeight = 0;

          cartState.items.forEach(item => {
            const p = item.product;
            totalWeight += (p.packageWeight || 0.5) * item.quantity;
            totalHeight += (p.packageHeight || 5) * item.quantity;
            if ((p.packageLength || 10) > maxLength) maxLength = p.packageLength || 10;
            if ((p.packageBreadth || 10) > maxBreadth) maxBreadth = p.packageBreadth || 10;
          });

          // Ensure minimums
          if (totalWeight < 0.5) totalWeight = 0.5;
          if (maxLength < 10) maxLength = 10;
          if (maxBreadth < 10) maxBreadth = 10;
          if (totalHeight < 5) totalHeight = 5;

          const res = await fetch('/api/orders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: transactionId,
              date: new Date().toISOString().split('T')[0],
              billing_customer_name: form.firstName,
              billing_last_name: form.lastName,
              billing_address: form.address,
              billing_city: form.city,
              billing_pincode: form.pincode,
              billing_state: form.state,
              billing_email: form.email,
              billing_phone: form.phone,
              order_items: orderItems,
              sub_total: grandTotal,
              weight: totalWeight,
              length: maxLength,
              breadth: maxBreadth,
              height: totalHeight,
            })
          });
          
          if (!res.ok) {
            console.error('Shiprocket error:', await res.text());
            showToast('Payment successful, but failed to create shipping order.', 'warning');
          } else {
            showToast('Order confirmed and shipping initialized!', 'success');
          }
        } catch (err) {
          console.error('Shiprocket creation failed', err);
        }
      };

      // Check if bolt is available (PayU SDK)
      if (typeof (window as any).bolt !== 'undefined') {
        (window as any).bolt.launch(payuData, {
          responseHandler: async (response: any) => {
            if (response.response.txnStatus === 'SUCCESS') {
              await createShiprocketOrder(txnId);
              clearCart();
              navigate('/order-confirmation', {
                state: {
                  orderId: txnId,
                  amount: grandTotal,
                  items: cartState.items,
                },
              });
            } else {
              showToast('Payment failed. Please try again.', 'error');
            }
          },
          catchException: () => {
            showToast('Payment was cancelled.', 'error');
          },
        });
      } else {
        // Demo mode — simulate payment for testing
        showToast('PayU SDK not loaded. Processing in demo mode...', 'info');
        setTimeout(async () => {
          await createShiprocketOrder(txnId);
          clearCart();
          navigate('/order-confirmation', {
            state: {
              orderId: txnId,
              amount: grandTotal,
              items: cartState.items,
              demo: true,
            },
          });
        }, 1500);
      }
    } catch (error) {
      console.error('Payment error:', error);
      showToast('An error occurred. Proceeding to demo order.', 'error');
      // Demo fallback
      const txnId = `HST${Date.now()}`;
      clearCart();
      navigate('/order-confirmation', {
        state: {
          orderId: txnId,
          amount: grandTotal,
          items: cartState.items,
          demo: true,
        },
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (cartState.items.length === 0) {
    return (
      <main className="checkout-empty container">
        <div className="checkout-empty__content">
          <span className="checkout-empty__icon">🛒</span>
          <h1>Your Cart is Empty</h1>
          <p>Add some beautiful earrings to get started!</p>
          <Link to="/products" className="btn btn-primary btn-lg">
            Shop Now
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout" id="checkout-page">
      <div className="container">
        <h1 className="checkout__title display-text animate-fade-in-up">
          <span className="text-gradient">Checkout</span>
        </h1>

        <div className="checkout__layout">
          {/* Form Section */}
          <form className="checkout__form animate-fade-in-up" onSubmit={handleSubmit} noValidate id="checkout-form">
            {/* Shipping Info */}
            <div className="checkout__section">
              <h2 className="checkout__section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Shipping Address
              </h2>

              <div className="checkout__form-grid">
                <div className="input-group">
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    id="firstName"
                    type="text"
                    placeholder="Enter first name"
                    value={form.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    className={errors.firstName ? 'input-error' : ''}
                    autoComplete="given-name"
                  />
                  {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                </div>
                <div className="input-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    id="lastName"
                    type="text"
                    placeholder="Enter last name"
                    value={form.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    className={errors.lastName ? 'input-error' : ''}
                    autoComplete="family-name"
                  />
                  {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                </div>
                <div className="input-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={errors.email ? 'input-error' : ''}
                    autoComplete="email"
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>
                <div className="input-group">
                  <label htmlFor="phone">Phone Number *</label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className={errors.phone ? 'input-error' : ''}
                    autoComplete="tel"
                    maxLength={10}
                  />
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>
                <div className="input-group input-group--full">
                  <label htmlFor="address">Address *</label>
                  <textarea
                    id="address"
                    placeholder="House/Flat No., Building, Street, Area"
                    value={form.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className={errors.address ? 'input-error' : ''}
                    autoComplete="street-address"
                    rows={3}
                  />
                  {errors.address && <span className="error-text">{errors.address}</span>}
                </div>
                <div className="input-group">
                  <label htmlFor="city">City *</label>
                  <input
                    id="city"
                    type="text"
                    placeholder="Enter city"
                    value={form.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className={errors.city ? 'input-error' : ''}
                    autoComplete="address-level2"
                  />
                  {errors.city && <span className="error-text">{errors.city}</span>}
                </div>
                <div className="input-group">
                  <label htmlFor="state">State *</label>
                  <select
                    id="state"
                    value={form.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    className={errors.state ? 'input-error' : ''}
                    autoComplete="address-level1"
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.state && <span className="error-text">{errors.state}</span>}
                </div>
                <div className="input-group">
                  <label htmlFor="pincode">Pincode *</label>
                  <input
                    id="pincode"
                    type="text"
                    placeholder="6-digit pincode"
                    value={form.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={errors.pincode ? 'input-error' : ''}
                    autoComplete="postal-code"
                    maxLength={6}
                  />
                  {errors.pincode && <span className="error-text">{errors.pincode}</span>}
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="checkout__section">
              <h2 className="checkout__section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Payment
              </h2>
              <div className="checkout__payment-info glass">
                <div className="checkout__payment-badge">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  Secure Payment via PayU
                </div>
                <p className="checkout__payment-desc">
                  UPI, Cards, Net Banking, Wallets — all payment methods supported.
                  Your payment details are encrypted and never stored.
                </p>
                <div className="checkout__payment-methods">
                  <span className="checkout__pm-badge">UPI</span>
                  <span className="checkout__pm-badge">Visa</span>
                  <span className="checkout__pm-badge">Mastercard</span>
                  <span className="checkout__pm-badge">RuPay</span>
                  <span className="checkout__pm-badge">Net Banking</span>
                </div>
              </div>
            </div>

            {/* Submit — mobile only */}
            <button
              type="submit"
              className="btn btn-primary btn-lg checkout__submit-mobile"
              disabled={isProcessing}
              id="checkout-pay-mobile"
            >
              {isProcessing ? 'Processing...' : `Pay ₹${grandTotal}`}
            </button>
          </form>

          {/* Order Summary */}
          <aside className="checkout__summary animate-fade-in" id="order-summary">
            <div className="checkout__summary-card glass">
              <h2 className="checkout__summary-title">Order Summary</h2>

              {/* Items */}
              <div className="checkout__summary-items">
                {cartState.items.map((item) => (
                  <div className="checkout__summary-item" key={item.product.id}>
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="checkout__summary-item-image"
                      width="60"
                      height="60"
                    />
                    <div className="checkout__summary-item-info">
                      <p className="checkout__summary-item-name">{item.product.name}</p>
                      <p className="checkout__summary-item-qty">Qty: {item.quantity}</p>
                    </div>
                    <span className="price">₹{item.product.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="divider" />

              {/* Totals */}
              <div className="checkout__summary-row">
                <span>Subtotal</span>
                <span>₹{totalPrice.toFixed(2)}</span>
              </div>
              <div className="checkout__summary-row">
                <span>Shipping</span>
                <span>{shippingCost === 0 ? <span className="free-shipping">Free</span> : `₹${shippingCost.toFixed(2)}`}</span>
              </div>
              {totalSavings > 0 && (
                <div className="checkout__summary-row checkout__summary-row--savings">
                  <span>🎉 You save</span>
                  <span>-₹{totalSavings}</span>
                </div>
              )}

              <div className="divider" />

              <div className="checkout__summary-row checkout__summary-row--total">
                <span>Total</span>
                <span className="price">₹{grandTotal}</span>
              </div>

              {shippingCost > 0 && (
                <p className="checkout__free-shipping-note">
                  Add ₹{FREE_SHIPPING_THRESHOLD - totalPrice} more for free shipping!
                </p>
              )}

              <button
                type="submit"
                form="checkout-form"
                className="btn btn-primary btn-lg checkout__submit-btn"
                disabled={isProcessing}
                id="checkout-pay-btn"
              >
                {isProcessing ? (
                  <>
                    <span className="checkout__spinner" /> Processing...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    Pay ₹{grandTotal}
                  </>
                )}
              </button>

              <p className="checkout__secure-note">
                🔒 Secured by PayU • 256-bit SSL encryption
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
