import React, { useState } from 'react';
import axios from '../../utils/axiosSetup';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, Mail, CheckCircle } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify & Reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [matKhauMoi, setMatKhauMoi] = useState('');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
      const response = await axios.post(`${apiUrl}/api/auth/forgot-password/send-otp`, { email });
      setSuccessMsg(response.data.message || 'Đã gửi mã OTP đến email của bạn.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi khi gửi email xác thực.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
      await axios.post(`${apiUrl}/api/auth/forgot-password/verify-reset`, { 
        email, 
        otp, 
        matKhauMoi 
      });
      setSuccessMsg('Đổi mật khẩu thành công! Đang chuyển về trang Đăng nhập...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-16 flex justify-center">
      <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
        <div className="text-center mb-8">
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '50%', marginBottom: '1rem' }}>
            {step === 1 ? <Mail size={32} /> : <KeyRound size={32} />}
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Khôi Phục Mật Khẩu</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {step === 1 ? 'Nhập email để nhận mã OTP' : 'Nhập mã OTP và tạo mật khẩu mới'}
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid var(--danger)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid var(--secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOTP}>
            <div className="input-group">
              <label className="input-label" htmlFor="forgot-email">Email đã đăng ký</label>
              <input 
                id="forgot-email"
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="input-field" 
                required 
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary w-full mt-4" style={{ padding: '0.75rem' }} disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi Mã OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndReset}>
            <div className="input-group">
              <label className="input-label" htmlFor="verify-email">Email</label>
              <input id="verify-email" type="email" value={email} className="input-field" disabled style={{ background: 'var(--surface-light)' }} />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="verify-otp">Mã OTP (6 chữ số)</label>
              <input 
                id="verify-otp"
                type="text" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                className="input-field" 
                required 
                maxLength="6"
                disabled={loading}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="verify-matKhauMoi">Mật khẩu mới</label>
              <input 
                id="verify-matKhauMoi"
                type="password" 
                value={matKhauMoi} 
                onChange={(e) => setMatKhauMoi(e.target.value)} 
                className="input-field" 
                required 
                minLength="6" 
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary w-full mt-4" style={{ padding: '0.75rem' }} disabled={loading}>
              {loading ? 'Đang xác thực...' : 'Xác nhận & Đổi Mật Khẩu'}
            </button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.875rem' }}>
                Gửi lại mã OTP
              </button>
            </div>
          </form>
        )}
        
        <div className="text-center mt-6" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <Link to="/login" style={{ color: 'var(--text-muted)', fontWeight: 'bold', textDecoration: 'none' }}>Quay lại Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
