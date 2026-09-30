import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { Package, ShoppingBag, Store, Users, Shield, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    users: null,
    stores: null,
    products: null,
    vendors: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [userRes, storeRes, productRes] = await Promise.allSettled([
          apiClient.get(ENDPOINTS.admin.users(1, 500)),   // large limit to count vendors by role
          apiClient.get(ENDPOINTS.admin.stores(1, 1)),
          apiClient.get(ENDPOINTS.admin.products(1, 1)),
        ]);

        const getApiTotal = (res) => {
          if (res.status !== 'fulfilled') return null;
          const d = res.value?.data;
          return d?.data?.total ?? d?.data?.pagination?.total ?? d?.total ?? null;
        };

        // Derive vendor count by filtering the users array by role
        let vendorCount = null;
        if (userRes.status === 'fulfilled') {
          const d = userRes.value?.data;
          const usersArray =
            d?.data?.users ?? d?.data?.records ?? d?.users ?? d?.data ?? [];
          if (Array.isArray(usersArray)) {
            vendorCount = usersArray.filter(
              (u) => String(u.role).toLowerCase() === 'vendor'
            ).length || null;
          }
          // Also check if the API provides it directly
          vendorCount =
            d?.data?.vendorCount ?? d?.vendorCount ?? vendorCount;
        }

        setStats({
          users: getApiTotal(userRes),
          stores: getApiTotal(storeRes),
          products: getApiTotal(productRes),
          vendors: vendorCount,
        });
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatVal = (val) => {
    if (loading) return <Loader2 size={20} className="spin-icon" style={{ color: 'var(--text-muted)' }} />;
    if (val === null || val === undefined) return '—';
    return Number(val).toLocaleString();
  };

  const metricCards = [
    { title: 'Total Users', value: stats.users, icon: <Users size={24} />, color: '#3B82F6', bg: '#EFF6FF' },
    { title: 'Active Stores', value: stats.stores, icon: <Store size={24} />, color: '#2ECC71', bg: '#ECFDF5' },
    { title: 'Total Products', value: stats.products, icon: <Package size={24} />, color: '#FF8C42', bg: '#FFF7ED' },
    { title: 'Total Vendors', value: stats.vendors, icon: <Shield size={24} />, color: '#8B5CF6', bg: '#F5F3FF' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Welcome back! Here's an overview of the WeaveHub platform.</p>
        </div>
      </div>

      <div className="metrics-grid">
        {metricCards.map((card, idx) => (
          <div key={idx} className="card metric-card">
            <div className="metric-icon" style={{ background: card.bg, color: card.color }}>
              {card.icon}
            </div>
            <div>
              <span>{card.title}</span>
              <strong>{formatVal(card.value)}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="split-grid">
        <div className="card">
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1rem', margin: 0 }}>Recent Activity</h2>
          </div>
          <div className="list-panel">
            <div className="empty-panel" style={{ minHeight: '150px' }}>
              <TrendingUp size={32} style={{ color: 'var(--text-muted)' }} />
              <p>Activity stream coming soon</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1rem', margin: 0 }}>System Alerts</h2>
          </div>
          <div className="list-panel">
            <div className="empty-panel" style={{ minHeight: '150px' }}>
              <AlertTriangle size={32} style={{ color: 'var(--text-muted)' }} />
              <p>No new system alerts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
