import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from '../utils/axiosSetup';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const readCachedUser = () => {
  try {
    const cachedUser = localStorage.getItem('user:v1');
    return cachedUser ? JSON.parse(cachedUser) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readCachedUser());
  const [loading, setLoading] = useState(true);

  const fetchUser = async (token, persist = true) => {
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
      const response = await axios.get(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      if (persist) {
        localStorage.setItem('user:v1', JSON.stringify(response.data));
      }
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user", error);
      localStorage.removeItem('token');
      localStorage.removeItem('user:v1');
      localStorage.removeItem('livechat_session');
      localStorage.removeItem('bayfood_chat_session');
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const cachedUser = readCachedUser();

    if (cachedUser) {
      setUser(cachedUser);
      setLoading(false);
      if (token) {
        fetchUser(token).catch(() => { });
      }
      return;
    }

    if (token) {
      fetchUser(token).catch(() => { });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, matKhau) => {
    const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
    const response = await axios.post(`${apiUrl}/api/auth/login/json`, { email, matKhau });
    const { access_token } = response.data;
    localStorage.setItem('token', access_token);
    return await fetchUser(access_token);
  };

  const register = async (hoTen, email, soDienThoai, matKhau) => {
    const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
    await axios.post(`${apiUrl}/api/auth/register`, { hoTen, email, soDienThoai, matKhau });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user:v1');
    localStorage.removeItem('livechat_session');
    localStorage.removeItem('bayfood_chat_session');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
