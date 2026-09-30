import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { Package, ShoppingBag, Store, Users, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    stores: 0,
    orders: 0,
    products: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');
      try {
        // Attempt to fetch from analytics or pagination APIs to get basic stats
        // First try the new admin analytics if it exists, otherwise fallback to page=1 counts
        const userRes = await apiClient.get(ENDPOINTS.admin.users(1, 1));
        const storeRes = await apiClient.get(ENDPOINTS.admin.stores(1, 1));
        
        setStats(prev => ({
          ...prev,
          users: userRes.data?.data?.total || userRes.data?.total || 0,
          stores: storeRes.data?.data?.total || storeRes.data?.total || 0,
        }));
      } catch (err) {
        console.error("Failed to load some dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const metricCards = [
    { title: 'Total Users', value: stats.users, icon: <Users size={24} />, color: '#3B82F6', bg: '#EFF6FF' },
    { title: 'Active Stores', value: stats.stores, icon: <Store size={24} />, color: '#2ECC71', bg: '#ECFDF5' },
    { title: 'Total Products', value: '---', icon: <Package size={24} />, color: '#FF8C42', bg: '#FFF7ED' },
    { title: 'Total Orders', value: '---', icon: <ShoppingBag size={24} />, color: '#8B5CF6', bg: '#F5F3FF' },
    { title: 'Total Revenue', value: '---', icon: <DollarSign size={24} />, color: '#10B981', bg: '#ECFDF5' },
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
              <strong>{card.value}</strong>
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
