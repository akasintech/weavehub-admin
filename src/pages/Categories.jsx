import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Loader2, Image as ImageIcon, Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    isActive: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(ENDPOINTS.category.list);
      const items = response.data?.data?.records || response.data?.data || response.data || [];
      setCategories(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error(error.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', icon: '', isActive: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      icon: category.icon || '',
      isActive: category.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', icon: '', isActive: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        const id = editingCategory._id || editingCategory.id;
        const payload = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          icon: formData.icon.trim(),
          isActive: formData.isActive,
        };
        await apiClient.put(ENDPOINTS.category.update(id), payload);
        toast.success('Category updated successfully');
      } else {
        const payload = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          icon: formData.icon.trim(),
          isActive: formData.isActive,
        };
        await apiClient.post(ENDPOINTS.category.create, payload);
        toast.success('Category created successfully');
      }
      handleCloseModal();
      fetchCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error(error.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (category) => {
    const id = category._id || category.id;
    if (!id) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete category "${category.name}"?`
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await apiClient.delete(ENDPOINTS.category.delete(id));
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      console.warn('DELETE failed, checking fallback:', error);
      // If the backend has not exposed a hard DELETE route, soft-delete via isActive: false
      const isNotFound =
        error.message?.toLowerCase().includes('not found') ||
        error.message?.toLowerCase().includes('route not found');

      if (isNotFound) {
        try {
          await apiClient.put(ENDPOINTS.category.update(id), {
            name: category.name,
            description: category.description || '',
            icon: category.icon || '',
            isActive: false,
          });
          toast.success('Category deactivated (server does not support permanent deletion)');
          fetchCategories();
          return;
        } catch (fallbackError) {
          toast.error(fallbackError.message || 'Failed to deactivate category');
          return;
        }
      }
      toast.error(error.message || 'Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((cat) => {
      const name = (cat.name || '').toLowerCase();
      const desc = (cat.description || '').toLowerCase();
      return name.includes(query) || desc.includes(query);
    });
  }, [categories, searchQuery]);

  return (
    <div className="animate-fade-in">
      <header className="page-header">
        <div>
          <h1>Categories</h1>
          <p>Manage product categories for the marketplace.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="btn btn-outline" onClick={fetchCategories} title="Refresh categories">
            <RefreshCw size={18} /> Refresh
          </button>
          <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={20} /> Add Category
          </button>
        </div>
      </header>

      {/* Toolbar / Search */}
      <div className="card toolbar-panel">
        <div className="search-field">
          <Search size={18} />
          <input
            type="search"
            className="form-input"
            placeholder="Search categories by name or description…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="badge badge-primary">
          {searchQuery
            ? `${filteredCategories.length} of ${categories.length} total`
            : `${categories.length} total`}
        </span>
      </div>

      <div className="card table-panel">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem', gap: '0.75rem', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="spin-icon" style={{ color: 'var(--primary)' }} />
            <span>Loading categories…</span>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            {searchQuery
              ? `No categories match "${searchQuery}".`
              : 'No categories found. Create your first category above.'}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Icon</th>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => {
                const id = category._id || category.id;
                const isDeleting = deletingId === id;
                const isActive = category.isActive !== false;

                return (
                  <tr key={id}>
                    <td>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: 'var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {category.icon ? (
                          <img
                            src={category.icon}
                            alt={category.name}
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
                    <td style={{ fontWeight: 600 }}>{category.name}</td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: '300px' }}>
                      {category.description || '—'}
                    </td>
                    <td>
                      <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.5rem 0.75rem', minHeight: 38 }}
                          onClick={() => handleOpenEdit(category)}
                          title="Edit Category"
                          disabled={isDeleting}
                        >
                          <Edit2 size={16} />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{
                            padding: '0.5rem 0.75rem',
                            minHeight: 38,
                            color: 'var(--danger)',
                            borderColor: '#FCA5A5',
                          }}
                          onClick={() => handleDelete(category)}
                          title="Delete Category"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 size={16} className="spin-icon" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="card modal-content animate-fade-in"
            style={{ padding: '2rem', background: '#FFFFFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
              <button
                type="button"
                className="close-btn"
                onClick={handleCloseModal}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Footwear, Electronics"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '90px', resize: 'vertical' }}
                  placeholder="Brief description of products in this category…"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Icon / Image URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://example.com/icon.png"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                />
              </div>

              {editingCategory && (
                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <label htmlFor="isActiveCheck" style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                    Active (visible in marketplace)
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="spin-icon" /> Saving…
                    </>
                  ) : editingCategory ? (
                    'Update Category'
                  ) : (
                    'Create Category'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
