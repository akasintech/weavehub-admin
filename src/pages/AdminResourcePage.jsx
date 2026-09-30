import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  SlidersHorizontal,
  Trash2,
  XCircle,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

function getRecords(payload) {
  const source =
    payload?.data?.records ||
    payload?.data?.orders ||
    payload?.data?.users ||
    payload?.data?.products ||
    payload?.data?.stores ||
    payload?.data?.tickets ||
    payload?.records ||
    payload?.orders ||
    payload?.users ||
    payload?.products ||
    payload?.stores ||
    payload?.tickets ||
    payload?.data ||
    payload;

  return Array.isArray(source) ? source : [];
}

function getId(record) {
  return record?._id || record?.id || record?.orderId || record?.ticketId;
}

function getValue(record, key) {
  if (typeof key === 'function') return key(record);
  return key.split('.').reduce((value, part) => value?.[part], record);
}

function StatusBadge({ value }) {
  const normalized = String(value || 'unknown').toLowerCase();
  const positive = ['active', 'approved', 'delivered', 'completed', 'sent', 'open'].includes(normalized);
  const negative = ['blocked', 'suspended', 'cancelled', 'failed', 'deleted', 'closed'].includes(normalized);
  const className = positive ? 'badge-success' : negative ? 'badge-danger' : 'badge-primary';

  return <span className={`badge ${className}`}>{normalized}</span>;
}

function EmptyPanel({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
      {message}
    </div>
  );
}

function ActionButton({ label, icon, danger, disabled, onClick }) {
  return (
    <button
      type="button"
      className={`btn ${danger ? 'btn-danger' : 'btn-outline'}`}
      disabled={disabled}
      onClick={onClick}
      style={{ minHeight: 40, padding: '0.5rem 0.75rem' }}
    >
      {icon}
      {label}
    </button>
  );
}

