import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    hoTen: '', email: '', soDienThoai: '', matKhau: ''
  });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(formData.hoTen, formData.email, formData.soDienThoai, formData.matKhau);
      setSuccessMsg('Đăng ký tài khoản thành công! Đang chuyển hướng đến trang đăng nhập...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="container py-16 flex justify-center">
      <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
        <div className="text-center mb-8">
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', borderRadius: '50%', marginBottom: '1rem' }}>
            <UserPlus size={32} />
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Đăng Ký Tài Khoản</h1>
          <p style={{ color: 'var(--text-muted)' }}>Tham gia cùng BayFood ngay hôm nay</p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid var(--danger)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid var(--secondary)', fontSize: '0.875rem' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Họ và Tên</label>
            <input type="text" name="hoTen" value={formData.hoTen} onChange={handleChange} className="input-field" required />
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field" required />
          </div>
          <div className="input-group">
            <label className="input-label">Số điện thoại</label>
            <input type="tel" name="soDienThoai" value={formData.soDienThoai} onChange={handleChange} className="input-field" required />
          </div>
          <div className="input-group">
            <label className="input-label">Mật khẩu</label>
            <input type="password" name="matKhau" value={formData.matKhau} onChange={handleChange} className="input-field" required minLength="6" />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-4" style={{ padding: '0.75rem' }}>
            Đăng Ký
          </button>
        </form>
        
        <div className="text-center mt-6" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Đã có tài khoản? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
