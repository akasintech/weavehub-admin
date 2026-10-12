import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Star,
  Search,
  Loader2,
  Plus,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  Package,
  Store,
  Check,
  Upload,
  X,
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react';
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

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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
  const [catalogFilter, setCatalogFilter] = useState('all'); // 'all' | 'unfeatured' | 'featured'
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // New Product Form State
  const [imageMode, setImageMode] = useState('upload'); // 'upload' | 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    description: '',
    storeId: '',
    categoryId: '',
    imageUrl: '',
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let res;
      try {
        res = await apiClient.get(ENDPOINTS.admin.products(1, 100));
      } catch (adminErr) {
        console.warn('Admin products fallback:', adminErr);
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
      console.warn('Could not load auxiliary data:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchAuxiliaryData();
  }, []);

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (filePreview && filePreview.startsWith('blob:')) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, JPEG, WEBP, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    if (filePreview && filePreview.startsWith('blob:')) {
      URL.revokeObjectURL(filePreview);
    }

    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
  };

  const handleRemoveFile = () => {
    if (filePreview && filePreview.startsWith('blob:')) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleToggleFeatured = async (product) => {
    const id = getProductId(product);
    if (!id) return;

    const currentStatus = !!(product.isFeatured || product.featured);
    const nextStatus = !currentStatus;

    setTogglingId(id);
    try {
      try {
        await apiClient.patch(ENDPOINTS.admin.updateProductFeatures(id), {
          isFeatured: nextStatus,
          featured: nextStatus,
        });
      } catch (patchErr) {
        await apiClient.patch(ENDPOINTS.product.updateProduct(id), {
          isFeatured: nextStatus,
          featured: nextStatus,
        });
      }

      setProducts((prev) =>
        prev.map((p) =>
          getProductId(p) === id
            ? { ...p, isFeatured: nextStatus, featured: nextStatus }
            : p
        )
      );

      if (nextStatus) {
        toast.success(`"${product.name || 'Product'}" posted to homepage featured!`);
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
      const selectedStoreId = newProduct.storeId || (stores[0]?._id || stores[0]?.id || undefined);

      // Step 1: Create Product
      const productPayload = {
        name: newProduct.name.trim(),
        description: newProduct.description.trim(),
        storeId: selectedStoreId,
        categoryIds: newProduct.categoryId ? [newProduct.categoryId] : [],
        isFeatured: true,
        featured: true,
      };

      const res = await apiClient.post(ENDPOINTS.product.create, productPayload);
      const created = res.data?.data || res.data?.product || res.data;
      const createdId = getProductId(created);

      if (!createdId) {
        throw new Error('Product created but no valid ID returned from server');
      }

      // Step 2: Upload Image if a file was selected
      if (selectedFile) {
        try {
          const mediaForm = new FormData();
          mediaForm.append('media', selectedFile);
          await apiClient.post(
            ENDPOINTS.product.uploadProductMedia(createdId),
            mediaForm,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
        } catch (mediaErr) {
          console.warn('Media upload warning:', mediaErr);
        }
      } else if (newProduct.imageUrl.trim()) {
        try {
          await apiClient.patch(ENDPOINTS.product.updateProduct(createdId), {
            mainImage: newProduct.imageUrl.trim(),
            images: [newProduct.imageUrl.trim()],
          });
        } catch (_) {}
      }

      // Step 3: Create Default Variant for Pricing
      try {
        await apiClient.post(ENDPOINTS.product.createProductVariants(createdId), {
          productId: createdId,
          variants: [
            {
              price: Number(newProduct.price),
              isDefault: true,
              inventory: { total: 100 },
            },
          ],
        });
      } catch (varErr) {
        // Fallback: try updateProduct with price directly
        try {
          await apiClient.patch(ENDPOINTS.product.updateProduct(createdId), {
            price: Number(newProduct.price),
          });
        } catch (_) {}
      }

      // Step 4: Ensure Featured Flag is set
      try {
        await apiClient.patch(ENDPOINTS.admin.updateProductFeatures(createdId), {
          isFeatured: true,
          featured: true,
        });
      } catch (_) {}

      toast.success('New product created and featured on homepage successfully!');
      setIsModalOpen(false);
      handleRemoveFile();
      setNewProduct({
        name: '',
        price: '',
        description: '',
        storeId: '',
        categoryId: '',
        imageUrl: '',
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

  // Catalog picker results in modal
  const catalogPickerResults = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return products.filter((p) => {
      const isFeat = !!(p.isFeatured || p.featured);
      if (catalogFilter === 'unfeatured' && isFeat) return false;
      if (catalogFilter === 'featured' && !isFeat) return false;

      const name = (p.name || '').toLowerCase();
      const storeName = (p.store?.name || p.storeName || '').toLowerCase();
      return !q || name.includes(q) || storeName.includes(q);
    });
  }, [products, catalogSearch, catalogFilter]);

  return (
    <div className="animate-fade-in">
      {/* ── Page Header ── */}
      <header className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1>Featured Products</h1>
            <span
              className="badge badge-featured"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
            >
              <Sparkles size={13} /> {featuredProducts.length} on Homepage
            </span>
          </div>
          <p>Curate top products to highlight in the homepage showcase and drive buyer engagement.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={fetchProducts}
            disabled={loading}
            title="Refresh product list"
          >
            <RefreshCw size={17} className={loading ? 'spin-icon' : ''} />
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setIsModalOpen(true);
              setModalTab('catalog');
            }}
          >
            <Plus size={19} />
            Post Featured Product
          </button>
        </div>
      </header>

      {/* ── Main Tab Navigation ── */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('featured')}
          className={`btn ${activeTab === 'featured' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.55rem 1.15rem', borderRadius: '10px' }}
        >
          <Star size={16} fill={activeTab === 'featured' ? 'currentColor' : 'none'} />
          Featured on Homepage ({featuredProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.55rem 1.15rem', borderRadius: '10px' }}
        >
          <Package size={16} />
          All Products Catalog ({products.length})
        </button>
      </div>

      {/* ── Search Toolbar ── */}
      <div className="card toolbar-panel">
        <div className="search-field">
          <Search size={18} />
          <input
            type="search"
            className="form-input"
            placeholder={
              activeTab === 'featured'
                ? 'Search active featured products by name or store…'
                : 'Search all catalog products to toggle homepage status…'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="badge badge-primary">
          {displayedProducts.length} {activeTab === 'featured' ? 'featured shown' : 'catalog shown'}
        </span>
      </div>

      {/* ── Product Table ── */}
      <div className="card table-panel">
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '3.5rem',
              gap: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            <Loader2 size={24} className="spin-icon" style={{ color: 'var(--primary)' }} />
            <span>Loading products…</span>
          </div>
        ) : displayedProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
            <Sparkles size={38} style={{ color: 'var(--accent)', marginBottom: '0.75rem' }} />
            {activeTab === 'featured' ? (
              <>
                <p style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', marginBottom: '0.35rem' }}>
                  No products currently featured on the homepage
                </p>
                <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                  Promote your best products to the homepage showcase to increase store sales and customer discovery.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setIsModalOpen(true);
                    setModalTab('catalog');
                  }}
                >
                  <Plus size={18} /> Post Your First Featured Product
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
                <th style={{ width: '65px' }}>Image</th>
                <th>Product Details</th>
                <th>Price</th>
                <th>Store / Vendor</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Homepage Visibility</th>
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
                          width: '48px',
                          height: '48px',
                          borderRadius: '10px',
                          background: 'var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          border: '1px solid #E5E7EB',
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
                          <ImageIcon size={22} color="var(--text-muted)" />
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--text-main)' }}>
                        {product.name || 'Unnamed Product'}
                      </div>
                      {product.description && (
                        <div
                          style={{
                            fontSize: '0.785rem',
                            color: 'var(--text-muted)',
                            maxWidth: '340px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '2px',
                          }}
                        >
                          {product.description}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-main)' }}>
                      {currencyFormatter.format(price)}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Store size={15} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: 500 }}>
                          {product.store?.name || product.storeName || 'Independent'}
                        </span>
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
                          gap: '0.45rem',
                          borderColor: isFeatured ? 'transparent' : 'var(--primary)',
                          color: isFeatured ? '#FFFFFF' : 'var(--primary)',
                        }}
                        title={
                          isFeatured
                            ? 'Click to remove from homepage featured showcase'
                            : 'Click to post to homepage featured showcase'
                        }
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
            style={{
              padding: '2rem',
              maxWidth: '680px',
              width: '100%',
              background: '#FFFFFF',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              borderRadius: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ marginBottom: '1.25rem' }}>
              <div>
                <span
                  className="badge badge-featured"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem', fontSize: '0.725rem' }}
                >
                  <Sparkles size={11} /> Homepage Showcase
                </span>
                <h2 style={{ fontSize: '1.35rem', margin: 0 }}>Post Featured Product</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
                  Feature an existing catalog item or upload a brand new product directly.
                </p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                background: '#F3F4F6',
                padding: '4px',
                borderRadius: '12px',
                marginBottom: '1.5rem',
              }}
            >
              <button
                type="button"
                onClick={() => setModalTab('catalog')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  background: modalTab === 'catalog' ? '#FFFFFF' : 'transparent',
                  color: modalTab === 'catalog' ? 'var(--text-main)' : 'var(--text-muted)',
                  boxShadow: modalTab === 'catalog' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Package size={17} style={{ color: modalTab === 'catalog' ? 'var(--primary)' : 'inherit' }} />
                Feature from Catalog
              </button>
              <button
                type="button"
                onClick={() => setModalTab('create')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  background: modalTab === 'create' ? '#FFFFFF' : 'transparent',
                  color: modalTab === 'create' ? 'var(--text-main)' : 'var(--text-muted)',
                  boxShadow: modalTab === 'create' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Plus size={17} style={{ color: modalTab === 'create' ? 'var(--primary)' : 'inherit' }} />
                Upload & Feature New
              </button>
            </div>

            {/* ── TAB 1: Catalog Picker ── */}
            {modalTab === 'catalog' ? (
              <div>
                {/* Search Bar & Quick Filters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="search-field" style={{ maxWidth: '100%' }}>
                    <Search size={18} />
                    <input
                      type="search"
                      className="form-input"
                      placeholder="Search products by title, vendor, or store…"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setCatalogFilter('all')}
                      className={`btn ${catalogFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', height: '28px', minHeight: 'unset' }}
                    >
                      All ({products.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogFilter('unfeatured')}
                      className={`btn ${catalogFilter === 'unfeatured' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', height: '28px', minHeight: 'unset' }}
                    >
                      Not Yet Featured ({products.filter((p) => !(p.isFeatured || p.featured)).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogFilter('featured')}
                      className={`btn ${catalogFilter === 'featured' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', height: '28px', minHeight: 'unset' }}
                    >
                      Already Featured ({featuredProducts.length})
                    </button>
                  </div>
                </div>

                {/* Scrollable Product List */}
                <div
                  style={{
                    maxHeight: '360px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                    paddingRight: '0.35rem',
                  }}
                >
                  {catalogPickerResults.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                      <Package size={32} style={{ color: '#D1D5DB', marginBottom: '0.5rem' }} />
                      <p style={{ margin: 0, fontWeight: 500 }}>No matching products found in catalog.</p>
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
                            padding: '0.85rem 1rem',
                            border: isFeatured ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                            background: isFeatured ? '#F0FDF4' : '#FFFFFF',
                            borderRadius: '12px',
                            gap: '1rem',
                            transition: 'var(--transition)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                            <div
                              style={{
                                width: '46px',
                                height: '46px',
                                borderRadius: '10px',
                                background: '#F3F4F6',
                                overflow: 'hidden',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #E5E7EB',
                              }}
                            >
                              {image ? (
                                <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <ImageIcon size={20} color="var(--text-muted)" />
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: '0.875rem',
                                  color: 'var(--text-main)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {product.name}
                              </div>
                              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                <strong style={{ color: 'var(--text-main)' }}>{currencyFormatter.format(price)}</strong>
                                {' · '}
                                <span>{product.store?.name || 'Independent Store'}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(product)}
                            disabled={isToggling}
                            className={`btn ${isFeatured ? 'btn-outline' : 'btn-primary'}`}
                            style={{
                              padding: '0.45rem 0.95rem',
                              fontSize: '0.8rem',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              minHeight: '36px',
                              gap: '0.35rem',
                              borderColor: isFeatured ? '#D1D5DB' : 'transparent',
                            }}
                          >
                            {isToggling ? (
                              <Loader2 size={15} className="spin-icon" />
                            ) : isFeatured ? (
                              <>
                                <Check size={15} style={{ color: 'var(--primary)' }} />
                                <span>Featured</span>
                              </>
                            ) : (
                              <>
                                <Star size={15} />
                                <span>Post to Featured</span>
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
              /* ── TAB 2: Upload & Feature New Product ── */
              <form onSubmit={handleCreateAndFeature}>
                {/* Product Name */}
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Premium Hand-Woven Cotton Robe"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>

                {/* Price & Category */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Price (₦ NGN) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input"
                      placeholder="e.g. 25000"
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

                {/* Store / Vendor Selection */}
                <div className="form-group">
                  <label className="form-label">Store / Vendor</label>
                  <select
                    className="form-input"
                    value={newProduct.storeId}
                    onChange={(e) => setNewProduct({ ...newProduct, storeId: e.target.value })}
                  >
                    <option value="">Select Store (Defaults to first active storefront)</option>
                    {stores.map((s) => (
                      <option key={s._id || s.id} value={s._id || s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ── IMAGE SECTION (Upload File or Link) ── */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>Product Image</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setImageMode('upload')}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: imageMode === 'upload' ? 'var(--primary)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          textDecoration: imageMode === 'upload' ? 'underline' : 'none',
                        }}
                      >
                        <Upload size={12} /> Upload File
                      </button>
                      <span style={{ color: '#D1D5DB', fontSize: '0.75rem' }}>|</span>
                      <button
                        type="button"
                        onClick={() => setImageMode('url')}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: imageMode === 'url' ? 'var(--primary)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          textDecoration: imageMode === 'url' ? 'underline' : 'none',
                        }}
                      >
                        <LinkIcon size={12} /> Paste Link
                      </button>
                    </div>
                  </div>

                  {imageMode === 'upload' ? (
                    <div>
                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleFileSelect(e.target.files[0]);
                          }
                        }}
                      />

                      {/* Preview Box if file is chosen */}
                      {filePreview ? (
                        <div className="upload-preview-box">
                          <img src={filePreview} alt="Product Preview" className="upload-preview-thumb" />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {selectedFile?.name || 'Selected image'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {formatFileSize(selectedFile?.size)} · Ready to upload
                            </div>
                          </div>
                          <button
                            type="button"
                            className="upload-preview-remove"
                            onClick={handleRemoveFile}
                            title="Remove image"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        /* Drag and Drop Zone */
                        <div
                          className={`upload-dropzone ${isDragging ? 'upload-dropzone--active' : ''}`}
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '50%',
                              background: '#E5E7EB',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <Upload size={22} />
                          </div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            Click to upload <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>or drag and drop</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            PNG, JPG, JPEG, or WEBP (Max 10MB)
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* URL fallback input */
                    <div>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://example.com/product-image.jpg"
                        value={newProduct.imageUrl}
                        onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                      />
                      {newProduct.imageUrl && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <img
                            src={newProduct.imageUrl}
                            alt="URL preview"
                            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>URL preview loaded</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    placeholder="Provide appealing highlights for this homepage showcase item…"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                </div>

                {/* Promotion Banner */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    background: '#ECFDF5',
                    color: '#065F46',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '1.5rem',
                    border: '1px solid #A7F3D0',
                  }}
                >
                  <Star size={18} fill="#10B981" style={{ flexShrink: 0 }} />
                  <span>This product will be published and instantly pinned to the marketplace homepage.</span>
                </div>

                {/* Form Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setIsModalOpen(false);
                      handleRemoveFile();
                    }}
                    disabled={isSubmittingNew}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmittingNew}
                    style={{ minWidth: '170px' }}
                  >
                    {isSubmittingNew ? (
                      <>
                        <Loader2 size={18} className="spin-icon" /> Publishing…
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} /> Publish & Feature
                      </>
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
