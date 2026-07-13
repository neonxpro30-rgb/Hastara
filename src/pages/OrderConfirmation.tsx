import { useLocation, Link, Navigate } from 'react-router-dom';
import type { CartItem } from '../context/CartContext';
import './OrderConfirmation.css';

interface OrderState {
  orderId: string;
  amount: number;
  items: CartItem[];
  demo?: boolean;
}

export default function OrderConfirmation() {
  const location = useLocation();
  const orderState = location.state as OrderState | null;

  if (!orderState) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="order-confirm" id="order-confirmation">
      <div className="container">
        <div className="order-confirm__card glass animate-scale-in">
          <div className="order-confirm__icon-wrap">
            <span className="order-confirm__icon">✓</span>
          </div>
          <h1 className="order-confirm__title display-text">
            Order <span className="text-gradient">Confirmed!</span>
          </h1>
          <p className="order-confirm__subtitle">
            Thank you for shopping with Hastara! Your order has been placed successfully.
          </p>

          {orderState.demo && (
            <div className="order-confirm__demo-badge">
              🧪 Demo Mode — No actual payment was processed
            </div>
          )}

          {/* Order Details */}
          <div className="order-confirm__details">
            <div className="order-confirm__detail">
              <span className="order-confirm__detail-label">Order ID</span>
              <span className="order-confirm__detail-value">{orderState.orderId}</span>
            </div>
            <div className="order-confirm__detail">
              <span className="order-confirm__detail-label">Total Amount</span>
              <span className="order-confirm__detail-value price">₹{orderState.amount}</span>
            </div>
            <div className="order-confirm__detail">
              <span className="order-confirm__detail-label">Items</span>
              <span className="order-confirm__detail-value">{orderState.items.length} product(s)</span>
            </div>
          </div>

          {/* Ordered Items */}
          <div className="order-confirm__items">
            {orderState.items.map((item) => (
              <div className="order-confirm__item" key={item.product.id}>
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="order-confirm__item-image"
                  width="50"
                  height="50"
                />
                <div className="order-confirm__item-info">
                  <p className="order-confirm__item-name">{item.product.name}</p>
                  <p className="order-confirm__item-qty">Qty: {item.quantity} × ₹{item.product.price}</p>
                </div>
                <span className="price">₹{item.product.price * item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="order-confirm__note">

            <p>📦 Your order will be dispatched within 1-2 business days.</p>
          </div>

          <div className="order-confirm__actions">
            <Link to="/products" className="btn btn-primary btn-lg">
              Continue Shopping
            </Link>
            <Link to="/" className="btn btn-secondary">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
