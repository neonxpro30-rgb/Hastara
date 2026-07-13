import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import type { Product } from '../data/products';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addToCart, openCart } = useCart();
  const { showToast } = useToast();

  const discount = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    showToast(`${product.name} added to cart! 🛍️`);
    openCart();
  };

  return (
    <Link
      to={`/products/${product.slug}`}
      className="product-card"
      style={{ animationDelay: `${index * 80}ms` }}
      id={`product-card-${product.id}`}
    >
      {/* Image */}
      <div className="product-card__image-wrapper">
        <img
          src={product.image}
          alt={product.name}
          className="product-card__image"
          loading={index < 4 ? 'eager' : 'lazy'}
          width="400"
          height="400"
        />
        <div className="product-card__overlay">
          <button
            className="product-card__quick-add btn btn-primary btn-sm"
            onClick={handleAddToCart}
            aria-label={`Add ${product.name} to cart`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            Add to Cart
          </button>
        </div>

        {/* Badges */}
        <div className="product-card__badges">
          {discount > 0 && (
            <span className="product-card__badge product-card__badge--discount">
              -{discount}%
            </span>
          )}
          {product.tags && product.tags.length > 0 && product.tags[0] && (
            <span className="product-card__badge product-card__badge--tag">
              {product.tags[0]}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="product-card__info">
        <p className="product-card__category">{product.category}</p>
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__desc">{product.shortDescription}</p>
        <div className="product-card__bottom">
          <div className="product-card__pricing">
            <span className="product-card__price price">₹{product.price}</span>
            <span className="product-card__original-price price-original">
              ₹{product.originalPrice}
            </span>
          </div>
          <div className="product-card__rating">
            <span className="product-card__star">★</span>
            <span>{product.rating}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
