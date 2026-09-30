import React, { useState, useEffect } from 'react';
import { Star, Search, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

const FeaturedProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Assuming we might need to fetch a list of currently featured products initially
  // For now, let's just implement the UI to search and toggle "featured" status

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await apiClient.get(`${ENDPOINTS.product.search}?q=${searchQuery}`);
      const items = response.data?.data?.records || response.data?.data || response.data?.products || response.data || [];
      setProducts(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFeatured = async (productId, currentStatus) => {
    // Assuming backend takes a boolean or we call a specific feature endpoint
    try {
      // Optimistic update
      setProducts(products.map(p => p.id === productId || p._id === productId ? { ...p, isFeatured: !currentStatus } : p));
      
      // Actual API call
      // await apiClient.put(ENDPOINTS.product.update(productId), { isFeatured: !currentStatus });
      // Or if there's a dedicated feature endpoint:
      // await apiClient.post(ENDPOINTS.product.feature(productId));
      
      // For now, we simulate success
    } catch (error) {
      console.error('Failed to update featured status:', error);
      // Revert on failure
      setProducts(products.map(p => p.id === productId || p._id === productId ? { ...p, isFeatured: currentStatus } : p));
    }
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1>Featured Products</h1>
        <p style={{ color: 'var(--text-muted)' }}>Curate products to highlight on the marketplace homepage.</p>
      </header>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Search size={18} />
            </div>
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search products by name to feature them..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isSearching}>
            {isSearching ? <Loader2 size={20} className="animate-spin" /> : 'Search'}
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Search for products to manage their featured status.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Price</th>
                <th>Store/Vendor</th>
                <th style={{ textAlign: 'right' }}>Featured Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id || product.id}>
                  <td style={{ fontWeight: 500 }}>{product.name || 'Unnamed Product'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>${product.price || '0.00'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{product.store?.name || 'Unknown Store'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      onClick={() => toggleFeatured(product._id || product.id, product.isFeatured)}
                      className={`btn ${product.isFeatured ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      <Star size={16} fill={product.isFeatured ? "currentColor" : "none"} />
                      {product.isFeatured ? 'Featured' : 'Feature'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FeaturedProducts;