const pageConfigs = {
  users: {
    title: 'Users',
    description: 'Review customers and vendors, update access, and clean up risky accounts.',
    endpoint: () => ENDPOINTS.admin.users(),
    searchPlaceholder: 'Search name, email, or role...',
    columns: [
      { label: 'Name', value: (row) => row.fullName || `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Unnamed user' },
      { label: 'Email', value: 'email' },
      { label: 'Role', value: 'role' },
      { label: 'Status', value: 'status', type: 'status' },
    ],
    actions: [
      {
        label: 'Activate',
        icon: <CheckCircle size={16} />,
        request: (id) => apiClient.patch(ENDPOINTS.admin.updateUserStatus(id), { status: 'active' }),
      },
      {
        label: 'Suspend',
        icon: <XCircle size={16} />,
        request: (id) => apiClient.patch(ENDPOINTS.admin.updateUserStatus(id), { status: 'suspended' }),
      },
      {
        label: 'Make Vendor',
        icon: <Shield size={16} />,
        request: (id) => apiClient.patch(ENDPOINTS.admin.updateUserRole(id), { role: 'vendor' }),
      },
      {
        label: 'Delete',
        icon: <Trash2 size={16} />,
        danger: true,
        request: (id) => apiClient.delete(ENDPOINTS.admin.deleteUser(id)),
        confirm: 'Delete this user account?',
      },
    ],
  },
  products: {
    title: 'Products',
    description: 'Moderate listings, publish or hide products, and manage homepage visibility.',
    endpoint: () => ENDPOINTS.admin.products(),
    searchPlaceholder: 'Search product, category, or store...',
    columns: [
      { label: 'Product', value: 'name' },
      { label: 'Store', value: (row) => row.store?.name || row.storeName || 'Unknown store' },
      { label: 'Price', value: (row) => currencyFormatter.format(Number(row.price || 0)) },
      { label: 'Status', value: 'status', type: 'status' },
      { label: 'Featured', value: (row) => (row.isFeatured || row.featured ? 'Yes' : 'No') },
    ],
    actions: [
      {
        label: 'Approve',
        icon: <CheckCircle size={16} />,
        request: (id) => apiClient.patch(ENDPOINTS.admin.updateProductStatus(id), { status: 'active' }),
      },
      {
        label: 'Hide',
        icon: <XCircle size={16} />,
        request: (id) => apiClient.patch(ENDPOINTS.admin.updateProductStatus(id), { status: 'inactive' }),
      },
      {
        label: 'Feature',
        icon: <SlidersHorizontal size={16} />,
        request: (id) => apiClient.patch(ENDPOINTS.admin.updateProductFeatures(id), { isFeatured: true, featured: true }),
      },
      {
        label: 'Delete',
        icon: <Trash2 size={16} />,
        danger: true,
        request: (id) => apiClient.delete(ENDPOINTS.admin.deleteProduct(id)),
        confirm: 'Delete this product listing?',
      },
    ],
  },
  stores: {
    title: 'Stores',
    description: 'Approve storefronts, suspend unsafe stores, and remove inactive vendors.',
    endpoint: () => ENDPOINTS.admin.stores(),
    searchPlaceholder: 'Search store, owner, or status...',
    columns: [
      { label: 'Store', value: 'name' },
      { label: 'Tagline', value: (row) => row.tagLine || row.tagline || 'No tagline' },
      { label: 'Owner', value: (row) => row.owner?.email || row.vendor?.email || row.user?.email || 'Unknown owner' },
      { label: 'Status', value: 'status', type: 'status' },
    ],
    actions: [
      {
        label: 'Approve',
        icon: <CheckCircle size={16} />,
        request: (id) => apiClient.patch(ENDPOINTS.admin.updateStoreStatus(id), { status: 'active' }),
      },
      {
        label: 'Suspend',
        icon: <XCircle size={16} />,
        request: (id) => apiClient.patch(ENDPOINTS.admin.updateStoreStatus(id), { status: 'suspended' }),
      },
      {
        label: 'Delete',
        icon: <Trash2 size={16} />,
        danger: true,
        request: (id) => apiClient.delete(ENDPOINTS.admin.deleteStore(id)),
        confirm: 'Delete this store?',
      },
    ],
  },
  orders: {
    title: 'Orders',
    description: 'Inspect platform orders and resolve fulfillment or payment exceptions.',
    endpoint: () => ENDPOINTS.order.adminOrders(),
    searchPlaceholder: 'Search order, product, buyer, or status...',
    columns: [
      { label: 'Order', value: (row) => `#${String(getId(row) || '').slice(-8)}` },
      { label: 'Product', value: (row) => row.product?.name || row.productName || row.items?.[0]?.name || 'Order item' },
      { label: 'Amount', value: (row) => currencyFormatter.format(Number(row.amount || row.total || row.totalAmount || 0)) },
      { label: 'Payment', value: (row) => row.paymentStatus || row.payment?.status || 'pending', type: 'status' },
      { label: 'Status', value: 'status', type: 'status' },
    ],
    actions: [
      {
        label: 'Processing',
        icon: <RefreshCw size={16} />,
        request: (id) => apiClient.patch(ENDPOINTS.order.updateStatus(id), { status: 'processing' }),
      },
      {
        label: 'Delivered',
        icon: <CheckCircle size={16} />,
        request: (id) => apiClient.patch(ENDPOINTS.order.updateStatus(id), { status: 'delivered' }),
      },
      {
        label: 'Cancel',
        icon: <XCircle size={16} />,
        danger: true,
        request: (id) => apiClient.patch(ENDPOINTS.order.updateStatus(id), { status: 'cancelled' }),
        confirm: 'Cancel this order?',
      },
    ],
  },
  support: {
    title: 'Support Tickets',
    description: 'Reply to customer/vendor issues and close resolved tickets.',
    endpoint: () => ENDPOINTS.supportTicket.list,
    searchPlaceholder: 'Search subject, message, or status...',
    columns: [
      { label: 'Subject', value: (row) => row.subject || row.title || 'Support ticket' },
      { label: 'Message', value: (row) => row.message || row.description || '' },
      { label: 'Priority', value: 'priority' },
      { label: 'Status', value: 'status', type: 'status' },
    ],
    actions: [
      {
        label: 'Reply',
        icon: <RefreshCw size={16} />,
        request: async (id) => {
          const message = window.prompt('Reply message');
          if (!message?.trim()) return null;
          return apiClient.post(ENDPOINTS.supportTicket.reply(id), { message: message.trim() });
        },
      },
      {
        label: 'Close',
        icon: <CheckCircle size={16} />,
        request: (id) => apiClient.patch(ENDPOINTS.supportTicket.updateStatus(id), { status: 'closed' }),
      },
      {
        label: 'Reopen',
        icon: <RefreshCw size={16} />,
        request: (id) => apiClient.patch(ENDPOINTS.supportTicket.updateStatus(id), { status: 'open' }),
      },
    ],
  },
};

export default function AdminResourcePage({ resource }) {
  const config = pageConfigs[resource];
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState('');

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(config.endpoint());
      setRecords(getRecords(response.data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filteredRecords = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return records;

    return records.filter((record) =>
      JSON.stringify(record).toLowerCase().includes(needle),
    );
  }, [query, records]);

  const runAction = async (action, record) => {
    const id = getId(record);
    if (!id) return;
    if (action.confirm && !window.confirm(action.confirm)) return;

    setBusyId(`${id}:${action.label}`);
    setError('');
    try {
      await action.request(id, record);
      await loadRecords();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="animate-fade-in">
      <header className="page-header">
        <div>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={loadRecords}>
          <RefreshCw size={18} />
          Refresh
        </button>
      </header>

      <div className="card toolbar-panel">
        <div className="search-field">
          <Search size={18} />
          <input
            type="search"
            className="form-input"
            placeholder={config.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <span className="badge badge-primary">{filteredRecords.length} shown</span>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="card table-panel">
        {loading ? (
          <EmptyPanel message={<><Loader2 className="spin-icon" size={24} /> Loading {config.title.toLowerCase()}...</>} />
        ) : filteredRecords.length ? (
          <table className="data-table">
            <thead>
              <tr>
                {config.columns.map((column) => (
                  <th key={column.label}>{column.label}</th>
                ))}
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const id = getId(record);

                return (
                  <tr key={id || JSON.stringify(record)}>
                    {config.columns.map((column) => {
                      const value = getValue(record, column.value);
                      return (
                        <td key={column.label}>
                          {column.type === 'status' ? (
                            <StatusBadge value={value} />
                          ) : (
                            <span>{String(value || 'Not provided')}</span>
                          )}
                        </td>
                      );
                    })}
                    <td>
                      <div className="table-actions">
                        {config.actions.map((action) => (
                          <ActionButton
                            key={action.label}
                            {...action}
                            disabled={busyId === `${id}:${action.label}`}
                            onClick={() => runAction(action, record)}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyPanel message={`No ${config.title.toLowerCase()} found.`} />
        )}
      </div>
    </div>
  );
}
