import React, { useState, useEffect, useMemo } from 'react';
import { Star, Search, Loader2, Plus, RefreshCw, Image as ImageIcon, Sparkles, Package, Store, Check, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

function getProductList(payload) {
  const source =
    payload?.data?.records ||
    payload?.data?.products ||
    payload?.records ||
    payload?.products ||
    payload?.data ||
    payload;
  return Array.isArray(source) ? source : [];
}

function getProductId(product) {
  return product?._id || product?.id;
}

function getProductPrice(product) {
  return Number(product?.price || product?.defaultVariant?.price || 0);
}

function getProductImage(product) {
  return (
    product?.mainImage ||
    product?.image ||
    product?.images?.[0] ||
    product?.media?.[0]?.url ||
    product?.media?.[0] ||
    null
  );
}

const FeaturedProducts = () => {
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('featured'); // 'featured' | 'all'
  const [togglingId, setTogglingId] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('catalog'); // 'catalog' | 'create'
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    description: '',
    storeId: '',
    categoryId: '',
    image: '',
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Fetch admin products (or public search fallback)
      let res;
      try {
        res = await apiClient.get(ENDPOINTS.admin.products(1, 100));
      } catch (adminErr) {
        console.warn('Admin products endpoint fallback:', adminErr);
        res = await apiClient.get(ENDPOINTS.product.publicSearch);
      }

      const list = getProductList(res?.data);
      setProducts(list);
    } catch (err) {
      console.error('Failed to load products:', err);
      toast.error(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxiliaryData = async () => {
    try {
      const [storeRes, catRes] = await Promise.allSettled([
        apiClient.get(ENDPOINTS.store.getAllStores),
        apiClient.get(ENDPOINTS.category.list),
      ]);

      if (storeRes.status === 'fulfilled') {
        const storeList = storeRes.value.data?.data?.records || storeRes.value.data?.data || storeRes.value.data || [];
        setStores(Array.isArray(storeList) ? storeList : []);
      }

      if (catRes.status === 'fulfilled') {
        const catList = catRes.value.data?.data?.records || catRes.value.data?.data || catRes.value.data || [];
        setCategories(Array.isArray(catList) ? catList : []);
      }
    } catch (err) {
      console.warn('Could not load auxiliary stores/categories:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchAuxiliaryData();
  }, []);

  const handleToggleFeatured = async (product) => {
    const id = getProductId(product);
    if (!id) return;

    const currentStatus = !!(product.isFeatured || product.featured);
    const nextStatus = !currentStatus;

    setTogglingId(id);
    try {
      // Update backend via dedicated admin features endpoint
      try {
        await apiClient.patch(ENDPOINTS.admin.updateProductFeatures(id), {
          isFeatured: nextStatus,
          featured: nextStatus,
        });
      } catch (patchErr) {
        // Fallback to general product update endpoint
        await apiClient.patch(ENDPOINTS.product.updateProduct(id), {
          isFeatured: nextStatus,
          featured: nextStatus,
        });
      }

      // Update in state
      setProducts((prev) =>
        prev.map((p) =>
          getProductId(p) === id
            ? { ...p, isFeatured: nextStatus, featured: nextStatus }
            : p
        )
      );

      if (nextStatus) {
        toast.success(`"${product.name || 'Product'}" posted to featured!`);
      } else {
        toast.success(`"${product.name || 'Product'}" removed from featured.`);
      }
    } catch (err) {
      console.error('Failed to toggle featured status:', err);
      toast.error(err.message || 'Failed to update featured status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateAndFeature = async (e) => {
    e.preventDefault();
    if (!newProduct.name.trim() || !newProduct.price) {
      toast.error('Product name and price are required');
      return;
    }

    setIsSubmittingNew(true);
    try {
      const payload = {
        name: newProduct.name.trim(),
        price: Number(newProduct.price),
        description: newProduct.description.trim(),
        storeId: newProduct.storeId || (stores[0]?._id || stores[0]?.id || undefined),
        categoryId: newProduct.categoryId || undefined,
        images: newProduct.image ? [newProduct.image.trim()] : [],
        isFeatured: true,
        featured: true,
      };

      const res = await apiClient.post(ENDPOINTS.product.create, payload);
      const created = res.data?.data || res.data?.product || res.data;
      const createdId = getProductId(created);

      // Ensure featured flag is set
      if (createdId) {
        try {
          await apiClient.patch(ENDPOINTS.admin.updateProductFeatures(createdId), {
            isFeatured: true,
            featured: true,
          });
        } catch (_) {}
      }

      toast.success('New featured product posted successfully!');
      setIsModalOpen(false);
      setNewProduct({
        name: '',
        price: '',
        description: '',
        storeId: '',
        categoryId: '',
        image: '',
      });
      fetchProducts();
    } catch (err) {
      console.error('Failed to create featured product:', err);
      toast.error(err.message || 'Failed to post new product');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Filtered lists
  const featuredProducts = useMemo(() => {
    return products.filter((p) => !!(p.isFeatured || p.featured));
  }, [products]);

  const displayedProducts = useMemo(() => {
    const baseList = activeTab === 'featured' ? featuredProducts : products;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return baseList;

    return baseList.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const storeName = (p.store?.name || p.storeName || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return name.includes(q) || storeName.includes(q) || desc.includes(q);
    });
  }, [activeTab, featuredProducts, products, searchQuery]);

  // Catalog picker in modal (shows unfeatured products or all products)
  const catalogPickerResults = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return products.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const storeName = (p.store?.name || p.storeName || '').toLowerCase();
      return !q || name.includes(q) || storeName.includes(q);
    });
  }, [products, catalogSearch]);

  return (
    <div className="animate-fade-in">
      <header className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1>Featured Products</h1>
            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Sparkles size={12} /> {featuredProducts.length} Featured
            </span>
          </div>
          <p>Curate and post products to highlight prominently on the marketplace homepage.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={fetchProducts}
            disabled={loading}
            title="Refresh product list"
          >
            <RefreshCw size={18} className={loading ? 'spin-icon' : ''} />
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={20} />
            Post Featured Product
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('featured')}
          className={`btn ${activeTab === 'featured' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.5rem 1rem', borderRadius: '10px' }}
        >
          <Star size={16} fill={activeTab === 'featured' ? 'currentColor' : 'none'} />
          Featured on Homepage ({featuredProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.5rem 1rem', borderRadius: '10px' }}
        >
          <Package size={16} />
          All Products Catalog ({products.length})
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="card toolbar-panel">
        <div className="search-field">
          <Search size={18} />
          <input
            type="search"
            className="form-input"
            placeholder={
              activeTab === 'featured'
                ? 'Search featured products by name or store…'
                : 'Search all catalog products to feature them…'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="badge badge-primary">
          {displayedProducts.length} {activeTab === 'featured' ? 'featured shown' : 'catalog shown'}
        </span>
      </div>

      {/* Table */}
      <div className="card table-panel">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3.5rem', gap: '0.75rem', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="spin-icon" style={{ color: 'var(--primary)' }} />
            <span>Loading products…</span>
          </div>
        ) : displayedProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
            <Sparkles size={36} style={{ color: 'var(--accent)', marginBottom: '0.75rem' }} />
            {activeTab === 'featured' ? (
              <>
                <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  No featured products right now
                </p>
                <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  Post products to the homepage to boost visibility and sales.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Plus size={18} /> Post First Featured Product
                </button>
              </>
            ) : (
              <p>No products matched your search query.</p>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Image</th>
                <th>Product Name</th>
                <th>Price</th>
                <th>Store / Vendor</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Featured Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.map((product) => {
                const id = getProductId(product);
                const isFeatured = !!(product.isFeatured || product.featured);
                const isToggling = togglingId === id;
                const image = getProductImage(product);
                const price = getProductPrice(product);

                return (
                  <tr key={id}>
                    <td>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '8px',
                          background: 'var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={product.name || 'Product'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <ImageIcon size={20} color="var(--text-muted)" />
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{product.name || 'Unnamed Product'}</div>
                      {product.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {product.description}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {currencyFormatter.format(price)}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Store size={14} />
                        <span>{product.store?.name || product.storeName || 'Independent'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${product.status === 'active' ? 'badge-success' : 'badge-primary'}`}>
                        {product.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(product)}
                        disabled={isToggling}
                        className={`btn ${isFeatured ? 'btn-primary' : 'btn-outline'}`}
                        style={{
                          padding: '0.5rem 1rem',
                          minHeight: 38,
                          gap: '0.4rem',
                          borderColor: isFeatured ? 'transparent' : 'var(--primary)',
                          color: isFeatured ? '#FFFFFF' : 'var(--primary)',
                        }}
                        title={isFeatured ? 'Click to remove from homepage featured section' : 'Click to post to homepage featured section'}
                      >
                        {isToggling ? (
                          <Loader2 size={16} className="spin-icon" />
                        ) : (
                          <Star size={16} fill={isFeatured ? 'currentColor' : 'none'} />
                        )}
                        {isFeatured ? 'Featured on Home' : 'Post to Featured'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Post Featured Product Modal ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="card modal-content animate-fade-in"
            style={{ padding: '2rem', maxWidth: '650px', background: '#FFFFFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Post Featured Product</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Select an existing product to feature or create a new one directly.
                </p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setModalTab('catalog')}
                className={`btn ${modalTab === 'catalog' ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1, padding: '0.5rem' }}
              >
                <Package size={16} /> Choose from Catalog
              </button>
              <button
                type="button"
                onClick={() => setModalTab('create')}
                className={`btn ${modalTab === 'create' ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1, padding: '0.5rem' }}
              >
                <Plus size={16} /> Create & Feature New
              </button>
            </div>

            {/* TAB 1: Catalog Picker */}
            {modalTab === 'catalog' ? (
              <div>
                <div className="search-field" style={{ maxWidth: '100%', marginBottom: '1rem' }}>
                  <Search size={18} />
                  <input
                    type="search"
                    className="form-input"
                    placeholder="Search by product name, store, or price…"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    autoFocus
                  />
                </div>

                <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingRight: '0.25rem' }}>
                  {catalogPickerResults.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No matching products found.
                    </div>
                  ) : (
                    catalogPickerResults.map((product) => {
                      const id = getProductId(product);
                      const isFeatured = !!(product.isFeatured || product.featured);
                      const isToggling = togglingId === id;
                      const image = getProductImage(product);
                      const price = getProductPrice(product);

                      return (
                        <div
                          key={id}
                          className="card"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem 1rem',
                            border: isFeatured ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                            background: isFeatured ? '#F0FDF4' : '#FFFFFF',
                            gap: '1rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                background: '#F3F4F6',
                                overflow: 'hidden',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {image ? (
                                <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <ImageIcon size={18} color="var(--text-muted)" />
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {product.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {currencyFormatter.format(price)} · {product.store?.name || 'Store'}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(product)}
                            disabled={isToggling}
                            className={`btn ${isFeatured ? 'btn-outline' : 'btn-primary'}`}
                            style={{
                              padding: '0.4rem 0.85rem',
                              fontSize: '0.8rem',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            {isToggling ? (
                              <Loader2 size={14} className="spin-icon" />
                            ) : isFeatured ? (
                              <>
                                <Check size={14} /> Featured
                              </>
                            ) : (
                              <>
                                <Star size={14} /> Post to Featured
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* TAB 2: Create & Feature Form */
              <form onSubmit={handleCreateAndFeature}>
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Handmade Woolen Sweater"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Price (₦) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input"
                      placeholder="15000"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-input"
                      value={newProduct.categoryId}
                      onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                    >
                      <option value="">Select Category (Optional)</option>
                      {categories.map((c) => (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Store / Vendor</label>
                  <select
                    className="form-input"
                    value={newProduct.storeId}
                    onChange={(e) => setNewProduct({ ...newProduct, storeId: e.target.value })}
                  >
                    <option value="">Select Store (Defaults to first active store)</option>
                    {stores.map((s) => (
                      <option key={s._id || s.id} value={s._id || s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Image URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://example.com/product-image.jpg"
                    value={newProduct.image}
                    onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    placeholder="Provide highlights for this featured item…"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    background: '#ECFDF5',
                    color: '#065F46',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '1.25rem',
                  }}
                >
                  <Star size={18} fill="#10B981" />
                  This product will be published and featured on the homepage immediately.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmittingNew}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmittingNew}
                  >
                    {isSubmittingNew ? (
                      <>
                        <Loader2 size={18} className="spin-icon" /> Posting…
                      </>
                    ) : (
                      'Post & Feature Product'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeaturedProducts;
