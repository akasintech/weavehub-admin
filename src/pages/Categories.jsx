import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
console.log(categories)
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(ENDPOINTS.category.list);
      const items = response.data?.data?.records || [];
      console.log(items)
      setCategories(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post(ENDPOINTS.category.create, formData);
      setIsModalOpen(false);
      setFormData({ name: '', description: '', icon: '' });
      fetchCategories();
    } catch (error) {
      console.error('Failed to create category:', error);
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1>Categories</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage product categories for the marketplace.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} /> Add Category
        </button>
      </header>

      <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
          </div>
        ) : categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No categories found. Create your first category above.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Icon</th>
                <th>Name</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category._id || category.id}>
                  <td>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {category.icon ? <img src={category.icon} alt={category.name} style={{ width: '24px', height: '24px' }} /> : <ImageIcon size={20} color="var(--text-muted)" />}
                    </div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{category.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{category.description || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.5rem' }}><Edit2 size={16} /></button>
                      <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'var(--danger)' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="card modal-content animate-fade-in" style={{ padding: '2rem', background: '#FFFFFF' }}>
            <div className="modal-header">
              <h2>Add New Category</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Categories;
