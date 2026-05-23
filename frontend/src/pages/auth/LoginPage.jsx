import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const loggedInUser = await login(email, password);
      
      // Chuyển hướng dựa trên vai trò (role)
      const roleName = (loggedInUser?.tenVaiTro || '').trim().toLowerCase();
      if (roleName === 'nhân viên nhà bếp' || roleName === 'nhan vien nha bep' || roleName === 'nv_bep') {
        navigate('/kitchen');
      } else if (roleName === 'nhân viên phục vụ' || roleName === 'nhan vien phuc vu' || roleName === 'waiter') {
        navigate('/waiter');
      } else if (loggedInUser?.id_vaiTro === 2 || roleName === 'quản lý' || roleName === 'quan ly' || roleName === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-16 flex justify-center">
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <div className="text-center mb-8">
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', borderRadius: '50%', marginBottom: '1rem' }}>
            <LogIn size={32} />
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Đăng Nhập</h1>
          <p style={{ color: 'var(--text-muted)' }}>Chào mừng trở lại BayFood</p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid var(--danger)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label className="input-label" htmlFor="login-password" style={{ marginBottom: 0 }}>Mật khẩu</label>
            </div>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-4" style={{ padding: '0.75rem' }} disabled={isLoading}>
            {isLoading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
          </button>
        </form>

        <div className="text-center mt-6" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Chưa có tài khoản? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Đăng ký ngay</Link>
          <br></br>
          <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--primary)', textDecoration: 'none' }}>Quên mật khẩu?</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
