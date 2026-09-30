import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import FeaturedProducts from './pages/FeaturedProducts';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminResourcePage from './pages/AdminResourcePage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/featured-products" element={<FeaturedProducts />} />
                <Route path="/users" element={<AdminResourcePage resource="users" />} />
                <Route path="/products" element={<AdminResourcePage resource="products" />} />
                <Route path="/stores" element={<AdminResourcePage resource="stores" />} />
                <Route path="/orders" element={<AdminResourcePage resource="orders" />} />
                <Route path="/support" element={<AdminResourcePage resource="support" />} />
                <Route path="/analytics" element={<AdminAnalytics />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
