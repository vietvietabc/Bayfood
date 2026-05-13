import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const readCachedUser = () => {
  try {
    const cachedUser = localStorage.getItem('user');
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
      const response = await axios.get('http://localhost:8000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      if (persist) {
        localStorage.setItem('user', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error("Failed to fetch user", error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
    const response = await axios.post('http://localhost:8000/api/auth/login/json', { email, matKhau });
    const { access_token } = response.data;
    localStorage.setItem('token', access_token);
    await fetchUser(access_token);
  };

  const register = async (hoTen, email, soDienThoai, matKhau) => {
    await axios.post('http://localhost:8000/api/auth/register', { hoTen, email, soDienThoai, matKhau });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
