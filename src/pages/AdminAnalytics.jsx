import React, { useEffect, useState } from 'react';
import { Loader2, ShoppingBag, Store, TrendingUp } from 'lucide-react';
import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

function normalizeAnalytics(payload = {}) {
  const source = payload?.data || payload;
  return {
    revenue: source.revenue || source.totalRevenue || source.sales || 0,
    orders: source.orders || source.totalOrders || source.orderCount || 0,
    topProducts: source.topProducts || source.products || [],
    topStores: source.topStores || source.stores || [],
    salesTimeline: source.salesTimeline || source.timeline || [],
  };
}

function MetricCard({ label, value, icon }) {
  return (
    <div className="card metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ListPanel({ title, items, getName, getValue, empty }) {
  return (
    <section className="card list-panel">
      <h2>{title}</h2>
      {items.length ? (
        items.slice(0, 8).map((item, index) => (
          <div key={item._id || item.id || index} className="list-row">
            <span>{getName(item, index)}</span>
            <strong>{getValue(item)}</strong>
          </div>
        ))
      ) : (
        <p className="muted-copy">{empty}</p>
      )}
    </section>
  );
}

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const response = await apiClient.get(ENDPOINTS.analytics.adminProducts);
        setAnalytics(normalizeAnalytics(response.data));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  return (
    <div className="animate-fade-in">
      <header className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>Platform-wide revenue, products, stores, and sales trends.</p>
        </div>
      </header>

      {loading ? (
        <div className="card empty-panel">
          <Loader2 className="spin-icon" size={24} />
          Loading analytics...
        </div>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : (
        <>
          <div className="metrics-grid">
            <MetricCard
              label="Revenue"
              value={currencyFormatter.format(Number(analytics?.revenue || 0))}
              icon={<TrendingUp size={22} />}
            />
            <MetricCard
              label="Orders"
              value={String(analytics?.orders || 0)}
              icon={<ShoppingBag size={22} />}
            />
            <MetricCard
              label="Top Products"
              value={String(analytics?.topProducts?.length || 0)}
              icon={<ShoppingBag size={22} />}
            />
            <MetricCard
              label="Top Stores"
              value={String(analytics?.topStores?.length || 0)}
              icon={<Store size={22} />}
            />
          </div>

          <div className="split-grid">
            <ListPanel
              title="Top Products"
              items={analytics?.topProducts || []}
              getName={(item) => item.name || item.productName || 'Product'}
              getValue={(item) => currencyFormatter.format(Number(item.revenue || item.total || item.sales || 0))}
              empty="Product performance appears after completed sales."
            />
            <ListPanel
              title="Top Stores"
              items={analytics?.topStores || []}
              getName={(item) => item.name || item.storeName || 'Store'}
              getValue={(item) => currencyFormatter.format(Number(item.revenue || item.total || item.sales || 0))}
              empty="Store rankings appear after completed sales."
            />
          </div>

          <ListPanel
            title="Sales Timeline"
            items={analytics?.salesTimeline || []}
            getName={(item, index) => item.date || item.label || `Point ${index + 1}`}
            getValue={(item) => currencyFormatter.format(Number(item.revenue || item.amount || item.value || 0))}
            empty="Timeline data appears after order activity."
          />
        </>
      )}
    </div>
  );
}
