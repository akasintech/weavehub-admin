import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_LIMIT = 20;

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

/* ─────────────────────────────────────────────────────────────
   Response parsers
───────────────────────────────────────────────────────────── */

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

function getTotal(payload) {
  return (
    payload?.data?.total ??
    payload?.data?.pagination?.total ??
    payload?.data?.meta?.total ??
    payload?.total ??
    payload?.pagination?.total ??
    payload?.meta?.total ??
    null
  );
}

/* ─────────────────────────────────────────────────────────────
   Misc helpers
───────────────────────────────────────────────────────────── */

function getId(record) {
  return record?._id || record?.id || record?.orderId || record?.ticketId;
}

function getValue(record, key) {
  if (typeof key === 'function') return key(record);
  return key.split('.').reduce((v, part) => v?.[part], record);
}

/* ─────────────────────────────────────────────────────────────
   Small UI atoms
───────────────────────────────────────────────────────────── */

function StatusBadge({ value }) {
  const normalized = String(value || 'unknown').toLowerCase();
  const positive = ['active', 'approved', 'delivered', 'completed', 'sent', 'open'].includes(normalized);
  const negative = ['blocked', 'suspended', 'cancelled', 'failed', 'deleted', 'closed'].includes(normalized);
  const cls = positive ? 'badge-success' : negative ? 'badge-danger' : 'badge-primary';
  return <span className={`badge ${cls}`}>{normalized}</span>;
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

/* ─────────────────────────────────────────────────────────────
   Pagination component
   Works with or without a known total:
   • If totalPages is known  → shows numbered pages + first/last
   • If totalPages is null   → shows only Prev / Next
───────────────────────────────────────────────────────────── */

function Pagination({ page, totalPages, hasNext, hasPrev, onPageChange, loading }) {
  const atFirst = !hasPrev;
  const atLast  = !hasNext;

  // Build windowed page list when total is known
  const pageNumbers = (() => {
    if (!totalPages) return [];
    const pages = [];
    const delta = 2;
    const left  = Math.max(1, page - delta);
    const right = Math.min(totalPages, page + delta);
    if (left > 1)          { pages.push(1); if (left > 2)          pages.push('…'); }
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages) { if (right < totalPages - 1) pages.push('…'); pages.push(totalPages); }
    return pages;
  })();

  return (
    <div className="pagination">
      {/* ⟨⟨ First — only when total is known */}
      {totalPages && (
        <button
          className="pagination-btn"
          onClick={() => onPageChange(1)}
          disabled={atFirst || loading}
          title="First page"
        >
          <ChevronsLeft size={15} />
        </button>
      )}

      {/* ⟨ Prev */}
      <button
        className="pagination-btn"
        onClick={() => onPageChange(page - 1)}
        disabled={atFirst || loading}
        title="Previous page"
      >
        <ChevronLeft size={15} />
        <span className="pag-label">Prev</span>
      </button>

      {/* Numbered pages */}
      {pageNumbers.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="pagination-ellipsis">…</span>
        ) : (
          <button
            key={p}
            className={`pagination-btn${p === page ? ' pagination-btn--active' : ''}`}
            onClick={() => onPageChange(p)}
            disabled={loading}
          >
            {p}
          </button>
        )
      )}

      {/* Page X / Y label when no numbered pages (unknown total) */}
      {!totalPages && (
        <span className="pagination-current">Page {page}</span>
      )}

      {/* Next ⟩ */}
      <button
        className="pagination-btn"
        onClick={() => onPageChange(page + 1)}
        disabled={atLast || loading}
        title="Next page"
      >
        <span className="pag-label">Next</span>
        <ChevronRight size={15} />
      </button>

      {/* Last ⟩⟩ — only when total is known */}
      {totalPages && (
        <button
          className="pagination-btn"
          onClick={() => onPageChange(totalPages)}
          disabled={atLast || loading}
          title="Last page"
        >
          <ChevronsRight size={15} />
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Page configs
───────────────────────────────────────────────────────────── */

const pageConfigs = {
  users: {
    title: 'Users',
    description: 'Review customers and vendors, update access, and clean up risky accounts.',
    endpoint: (page, limit) => ENDPOINTS.admin.users(page, limit),
    searchPlaceholder: 'Search name, email, or role…',
    columns: [
      { label: 'Name',   value: (r) => r.fullName || `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Unnamed' },
      { label: 'Email',  value: 'email' },
      { label: 'Role',   value: 'role' },
      { label: 'Status', value: 'status', type: 'status' },
    ],
    actions: [
      { label: 'Activate',    icon: <CheckCircle size={16} />, request: (id) => apiClient.patch(ENDPOINTS.admin.updateUserStatus(id), { status: 'active' }) },
      { label: 'Suspend',     icon: <XCircle size={16} />,     request: (id) => apiClient.patch(ENDPOINTS.admin.updateUserStatus(id), { status: 'suspended' }) },
      { label: 'Make Vendor', icon: <Shield size={16} />,      request: (id) => apiClient.patch(ENDPOINTS.admin.updateUserRole(id),   { role: 'vendor' }) },
      { label: 'Delete', icon: <Trash2 size={16} />, danger: true, request: (id) => apiClient.delete(ENDPOINTS.admin.deleteUser(id)), confirm: 'Delete this user account?' },
    ],
  },

  vendors: {
    title: 'Vendors',
    description: 'Manage vendor accounts — suspend, reactivate or remove vendor access.',
    // Vendors = users with role filter; falls back to full users list if API doesn't support ?role=
    endpoint: (page, limit) => `${ENDPOINTS.admin.users(page, limit)}&role=vendor`,
    searchPlaceholder: 'Search name, email, or status…',
    columns: [
      { label: 'Name',   value: (r) => r.fullName || `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Unnamed' },
      { label: 'Email',  value: 'email' },
      { label: 'Status', value: 'status', type: 'status' },
    ],
    actions: [
      { label: 'Activate', icon: <CheckCircle size={16} />, request: (id) => apiClient.patch(ENDPOINTS.admin.updateUserStatus(id), { status: 'active' }) },
      { label: 'Suspend',  icon: <XCircle size={16} />,     request: (id) => apiClient.patch(ENDPOINTS.admin.updateUserStatus(id), { status: 'suspended' }) },
      { label: 'Delete', icon: <Trash2 size={16} />, danger: true, request: (id) => apiClient.delete(ENDPOINTS.admin.deleteUser(id)), confirm: 'Delete this vendor account?' },
    ],
    // Client-side role filter fallback (runs after fetch)
    clientFilter: (records) => records.filter((r) => String(r.role || '').toLowerCase() === 'vendor'),
  },

  products: {
    title: 'Products',
    description: 'Moderate listings, publish or hide products, and manage homepage visibility.',
    endpoint: (page, limit) => ENDPOINTS.admin.products(page, limit),
    searchPlaceholder: 'Search product, category, or store…',
    columns: [
      { label: 'Product',  value: 'name' },
      { label: 'Store',    value: (r) => r.store?.name || r.storeName || 'Unknown store' },
      { label: 'Price',    value: (r) => currencyFormatter.format(Number(r.price || 0)) },
      { label: 'Status',   value: 'status', type: 'status' },
      { label: 'Featured', value: (r) => (r.isFeatured || r.featured ? 'Yes' : 'No') },
    ],
    actions: [
      { label: 'Approve', icon: <CheckCircle size={16} />,    request: (id) => apiClient.patch(ENDPOINTS.admin.updateProductStatus(id),   { status: 'active' }) },
      { label: 'Hide',    icon: <XCircle size={16} />,         request: (id) => apiClient.patch(ENDPOINTS.admin.updateProductStatus(id),   { status: 'inactive' }) },
      {
        label: (r) => (r.isFeatured || r.featured ? 'Unfeature' : 'Feature'),
        icon: <SlidersHorizontal size={16} />,
        request: (id, r) => {
          const nextVal = !(r?.isFeatured || r?.featured);
          return apiClient.patch(ENDPOINTS.admin.updateProductFeatures(id), { isFeatured: nextVal, featured: nextVal });
        },
      },
      { label: 'Delete', icon: <Trash2 size={16} />, danger: true, request: (id) => apiClient.delete(ENDPOINTS.admin.deleteProduct(id)), confirm: 'Delete this product listing?' },
    ],
  },

  stores: {
    title: 'Stores',
    description: 'Approve storefronts, suspend unsafe stores, and remove inactive vendors.',
    endpoint: (page, limit) => ENDPOINTS.admin.stores(page, limit),
    searchPlaceholder: 'Search store, owner, or status…',
    columns: [
      { label: 'Store',   value: 'name' },
      { label: 'Tagline', value: (r) => r.tagLine || r.tagline || 'No tagline' },
      { label: 'Owner',   value: (r) => r.owner?.email || r.vendor?.email || r.user?.email || 'Unknown' },
      { label: 'Status',  value: 'status', type: 'status' },
    ],
    actions: [
      { label: 'Approve', icon: <CheckCircle size={16} />, request: (id) => apiClient.patch(ENDPOINTS.admin.updateStoreStatus(id), { status: 'active' }) },
      { label: 'Suspend', icon: <XCircle size={16} />,     request: (id) => apiClient.patch(ENDPOINTS.admin.updateStoreStatus(id), { status: 'suspended' }) },
      { label: 'Delete', icon: <Trash2 size={16} />, danger: true, request: (id) => apiClient.delete(ENDPOINTS.admin.deleteStore(id)), confirm: 'Delete this store?' },
    ],
  },

  orders: {
    title: 'Orders',
    description: 'Inspect platform orders and resolve fulfillment or payment exceptions.',
    endpoint: (page, limit) => ENDPOINTS.order.adminOrders(page, limit),
    searchPlaceholder: 'Search order, product, buyer, or status…',
    columns: [
      { label: 'Order',   value: (r) => `#${String(getId(r) || '').slice(-8)}` },
      { label: 'Product', value: (r) => r.product?.name || r.productName || r.items?.[0]?.name || 'Order item' },
      { label: 'Amount',  value: (r) => currencyFormatter.format(Number(r.amount || r.total || r.totalAmount || 0)) },
      { label: 'Payment', value: (r) => r.paymentStatus || r.payment?.status || 'pending', type: 'status' },
      { label: 'Status',  value: 'status', type: 'status' },
    ],
    actions: [
      { label: 'Processing', icon: <RefreshCw size={16} />,    request: (id) => apiClient.patch(ENDPOINTS.order.updateStatus(id), { status: 'processing' }) },
      { label: 'Delivered',  icon: <CheckCircle size={16} />, request: (id) => apiClient.patch(ENDPOINTS.order.updateStatus(id), { status: 'delivered' }) },
      { label: 'Cancel', icon: <XCircle size={16} />, danger: true, request: (id) => apiClient.patch(ENDPOINTS.order.updateStatus(id), { status: 'cancelled' }), confirm: 'Cancel this order?' },
    ],
  },

  support: {
    title: 'Support Tickets',
    description: 'Reply to customer/vendor issues and close resolved tickets.',
    endpoint: () => ENDPOINTS.supportTicket.list,
    searchPlaceholder: 'Search subject, message, or status…',
    columns: [
      { label: 'Subject',  value: (r) => r.subject || r.title || 'Support ticket' },
      { label: 'Message',  value: (r) => r.message || r.description || '' },
      { label: 'Priority', value: 'priority' },
      { label: 'Status',   value: 'status', type: 'status' },
    ],
    actions: [
      {
        label: 'Reply', icon: <RefreshCw size={16} />,
        request: async (id) => {
          const msg = window.prompt('Reply message');
          if (!msg?.trim()) return null;
          return apiClient.post(ENDPOINTS.supportTicket.reply(id), { message: msg.trim() });
        },
      },
      { label: 'Close',  icon: <CheckCircle size={16} />, request: (id) => apiClient.patch(ENDPOINTS.supportTicket.updateStatus(id), { status: 'closed' }) },
      { label: 'Reopen', icon: <RefreshCw size={16} />,   request: (id) => apiClient.patch(ENDPOINTS.supportTicket.updateStatus(id), { status: 'open' }) },
    ],
  },
};

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */

export default function AdminResourcePage({ resource }) {
  const config = pageConfigs[resource];

  const [records,    setRecords]    = useState([]);
  const [totalCount, setTotalCount] = useState(null);
  const [page,       setPage]       = useState(1);
  const [limit,      setLimit]      = useState(DEFAULT_LIMIT);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [query,      setQuery]      = useState('');
  const [busyId,     setBusyId]     = useState('');

  // Track whether we received a full page (so we know if there might be a next page
  // even when the API doesn't return a total count)
  const gotFullPage = records.length >= limit;

  const totalPages = totalCount !== null
    ? Math.max(1, Math.ceil(totalCount / limit))
    : null;

  const hasNext = totalPages !== null ? page < totalPages : gotFullPage;
  const hasPrev = page > 1;

  // Use a ref so loadRecords never goes stale and never causes effect loops
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);

  const loadRecords = useCallback(async (targetPage, targetLimit) => {
    setLoading(true);
    setError('');
    try {
      const url = configRef.current.endpoint(targetPage, targetLimit);
      const res = await apiClient.get(url);
      let rows = getRecords(res.data);

      // Apply optional client-side filter (e.g. vendors by role)
      if (configRef.current.clientFilter) {
        rows = configRef.current.clientFilter(rows);
      }

      setRecords(rows);
      setTotalCount(getTotal(res.data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []); // no deps — reads page/limit via parameters, config via ref

  // Reset to page 1 whenever the resource tab changes
  useEffect(() => {
    setPage(1);
    setQuery('');
    setTotalCount(null);
  }, [resource]);

  // Fetch whenever page, limit, or resource changes
  useEffect(() => {
    loadRecords(page, limit);
  }, [loadRecords, page, limit, resource]);

  // Client-side search filter (across the current page)
  const filteredRecords = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return records;
    return records.filter((r) => JSON.stringify(r).toLowerCase().includes(needle));
  }, [query, records]);

  const handlePageChange = (newPage) => {
    if (newPage < 1) return;
    if (totalPages && newPage > totalPages) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setPage(1);
  };

  const runAction = async (action, record) => {
    const id = getId(record);
    if (!id) return;
    const actionLabel = typeof action.label === 'function' ? action.label(record) : action.label;
    if (action.confirm && !window.confirm(action.confirm)) return;
    setBusyId(`${id}:${actionLabel}`);
    setError('');
    try {
      await action.request(id, record);
      await loadRecords(page, limit);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  // Count label in the toolbar
  const countLabel = (() => {
    if (query) return `${filteredRecords.length} matched on this page`;
    if (totalCount !== null) {
      const from = (page - 1) * limit + 1;
      const to   = Math.min(page * limit, totalCount);
      return `${from.toLocaleString()}–${to.toLocaleString()} of ${totalCount.toLocaleString()} total`;
    }
    return `${records.length} on this page`;
  })();

  const showPagination = !query && (hasPrev || hasNext || (totalPages && totalPages > 1));

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <header className="page-header">
        <div>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => loadRecords(page, limit)}>
          <RefreshCw size={18} />
          Refresh
        </button>
      </header>

      {/* Toolbar */}
      <div className="card toolbar-panel">
        <div className="search-field">
          <Search size={18} />
          <input
            type="search"
            className="form-input"
            placeholder={config.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <span className="badge badge-primary">{countLabel}</span>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Per page
            <select
              value={limit}
              onChange={handleLimitChange}
              className="form-input"
              style={{ padding: '0.35rem 0.5rem', width: 'auto', borderRadius: 8, fontSize: '0.8rem' }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Data table */}
      <div className="card table-panel">
        {loading ? (
          <EmptyPanel message={<><Loader2 className="spin-icon" size={24} /> Loading {config.title.toLowerCase()}…</>} />
        ) : filteredRecords.length ? (
          <table className="data-table">
            <thead>
              <tr>
                {config.columns.map((col) => <th key={col.label}>{col.label}</th>)}
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const id = getId(record);
                return (
                  <tr key={id || JSON.stringify(record)}>
                    {config.columns.map((col) => {
                      const val = getValue(record, col.value);
                      return (
                        <td key={col.label}>
                          {col.type === 'status'
                            ? <StatusBadge value={val} />
                            : <span>{String(val ?? 'Not provided')}</span>}
                        </td>
                      );
                    })}
                    <td>
                      <div className="table-actions">
                        {config.actions.map((action) => {
                          const actionLabel = typeof action.label === 'function' ? action.label(record) : action.label;
                          return (
                            <ActionButton
                              key={actionLabel}
                              label={actionLabel}
                              icon={action.icon}
                              danger={action.danger}
                              disabled={busyId === `${id}:${actionLabel}`}
                              onClick={() => runAction(action, record)}
                            />
                          );
                        })}
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

      {/* ── Pagination footer ── */}
      {showPagination && (
        <div className="pagination-footer">
          <span className="pagination-info">
            {totalPages
              ? <>Page <strong>{page}</strong> of <strong>{totalPages.toLocaleString()}</strong></>
              : <>Page <strong>{page}</strong></>}
          </span>

          <Pagination
            page={page}
            totalPages={totalPages}
            hasNext={hasNext}
            hasPrev={hasPrev}
            onPageChange={handlePageChange}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}
