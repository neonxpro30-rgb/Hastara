import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import './CartDrawer.css';

export default function CartDrawer() {
  const {
    state,
    closeCart,
    removeFromCart,
    updateQuantity,
    totalItems,
    totalPrice,
    totalSavings,
  } = useCart();

  if (!state.isOpen) return null;

  return (
    <>
      <div className="cart-overlay" onClick={closeCart} />
      <aside className="cart-drawer glass" id="cart-drawer" role="dialog" aria-label="Shopping Cart">
        {/* Header */}
        <div className="cart-drawer__header">
          <h2 className="cart-drawer__title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            Your Bag ({totalItems})
          </h2>
          <button className="cart-drawer__close" onClick={closeCart} aria-label="Close cart" id="cart-close-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Items */}
        {state.items.length === 0 ? (
          <div className="cart-drawer__empty">
            <span className="cart-drawer__empty-icon">🛍️</span>
            <p>Your bag is empty</p>
            <span className="cart-drawer__empty-sub">Add something beautiful!</span>
            <Link to="/products" className="btn btn-primary" onClick={closeCart}>
              Shop Now
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-drawer__items">
              {state.items.map((item) => {
                const discount = Math.round(
                  ((item.product.originalPrice - item.product.price) / item.product.originalPrice) * 100
                );
                return (
                  <div className="cart-item" key={item.product.id} id={`cart-item-${item.product.id}`}>
                    <Link to={`/products/${item.product.slug}`} onClick={closeCart}>
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="cart-item__image"
                        width="80"
                        height="80"
                      />
                    </Link>
                    <div className="cart-item__info">
                      <div className="cart-item__top">
                        <div>
                          <h4 className="cart-item__name">{item.product.name}</h4>
                          <div className="cart-item__pricing">
                            <span className="price">₹{item.product.price}</span>
                            <span className="price-original">₹{item.product.originalPrice}</span>
                            <span className="tag">-{discount}%</span>
                          </div>
                        </div>
                        <button
                          className="cart-item__remove"
                          onClick={() => removeFromCart(item.product.id)}
                          aria-label={`Remove ${item.product.name}`}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                          </svg>
                        </button>
                      </div>
                      <div className="cart-item__quantity">
                        <button
                          className="cart-item__qty-btn"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="cart-item__qty-value">{item.quantity}</span>
                        <button
                          className="cart-item__qty-btn"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                          disabled={item.quantity >= 10}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="cart-drawer__footer">
              {totalSavings > 0 && (
                <div className="cart-drawer__savings">
                  <span>🎉 You're saving</span>
                  <span className="cart-drawer__savings-amount">₹{totalSavings}</span>
                </div>
              )}
              <div className="cart-drawer__total">
                <span>Subtotal</span>
                <span className="price">₹{totalPrice}</span>
              </div>
              <p className="cart-drawer__shipping-note">Shipping calculated at checkout</p>
              <Link
                to="/checkout"
                className="btn btn-primary btn-lg cart-drawer__checkout-btn"
                onClick={closeCart}
                id="cart-checkout-btn"
              >
                Proceed to Checkout
              </Link>
              <button className="cart-drawer__continue" onClick={closeCart}>
                Continue Shopping →
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
