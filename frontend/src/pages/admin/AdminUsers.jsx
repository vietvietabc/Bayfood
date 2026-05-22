import { useState, useEffect } from 'react';
import axios from '../../utils/axiosSetup';
import { Shield, UserPlus, Lock, Unlock, X, ChefHat, UtensilsCrossed, User } from 'lucide-react';

const API = `${(import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '')}/api/users`;

const ROLE_CONFIG = {
  'Quản lý': { label: 'Quản lý', color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: <Shield size={13} /> },
  'Nhân viên phục vụ': { label: 'Phục vụ', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: <UtensilsCrossed size={13} /> },
  'Nhân viên nhà bếp': { label: 'Nhà bếp', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <ChefHat size={13} /> },
  default: { label: 'Khách hàng', color: 'var(--text-muted)', bg: 'rgba(100,100,100,0.08)', icon: <User size={13} /> },
};

const getRoleConfig = (tenVaiTro) => ROLE_CONFIG[tenVaiTro] || ROLE_CONFIG.default;

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState({
    hoTen: '', email: '', soDienThoai: '', matKhau: '', vaiTro: 'nv_phuc_vu',
  });

  const getToken = () => localStorage.getItem('token') || '';

  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/all/list`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (active) setUsers(res.data);
      } catch (err) {
        if (active) console.error('Lỗi tải danh sách người dùng', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadUsers();
    return () => { active = false; };
  }, []);

  const handleFormChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const fetchUsersRef = async () => {
    try {
      const res = await axios.get(`${API}/all/list`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Lỗi tải danh sách người dùng', err);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await axios.post(`${API}/staff`, form, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setShowModal(false);
      setForm({ hoTen: '', email: '', soDienThoai: '', matKhau: '', vaiTro: 'nv_phuc_vu' });
      showSuccess('Tạo tài khoản nhân viên thành công!');
      fetchUsersRef();
    } catch (err) {
      setError(err.response?.data?.detail || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBan = async (user) => {
    if (!window.confirm(`Bạn có chắc muốn khóa tài khoản "${user.hoTen}"?`)) return;
    try {
      await axios.put(`${API}/${user.id_nguoiDung}/ban`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      showSuccess(`Đã khóa tài khoản ${user.hoTen}`);
      fetchUsersRef();
    } catch (err) {
      alert(err.response?.data?.detail || 'Không thể khóa tài khoản');
    }
  };

  const handleUnban = async (user) => {
    try {
      await axios.put(`${API}/${user.id_nguoiDung}/unban`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      showSuccess(`Đã mở khóa tài khoản ${user.hoTen}`);
      fetchUsersRef();
    } catch (err) {
      alert(err.response?.data?.detail || 'Không thể mở khóa tài khoản');
    }
  };

  const handleUpdateShift = async (userId, caLamViec) => {
    try {
      await axios.put(`${API}/${userId}/shift`, { caLamViec }, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      showSuccess('Cập nhật ca làm việc thành công!');
      setUsers(users.map(u => u.id_nguoiDung === userId ? { ...u, caLamViec } : u));
    } catch (err) {
      alert(err.response?.data?.detail || 'Không thể cập nhật ca làm việc');
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Quản lý tài khoản</h1>
        <button
          id="btn-create-staff"
          onClick={() => { setShowModal(true); setError(''); }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <UserPlus size={18} /> Tạo Nhân Viên
        </button>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div style={{
          background: 'rgba(34,197,94,0.12)', border: '1px solid #22c55e', color: '#22c55e',
          borderRadius: '0.75rem', padding: '0.875rem 1.25rem', marginBottom: '1.5rem',
          fontSize: '0.9rem', fontWeight: '600'
        }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-light)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Mã</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Họ Tên</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Số Điện Thoại</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Email</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Vai Trò</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Ca Làm</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Trạng Thái</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'center' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const role = getRoleConfig(user.tenVaiTro);
                const isBanned = user.trangThai === 'Bị khóa';
                return (
                  <tr key={user.id_nguoiDung} style={{ borderBottom: '1px solid var(--border)', opacity: isBanned ? 0.7 : 1 }}>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>#{user.id_nguoiDung}</td>
                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '36px', height: '36px', flexShrink: 0,
                        background: isBanned ? '#6b7280' : role.color,
                        color: 'white', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem'
                      }}>
                        {user.hoTen?.charAt(0)?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight: '600' }}>{user.hoTen}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>{user.soDienThoai}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.3rem 0.65rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: '600',
                        background: role.bg, color: role.color,
                      }}>
                        {role.icon} {role.label}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {user.tenVaiTro === 'Nhân viên nhà bếp' || user.tenVaiTro === 'Nhân viên phục vụ' ? (
                        <select
                          value={user.caLamViec || ''}
                          onChange={(e) => handleUpdateShift(user.id_nguoiDung, e.target.value)}
                          style={{
                            padding: '0.35rem 0.5rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="">Chưa gán ca</option>
                          <option value="Ca sáng">Ca sáng (07h-12h)</option>
                          <option value="Ca chiều">Ca chiều (12h-17h)</option>
                          <option value="Ca tối">Ca tối (17h-22h)</option>
                        </select>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {isBanned ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          padding: '0.3rem 0.65rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: '600',
                          background: 'rgba(239,68,68,0.1)', color: '#ef4444'
                        }}>
                          <Lock size={12} /> Bị khóa
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          padding: '0.3rem 0.65rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: '600',
                          background: 'rgba(34,197,94,0.1)', color: '#22c55e'
                        }}>
                          <Unlock size={12} /> Hoạt động
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {isBanned ? (
                        <button
                          id={`btn-unban-${user.id_nguoiDung}`}
                          onClick={() => handleUnban(user)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.45rem 0.9rem', borderRadius: '0.5rem', border: 'none',
                            cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
                            background: 'rgba(34,197,94,0.1)', color: '#22c55e', transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.background = 'rgba(34,197,94,0.22)'}
                          onMouseLeave={e => e.target.style.background = 'rgba(34,197,94,0.1)'}
                        >
                          <Unlock size={14} /> Mở khóa
                        </button>
                      ) : (
                        <button
                          id={`btn-ban-${user.id_nguoiDung}`}
                          onClick={() => handleBan(user)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.45rem 0.9rem', borderRadius: '0.5rem', border: 'none',
                            cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
                            background: 'rgba(239,68,68,0.08)', color: '#ef4444', transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.18)'}
                          onMouseLeave={e => e.target.style.background = 'rgba(239,68,68,0.08)'}
                        >
                          <Lock size={14} /> Khóa
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal tạo nhân viên */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '480px', maxWidth: '95vw', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={22} />
            </button>

            <h2 style={{ marginTop: 0, marginBottom: '0.25rem', fontSize: '1.35rem' }}>Tạo Tài Khoản Nhân Viên</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
              Admin tạo tài khoản cho nhân viên mới của nhà hàng.
            </p>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444',
                borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem'
              }}>{error}</div>
            )}

            <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Vai trò */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Loại nhân viên</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {[
                    { value: 'nv_phuc_vu', label: 'Nhân viên phục vụ', icon: <UtensilsCrossed size={16} />, color: '#3b82f6' },
                    { value: 'nv_bep', label: 'Nhân viên nhà bếp', icon: <ChefHat size={16} />, color: '#f59e0b' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.75rem 1rem', borderRadius: '0.75rem', cursor: 'pointer',
                        border: `2px solid ${form.vaiTro === opt.value ? opt.color : 'var(--border)'}`,
                        background: form.vaiTro === opt.value ? `${opt.color}18` : 'transparent',
                        color: form.vaiTro === opt.value ? opt.color : 'var(--text-muted)',
                        fontWeight: form.vaiTro === opt.value ? '600' : '400',
                        fontSize: '0.85rem', transition: 'all 0.2s'
                      }}
                    >
                      <input type="radio" name="vaiTro" value={opt.value} checked={form.vaiTro === opt.value} onChange={handleFormChange} style={{ display: 'none' }} />
                      {opt.icon} {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Họ tên */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Họ và tên</label>
                <input
                  id="staff-hoTen"
                  name="hoTen" type="text" required
                  value={form.hoTen} onChange={handleFormChange}
                  placeholder="Nguyễn Văn A"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Email</label>
                <input
                  id="staff-email"
                  name="email" type="email" required
                  value={form.email} onChange={handleFormChange}
                  placeholder="nhanvien@bayfood.com"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>

              {/* Số điện thoại */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Số điện thoại</label>
                <input
                  id="staff-phone"
                  name="soDienThoai" type="tel" required
                  value={form.soDienThoai} onChange={handleFormChange}
                  placeholder="0901234567"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>

              {/* Mật khẩu */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Mật khẩu</label>
                <input
                  id="staff-password"
                  name="matKhau" type="password" required minLength={6}
                  value={form.matKhau} onChange={handleFormChange}
                  placeholder="Tối thiểu 6 ký tự"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline" style={{ flex: 1 }}>
                  Hủy
                </button>
                <button id="btn-submit-staff" type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitting}>
                  {submitting ? 'Đang tạo...' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
