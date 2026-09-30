import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, Headphones, LayoutDashboard, Package, ShoppingBag, Star, Store, Tags, Users, LogOut } from 'lucide-react';

const AdminLayout = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/users', label: 'Users', icon: <Users size={20} /> },
    { path: '/products', label: 'Products', icon: <Package size={20} /> },
    { path: '/stores', label: 'Stores', icon: <Store size={20} /> },
    { path: '/orders', label: 'Orders', icon: <ShoppingBag size={20} /> },
    { path: '/support', label: 'Support', icon: <Headphones size={20} /> },
    { path: '/analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
    { path: '/categories', label: 'Categories', icon: <Tags size={20} /> },
    { path: '/featured-products', label: 'Featured', icon: <Star size={20} /> },
  ];

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div>
          <h2 style={{ fontSize: '1.5rem', color: '#2ECC71', marginBottom: '0.5rem' }}>
            WeaveHub
          </h2>
          <span className="badge badge-success">Admin Portal</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, marginTop: '2.5rem' }}>
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
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
