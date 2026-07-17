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
  sku?: string;
  hsnCode?: string;
  taxRate?: string;
}

interface OrderItem {
  name: string;
  sku?: string;
  units?: number;
  quantity?: number;
  selling_price?: number;
  price?: number;
  tax?: number;
  hsn?: string | number;
}

interface Order {
  id: string;
  order_id: string;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_email: string;
  billing_phone: string;
  billing_address?: string;
  billing_landmark?: string;
  billing_city: string;
  billing_state: string;
  billing_pincode?: string;
  sub_total: number;
  weight?: number;
  order_items?: OrderItem[];
  nimbuspost_order_id?: string;
  status?: string;
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
    packageWeight: '0.5', packageLength: '10', packageBreadth: '10', packageHeight: '5',
    sku: '', hsnCode: '', taxRate: '0'
  });
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!sessionStorage.getItem('admin_token'));
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const getToken = () => sessionStorage.getItem('admin_token') || '';
  const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}` });

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      fetchProducts();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'orders') fetchOrders();
      if (activeTab === 'payments') fetchPayments();
    }
  }, [activeTab, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('admin_token', data.token);
        setIsAuthenticated(true);
      } else {
        setLoginError('❌ Galat password hai. Dobara try karein.');
      }
    } catch {
      setLoginError('Server se connect nahi ho pa raha. Backend chal raha hai?');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setIsAuthenticated(false);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', { headers: authHeaders() });
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
      const res = await fetch('/api/admin/orders', { headers: authHeaders() });
      if (res.ok) setOrders(await res.json());
    } catch (e) { console.error('Failed to fetch orders', e); }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/admin/payments', { headers: authHeaders() });
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
      packageWeight: '0.5', packageLength: '10', packageBreadth: '10', packageHeight: '5',
      sku: '', hsnCode: '', taxRate: '0'
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
      sku: product.sku || '',
      hsnCode: product.hsnCode || '',
      taxRate: product.taxRate || '0',
    });
    setImagePreview(product.image);
    setActiveTab('add-product');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Kya aap sach me "${name}" ko delete karna chahte hain?`)) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
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

      const res = await fetch(url, {
        method,
        body: data,
        headers: authHeaders()
      });
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

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)'
      }}>
        <form onSubmit={handleLogin} style={{
          background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(196,164,132,0.3)', borderRadius: '20px',
          padding: '48px', minWidth: '360px', display: 'flex', flexDirection: 'column', gap: '20px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>✦</div>
            <h2 style={{ color: '#c4a484', margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>Hastara Admin</h2>
            <p style={{ color: '#888', margin: '8px 0 0', fontSize: '0.9rem' }}>Secure Access Required</p>
          </div>
          <div>
            <label style={{ color: '#a0a0b0', fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Admin Password</label>
            <input
              type="password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              placeholder="Enter admin password..."
              required
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '10px', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(196,164,132,0.3)',
                color: '#fff', fontSize: '1rem', outline: 'none'
              }}
            />
          </div>
          {loginError && <p style={{ color: '#ff6b6b', margin: 0, fontSize: '0.88rem', textAlign: 'center' }}>{loginError}</p>}
          <button
            type="submit"
            disabled={loginLoading}
            style={{
              background: loginLoading ? '#555' : 'linear-gradient(135deg, #c4a484, #8b6914)',
              color: '#fff', border: 'none', borderRadius: '10px', padding: '14px',
              fontSize: '1rem', fontWeight: 700, cursor: loginLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {loginLoading ? 'Verifying...' : '🔒 Login'}
          </button>
        </form>
      </div>
    );
  }

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
        <button
          onClick={handleLogout}
          style={{
            marginTop: '12px', background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)',
            color: '#ff6b6b', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer',
            fontSize: '0.9rem', width: '100%'
          }}
        >
          🚪 Logout
        </button>
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
                  <h3 style={{ marginTop: '20px', marginBottom: '15px', color: '#c4a484', fontSize: '1.1rem', borderBottom: '1px solid rgba(196,164,132,0.2)', paddingBottom: '8px' }}>📦 NimbusPost Shipping Details</h3>
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
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>SKU (Product Code)</label>
                      <input type="text" name="sku" value={formData.sku} onChange={handleInputChange} placeholder="e.g. HST-ERG-001" />
                    </div>
                    <div className="admin-form-group">
                      <label>HSN Code</label>
                      <input type="text" name="hsnCode" value={formData.hsnCode} onChange={handleInputChange} placeholder="e.g. 7117" />
                    </div>
                    <div className="admin-form-group">
                      <label>Tax Rate (GST %)</label>
                      <select name="taxRate" value={formData.taxRate} onChange={handleInputChange}>
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
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
            <div className="admin-tab__header">
              <h1 className="admin-tab__title">Orders ({orders.length})</h1>
              <button className="admin-quick-btn" style={{ fontSize: '0.85rem', padding: '8px 16px' }} onClick={fetchOrders}>🔄 Refresh</button>
            </div>
            {orders.length === 0 ? (
              <div className="admin-empty">
                <span>📦</span>
                <p>No orders yet. Once customers start buying, orders will show up here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {orders.map(order => (
                  <div key={order.id} style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,164,132,0.2)',
                    borderRadius: '14px', overflow: 'hidden'
                  }}>
                    {/* Order Summary Row */}
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 20px', cursor: 'pointer', gap: '12px', flexWrap: 'wrap'
                      }}
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '140px' }}>
                        <span style={{ color: '#c4a484', fontWeight: 700, fontSize: '0.9rem' }}>{order.order_id}</span>
                        <span style={{ color: '#888', fontSize: '0.78rem' }}>{formatDate(order.created_at)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 600 }}>{order.billing_customer_name} {order.billing_last_name || ''}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ color: '#a0a0b0', fontSize: '0.85rem' }}>📱 {order.billing_phone}</span>
                        <span style={{ color: '#a0a0b0', fontSize: '0.85rem' }}>📍 {order.billing_city}, {order.billing_state}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '1rem' }}>₹{order.sub_total}</span>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                          background: order.status === 'New' ? 'rgba(196,164,132,0.15)' : 'rgba(74,222,128,0.15)',
                          color: order.status === 'New' ? '#c4a484' : '#4ade80',
                          border: `1px solid ${order.status === 'New' ? 'rgba(196,164,132,0.4)' : 'rgba(74,222,128,0.4)'}`
                        }}>{order.status || 'New'}</span>
                        <span style={{ color: '#888', fontSize: '1rem' }}>{expandedOrder === order.id ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedOrder === order.id && (
                      <div style={{
                        borderTop: '1px solid rgba(196,164,132,0.15)', padding: '20px',
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'
                      }}>
                        {/* Customer Info */}
                        <div>
                          <h4 style={{ color: '#c4a484', fontSize: '0.85rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>👤 Customer Details</h4>
                          <p style={{ color: '#ddd', fontSize: '0.88rem', margin: '4px 0' }}>✉️ {order.billing_email}</p>
                          <p style={{ color: '#ddd', fontSize: '0.88rem', margin: '4px 0' }}>📱 {order.billing_phone}</p>
                          <p style={{ color: '#ddd', fontSize: '0.88rem', margin: '4px 0', lineHeight: 1.5 }}>📍 {order.billing_address}{order.billing_landmark ? `, ${order.billing_landmark}` : ''}, {order.billing_city}, {order.billing_state} - {order.billing_pincode}</p>
                          {order.nimbuspost_order_id && (
                            <p style={{ color: '#a0a0b0', fontSize: '0.82rem', margin: '8px 0 0', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                              🚚 NimbusPost ID: <strong style={{ color: '#c4a484' }}>{order.nimbuspost_order_id}</strong>
                            </p>
                          )}
                        </div>

                        {/* Package Info */}
                        <div>
                          <h4 style={{ color: '#c4a484', fontSize: '0.85rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>📦 Package Details</h4>
                          <p style={{ color: '#ddd', fontSize: '0.88rem', margin: '4px 0' }}>⚖️ Dead Weight: {order.weight ? `${order.weight} kg` : 'N/A'}</p>
                          <p style={{ color: '#ddd', fontSize: '0.88rem', margin: '4px 0' }}>📏 Dimensions: {order.length ? `${order.length} x ${order.breadth} x ${order.height} cm` : 'N/A'}</p>
                        </div>

                        {/* Items */}
                        {order.order_items && order.order_items.length > 0 && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <h4 style={{ color: '#c4a484', fontSize: '0.85rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🛍️ Order Items</h4>
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                  <tr style={{ background: 'rgba(196,164,132,0.08)' }}>
                                    {['Product', 'SKU', 'Qty', 'Unit Price', 'HSN', 'Tax %', 'Subtotal'].map(h => (
                                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#c4a484', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.order_items.map((item, idx) => {
                                    const qty = item.units || item.quantity || 1;
                                    const price = item.selling_price || item.price || 0;
                                    return (
                                      <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '8px 12px', color: '#fff' }}>{item.name}</td>
                                        <td style={{ padding: '8px 12px', color: '#a0a0b0', fontFamily: 'monospace' }}>{item.sku || '—'}</td>
                                        <td style={{ padding: '8px 12px', color: '#fff' }}>{qty}</td>
                                        <td style={{ padding: '8px 12px', color: '#4ade80' }}>₹{price}</td>
                                        <td style={{ padding: '8px 12px', color: '#a0a0b0' }}>{item.hsn || '—'}</td>
                                        <td style={{ padding: '8px 12px', color: '#a0a0b0' }}>{item.tax !== undefined ? `${item.tax}%` : '—'}</td>
                                        <td style={{ padding: '8px 12px', color: '#4ade80', fontWeight: 600 }}>₹{(qty * price).toFixed(2)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== PAYMENTS ===== */}
        {activeTab === 'payments' && (
          <div className="admin-tab">
            <div className="admin-tab__header">
              <h1 className="admin-tab__title">Payments ({payments.length})</h1>
              <button className="admin-quick-btn" style={{ fontSize: '0.85rem', padding: '8px 16px' }} onClick={fetchPayments}>🔄 Refresh</button>
            </div>
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
                      <th>Phone</th>
                      <th>Products</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(payment => (
                      <tr key={payment.id}>
                        <td className="admin-table__name" style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{payment.txnid}</td>
                        <td>{payment.firstname}</td>
                        <td>{payment.email}</td>
                        <td>{(payment as any).phone || '—'}</td>
                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#a0a0b0', fontSize: '0.82rem' }}>{(payment as any).productinfo || '—'}</td>
                        <td className="admin-table__price">₹{payment.amount}</td>
                        <td>
                          <span className={`admin-table__status admin-table__status--${payment.status}`}>
                            {payment.status === 'success' ? '✅ Success' : payment.status === 'demo' ? '🧪 Demo' : payment.status === 'failed' ? '❌ Failed' : payment.status}
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
