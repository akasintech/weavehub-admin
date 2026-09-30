import React, { createContext, useState, useEffect, useContext } from 'react';
import { TOKEN_STORAGE_KEY } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_STORAGE_KEY));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setIsAuthenticated(false);
    }
  }, [token]);

  const login = (newToken) => {
    setToken(newToken);
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
