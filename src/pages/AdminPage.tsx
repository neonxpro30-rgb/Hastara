import React, { useState, useEffect, useRef } from 'react';
import './AdminPage.css';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number;
  description: string;
  shortDescription: string;
  image: string;
  category: string;
  tags: string[];
  inStock: boolean;
  featured: boolean;
  bestSeller: boolean;
  material: string;
  weight: string;
  dimensions: string;
  packageWeight?: number;
  packageLength?: number;
  packageBreadth?: number;
  packageHeight?: number;
}

interface Order {
  id: string;
  order_id: string;
  billing_customer_name: string;
  billing_email: string;
  billing_phone: string;
  billing_city: string;
  billing_state: string;
  sub_total: number;
  created_at: { _seconds: number };
}

interface Payment {
  id: string;
  txnid: string;
  firstname: string;
  email: string;
  amount: string;
  status: string;
  created_at: { _seconds: number };
}

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalPayments: number;
  totalRevenue: number;
}

type AdminTab = 'dashboard' | 'products' | 'add-product' | 'orders' | 'payments';

const CATEGORIES = [
  { id: 'chandbali', name: 'Chandbali' },
  { id: 'jhumka', name: 'Jhumka' },
  { id: 'danglers', name: 'Danglers' },
  { id: 'studs', name: 'Studs' },
  { id: 'hoops', name: 'Hoops' },
  { id: 'drops', name: 'Drops' },
];

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats>({ totalProducts: 0, totalOrders: 0, totalPayments: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '', price: '', originalPrice: '', description: '', shortDescription: '',
    category: 'chandbali', tags: '', material: '', weight: '', dimensions: '',
    inStock: 'true', featured: 'false', bestSeller: 'false',
    packageWeight: '0.5', packageLength: '10', packageBreadth: '10', packageHeight: '5'
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStats();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'payments') fetchPayments();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) setStats(await res.json());
    } catch (e) { console.error('Failed to fetch stats', e); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) setProducts(await res.json());
    } catch (e) { console.error('Failed to fetch products', e); }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) setOrders(await res.json());
    } catch (e) { console.error('Failed to fetch orders', e); }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/admin/payments');
      if (res.ok) setPayments(await res.json());
    } catch (e) { console.error('Failed to fetch payments', e); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', price: '', originalPrice: '', description: '', shortDescription: '',
      category: 'chandbali', tags: '', material: '', weight: '', dimensions: '',
      inStock: 'true', featured: 'false', bestSeller: 'false',
      packageWeight: '0.5', packageLength: '10', packageBreadth: '10', packageHeight: '5'
    });
    setImageFile(null);
    setImagePreview('');
    setEditingProduct(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: String(product.price),
      originalPrice: String(product.originalPrice),
      description: product.description,
      shortDescription: product.shortDescription,
      category: product.category,
      tags: (product.tags || []).join(', '),
      material: product.material || '',
      weight: product.weight || '',
      dimensions: product.dimensions || '',
      inStock: String(product.inStock),
      featured: String(product.featured),
      bestSeller: String(product.bestSeller),
      packageWeight: String(product.packageWeight || 0.5),
      packageLength: String(product.packageLength || 10),
      packageBreadth: String(product.packageBreadth || 10),
      packageHeight: String(product.packageHeight || 5),
    });
    setImagePreview(product.image);
    setActiveTab('add-product');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Kya aap sach me "${name}" ko delete karna chahte hain?`)) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(products.filter(p => p.id !== id));
        fetchStats();
      }
    } catch (e) { console.error('Delete failed', e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct && !imageFile) {
      alert('Please select an image');
      return;
    }

    setLoading(true);
    const data = new FormData();
    Object.entries(formData).forEach(([key, val]) => {
      if (key === 'tags') {
        data.append(key, JSON.stringify(val.split(',').map(t => t.trim()).filter(Boolean)));
      } else {
        data.append(key, val);
      }
    });
    if (imageFile) data.append('image', imageFile);

    try {
      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, { method, body: data });
      const result = await res.json();

      if (res.ok) {
        resetForm();
        fetchProducts();
        fetchStats();
        setActiveTab('products');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Upload error', error);
      alert('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts: { _seconds: number } | undefined) => {
    if (!ts) return 'N/A';
    return new Date(ts._seconds * 1000).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="admin-page">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <span className="admin-sidebar__logo-icon">✦</span>
          <h2>Hastara</h2>
          <span className="admin-sidebar__badge">Admin</span>
        </div>
        <nav className="admin-sidebar__nav">
          {[
            { id: 'dashboard' as AdminTab, icon: '📊', label: 'Dashboard' },
            { id: 'products' as AdminTab, icon: '💎', label: 'Products' },
            { id: 'add-product' as AdminTab, icon: '➕', label: editingProduct ? 'Edit Product' : 'Add Product' },
            { id: 'orders' as AdminTab, icon: '📦', label: 'Orders' },
            { id: 'payments' as AdminTab, icon: '💳', label: 'Payments' },
          ].map(tab => (
            <button
              key={tab.id}
              className={`admin-sidebar__item ${activeTab === tab.id ? 'admin-sidebar__item--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <a href="/" className="admin-sidebar__back">← Back to Store</a>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* ===== DASHBOARD ===== */}
        {activeTab === 'dashboard' && (
          <div className="admin-tab">
            <h1 className="admin-tab__title">Dashboard</h1>
            <div className="admin-stats-grid">
              <div className="admin-stat-card admin-stat-card--products">
                <span className="admin-stat-card__icon">💎</span>
                <div>
                  <p className="admin-stat-card__value">{stats.totalProducts}</p>
                  <p className="admin-stat-card__label">Total Products</p>
                </div>
              </div>
              <div className="admin-stat-card admin-stat-card--orders">
                <span className="admin-stat-card__icon">📦</span>
                <div>
                  <p className="admin-stat-card__value">{stats.totalOrders}</p>
                  <p className="admin-stat-card__label">Total Orders</p>
                </div>
              </div>
              <div className="admin-stat-card admin-stat-card--revenue">
                <span className="admin-stat-card__icon">💰</span>
                <div>
                  <p className="admin-stat-card__value">₹{stats.totalRevenue.toLocaleString()}</p>
                  <p className="admin-stat-card__label">Total Revenue</p>
                </div>
              </div>
              <div className="admin-stat-card admin-stat-card--payments">
                <span className="admin-stat-card__icon">💳</span>
                <div>
                  <p className="admin-stat-card__value">{stats.totalPayments}</p>
                  <p className="admin-stat-card__label">Payments</p>
                </div>
              </div>
            </div>
            <div className="admin-quick-actions">
              <h2>Quick Actions</h2>
              <div className="admin-quick-actions__grid">
                <button className="admin-quick-btn" onClick={() => { resetForm(); setActiveTab('add-product'); }}>
                  ➕ Add New Product
                </button>
                <button className="admin-quick-btn" onClick={() => setActiveTab('products')}>
                  💎 Manage Products
                </button>
                <button className="admin-quick-btn" onClick={() => setActiveTab('orders')}>
                  📦 View Orders
                </button>
                <button className="admin-quick-btn" onClick={() => setActiveTab('payments')}>
                  💳 View Payments
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== PRODUCTS LIST ===== */}
        {activeTab === 'products' && (
          <div className="admin-tab">
            <div className="admin-tab__header">
              <h1 className="admin-tab__title">Products ({products.length})</h1>
              <button className="admin-add-btn" onClick={() => { resetForm(); setActiveTab('add-product'); }}>
                ➕ Add Product
              </button>
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Featured</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id}>
                      <td><img src={product.image} alt={product.name} className="admin-table__img" /></td>
                      <td className="admin-table__name">{product.name}</td>
                      <td>
                        <span className="admin-table__price">₹{product.price}</span>
                        {product.originalPrice > product.price && (
                          <span className="admin-table__og-price">₹{product.originalPrice}</span>
                        )}
                      </td>
                      <td><span className="admin-table__cat">{product.category}</span></td>
                      <td>
                        <span className={`admin-table__stock ${product.inStock ? 'admin-table__stock--in' : 'admin-table__stock--out'}`}>
                          {product.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td>{product.featured ? '⭐' : '—'}</td>
                      <td>
                        <div className="admin-table__actions">
                          <button className="admin-table__btn admin-table__btn--edit" onClick={() => handleEdit(product)}>
                            ✏️ Edit
                          </button>
                          <button className="admin-table__btn admin-table__btn--delete" onClick={() => handleDelete(product.id, product.name)}>
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== ADD/EDIT PRODUCT ===== */}
        {activeTab === 'add-product' && (
          <div className="admin-tab">
            <h1 className="admin-tab__title">{editingProduct ? `Edit: ${editingProduct.name}` : 'Add New Product'}</h1>
            <form className="admin-product-form" onSubmit={handleSubmit}>
              <div className="admin-form-grid">
                <div className="admin-form-left">
                  <div className="admin-form-group">
                    <label>Product Name *</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="e.g. Royal Kundan Studs" />
                  </div>
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Selling Price (₹) *</label>
                      <input type="number" name="price" value={formData.price} onChange={handleInputChange} required placeholder="349" />
                    </div>
                    <div className="admin-form-group">
                      <label>Original Price (₹)</label>
                      <input type="number" name="originalPrice" value={formData.originalPrice} onChange={handleInputChange} placeholder="599" />
                    </div>
                  </div>
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Category *</label>
                      <select name="category" value={formData.category} onChange={handleInputChange}>
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="admin-form-group">
                      <label>Tags (comma-separated)</label>
                      <input type="text" name="tags" value={formData.tags} onChange={handleInputChange} placeholder="Bestseller, Festive" />
                    </div>
                  </div>
                  <div className="admin-form-group">
                    <label>Short Description</label>
                    <input type="text" name="shortDescription" value={formData.shortDescription} onChange={handleInputChange} placeholder="Brief one-liner" />
                  </div>
                  <div className="admin-form-group">
                    <label>Full Description *</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} rows={4} required placeholder="Detailed product description..." />
                  </div>
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Material</label>
                      <input type="text" name="material" value={formData.material} onChange={handleInputChange} placeholder="Oxidized Silver Alloy" />
                    </div>
                    <div className="admin-form-group">
                      <label>Weight</label>
                      <input type="text" name="weight" value={formData.weight} onChange={handleInputChange} placeholder="18g (pair)" />
                    </div>
                    <div className="admin-form-group">
                      <label>Dimensions</label>
                      <input type="text" name="dimensions" value={formData.dimensions} onChange={handleInputChange} placeholder="7.5cm × 4cm" />
                    </div>
                  </div>
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>In Stock</label>
                      <select name="inStock" value={formData.inStock} onChange={handleInputChange}>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div className="admin-form-group">
                      <label>Featured</label>
                      <select name="featured" value={formData.featured} onChange={handleInputChange}>
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </div>
                    <div className="admin-form-group">
                      <label>Best Seller</label>
                      <select name="bestSeller" value={formData.bestSeller} onChange={handleInputChange}>
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </div>
                  </div>
                  <h3 style={{ marginTop: '20px', marginBottom: '15px', color: '#fff', fontSize: '1.1rem' }}>Shipping Package Details (Shiprocket)</h3>
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Dead Weight (kg) *</label>
                      <input type="number" step="0.01" name="packageWeight" value={formData.packageWeight} onChange={handleInputChange} required placeholder="0.5" />
                    </div>
                    <div className="admin-form-group">
                      <label>Length (cm) *</label>
                      <input type="number" step="0.1" name="packageLength" value={formData.packageLength} onChange={handleInputChange} required placeholder="10" />
                    </div>
                    <div className="admin-form-group">
                      <label>Breadth (cm) *</label>
                      <input type="number" step="0.1" name="packageBreadth" value={formData.packageBreadth} onChange={handleInputChange} required placeholder="10" />
                    </div>
                    <div className="admin-form-group">
                      <label>Height (cm) *</label>
                      <input type="number" step="0.1" name="packageHeight" value={formData.packageHeight} onChange={handleInputChange} required placeholder="5" />
                    </div>
                  </div>
                </div>
                <div className="admin-form-right">
                  <div className="admin-form-group">
                    <label>Product Image {editingProduct ? '(leave blank to keep current)' : '*'}</label>
                    <div className="admin-image-upload" onClick={() => fileInputRef.current?.click()}>
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="admin-image-upload__preview" />
                      ) : (
                        <div className="admin-image-upload__placeholder">
                          <span>📸</span>
                          <p>Click to upload image</p>
                        </div>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  </div>
                  <div className="admin-form-actions">
                    <button type="submit" className="admin-form-submit" disabled={loading}>
                      {loading ? '⏳ Saving...' : editingProduct ? '✅ Update Product' : '➕ Add Product'}
                    </button>
                    {editingProduct && (
                      <button type="button" className="admin-form-cancel" onClick={() => { resetForm(); setActiveTab('products'); }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ===== ORDERS ===== */}
        {activeTab === 'orders' && (
          <div className="admin-tab">
            <h1 className="admin-tab__title">Orders ({orders.length})</h1>
            {orders.length === 0 ? (
              <div className="admin-empty">
                <span>📦</span>
                <p>No orders yet. Once customers start buying, orders will show up here.</p>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>City</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td className="admin-table__name">{order.order_id}</td>
                        <td>{order.billing_customer_name}</td>
                        <td>{order.billing_email}</td>
                        <td>{order.billing_phone}</td>
                        <td>{order.billing_city}, {order.billing_state}</td>
                        <td className="admin-table__price">₹{order.sub_total}</td>
                        <td>{formatDate(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== PAYMENTS ===== */}
        {activeTab === 'payments' && (
          <div className="admin-tab">
            <h1 className="admin-tab__title">Payments ({payments.length})</h1>
            {payments.length === 0 ? (
              <div className="admin-empty">
                <span>💳</span>
                <p>No payments recorded yet.</p>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Txn ID</th>
                      <th>Customer</th>
                      <th>Email</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(payment => (
                      <tr key={payment.id}>
                        <td className="admin-table__name">{payment.txnid}</td>
                        <td>{payment.firstname}</td>
                        <td>{payment.email}</td>
                        <td className="admin-table__price">₹{payment.amount}</td>
                        <td>
                          <span className={`admin-table__status admin-table__status--${payment.status}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td>{formatDate(payment.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
