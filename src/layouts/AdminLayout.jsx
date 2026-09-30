import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart3, Headphones, LayoutDashboard, Menu, Package,
  ShoppingBag, Star, Store, Tags, UserCheck, Users, LogOut, X
} from 'lucide-react';

const AdminLayout = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { path: '/',        label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/users',    label: 'Users',     icon: <Users size={20} /> },
    { path: '/vendors',  label: 'Vendors',   icon: <UserCheck size={20} /> },
    { path: '/products', label: 'Products',  icon: <Package size={20} /> },
    { path: '/stores',   label: 'Stores',    icon: <Store size={20} /> },
    { path: '/orders',   label: 'Orders',    icon: <ShoppingBag size={20} /> },
    { path: '/support',  label: 'Support',   icon: <Headphones size={20} /> },
    { path: '/analytics',label: 'Analytics', icon: <BarChart3 size={20} /> },
    { path: '/categories',label:'Categories',icon: <Tags size={20} /> },
    { path: '/featured-products', label: 'Featured', icon: <Star size={20} /> },
  ];

  return (
    <div className="app-container">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          <Menu size={22} />
        </button>
        <span className="mobile-logo">WeaveHub</span>
      </div>

      <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#2ECC71', marginBottom: '0.5rem' }}>
              WeaveHub
            </h2>
            <span className="badge badge-success">Admin Portal</span>
          </div>
          {/* Close button — visible only on mobile */}
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, marginTop: '2.5rem' }}>
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="nav-link"
          style={{ marginTop: 'auto', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#EF4444' }}
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
