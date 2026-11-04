import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('chat_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('chat_token'));
  const [loading, setLoading] = useState(true);

  // Check auth status on load
  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('chat_token');
    if (!storedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem('chat_user', JSON.stringify(res.data.user));
        connectSocket(storedToken);
      } else {
        logout();
      }
    } catch (err) {
      console.warn('Auth check failed:', err.response?.data?.message || err.message);
      logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login handler
  const login = async (loginId, password, rememberMe = false) => {
    const res = await api.post('/auth/login', { loginId, password, rememberMe });
    if (res.data.success) {
      const { user: userData, token: userToken } = res.data;
      setUser(userData);
      setToken(userToken);
      localStorage.setItem('chat_token', userToken);
      localStorage.setItem('chat_user', JSON.stringify(userData));
      connectSocket(userToken);
      return userData;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  // Register handler (supports FormData for avatar)
  const register = async (formData) => {
    const isFormData = formData instanceof FormData;
    const res = await api.post('/auth/register', formData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });

    if (res.data.success) {
      const { user: userData, token: userToken } = res.data;
      setUser(userData);
      setToken(userToken);
      localStorage.setItem('chat_token', userToken);
      localStorage.setItem('chat_user', JSON.stringify(userData));
      connectSocket(userToken);
      return userData;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  // Logout handler
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore error on logout
    } finally {
      disconnectSocket();
      setUser(null);
      setToken(null);
      localStorage.removeItem('chat_token');
      localStorage.removeItem('chat_user');
    }
  };

  // Update profile
  const updateProfile = async (formData) => {
    const isFormData = formData instanceof FormData;
    const res = await api.put('/users/profile', formData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });

    if (res.data.success) {
      setUser(res.data.user);
      localStorage.setItem('chat_user', JSON.stringify(res.data.user));
      return res.data.user;
    }
    throw new Error(res.data.message || 'Profile update failed');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
