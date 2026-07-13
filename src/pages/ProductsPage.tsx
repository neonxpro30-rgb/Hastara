import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import type { Product } from '../data/products';
import { categories } from '../data/products';
import './ProductsPage.css';

type SortOption = 'featured' | 'price-low' | 'price-high' | 'rating' | 'newest';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || 'all';
  const [sort, setSort] = useState<SortOption>('featured');
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then((data: Product[]) => setAllProducts(data))
      .catch(err => console.error('Failed to fetch products:', err));
  }, []);

  const filteredProducts = useMemo(() => {
    let items = activeCategory === 'all'
      ? allProducts
      : allProducts.filter(p => p.category === activeCategory);

    switch (sort) {
      case 'price-low':
        items = [...items].sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        items = [...items].sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        items = [...items].sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        items = [...items].reverse();
        break;
      case 'featured':
      default:
        items = [...items].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }
    return items;
  }, [activeCategory, sort, allProducts]);

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ category: categoryId });
    }
  };

  return (
    <main className="products-page" id="products-page">
      <div className="container">
        {/* Page Header */}
        <div className="products-page__header animate-fade-in-up">
          <h1 className="products-page__title display-text">
            Our <span className="text-gradient">Collection</span>
          </h1>
          <p className="products-page__subtitle">
            {allProducts.length} handcrafted earrings waiting to adorn you
          </p>
        </div>

        {/* Filters Bar */}
        <div className="products-page__filters animate-fade-in-up">
          {/* Category Tabs */}
          <div className="category-tabs" id="category-tabs" role="tablist">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-tab ${activeCategory === cat.id ? 'category-tab--active' : ''}`}
                onClick={() => handleCategoryChange(cat.id)}
                role="tab"
                aria-selected={activeCategory === cat.id}
                id={`category-tab-${cat.id}`}
              >
                <span className="category-tab__icon">{cat.icon}</span>
                <span className="category-tab__label">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="products-page__sort">
            <label htmlFor="sort-select" className="products-page__sort-label">Sort by:</label>
            <select
              id="sort-select"
              className="products-page__sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low → High</option>
              <option value="price-high">Price: High → Low</option>
              <option value="rating">Top Rated</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <p className="products-page__count">
          Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'earring' : 'earrings'}
          {activeCategory !== 'all' && (
            <> in <strong>{categories.find(c => c.id === activeCategory)?.name}</strong></>
          )}
        </p>

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <div className="product-grid stagger" key={activeCategory + sort}>
            {filteredProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        ) : (
          <div className="products-page__empty">
            <span className="products-page__empty-icon">🔍</span>
            <p>No earrings found in this category.</p>
            <button
              className="btn btn-secondary"
              onClick={() => handleCategoryChange('all')}
            >
              View All Earrings
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
