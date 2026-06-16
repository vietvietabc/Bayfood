import { useState, useEffect, useMemo } from 'react';
import axios from '../../utils/axiosSetup';
import { Shield, UserPlus, Lock, Unlock, X, ChefHat, UtensilsCrossed, User, Search, Users } from 'lucide-react';

const API = `${(import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '')}/api/users`;

const ROLE_CONFIG = {
  'Quản lý': { label: 'Quản lý', color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: <Shield size={13} /> },
  'Nhân viên phục vụ': { label: 'Phục vụ', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: <UtensilsCrossed size={13} /> },
  'Nhân viên nhà bếp': { label: 'Nhà bếp', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <ChefHat size={13} /> },
  default: { label: 'Khách hàng', color: '#6b7280', bg: 'rgba(100,100,100,0.08)', icon: <User size={13} /> },
};

const STAFF_ROLES = ['Quản lý', 'Nhân viên phục vụ', 'Nhân viên nhà bếp'];

const getRoleConfig = (tenVaiTro) => ROLE_CONFIG[tenVaiTro] || ROLE_CONFIG.default;

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'customer'
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Shift History state
  const [showShiftHistoryModal, setShowShiftHistoryModal] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState(null);
  const [userShiftHistory, setUserShiftHistory] = useState([]);
  const [loadingShiftHistory, setLoadingShiftHistory] = useState(false);

  const [form, setForm] = useState({
    hoTen: '', email: '', soDienThoai: '', matKhau: '', vaiTro: 'nv_phuc_vu',
  });

  const getToken = () => localStorage.getItem('token') || '';

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/all/list`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Lỗi tải danh sách người dùng', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Split users by role
  const staffUsers = useMemo(() =>
    users.filter(u => STAFF_ROLES.includes(u.tenVaiTro)), [users]);
  const customerUsers = useMemo(() =>
    users.filter(u => !STAFF_ROLES.includes(u.tenVaiTro)), [users]);

  // Apply search
  const filteredStaff = useMemo(() => {
    if (!searchQuery) return staffUsers;
    const q = searchQuery.toLowerCase();
    return staffUsers.filter(u =>
      u.hoTen?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.soDienThoai?.includes(q)
    );
  }, [staffUsers, searchQuery]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customerUsers;
    const q = searchQuery.toLowerCase();
    return customerUsers.filter(u =>
      u.hoTen?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.soDienThoai?.includes(q)
    );
  }, [customerUsers, searchQuery]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStaff = filteredStaff.slice(indexOfFirstItem, indexOfLastItem);
  const totalStaffPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalCustomerPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const handleFormChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
      loadUsers();
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
      loadUsers();
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
      loadUsers();
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

  const handleViewShiftHistory = async (user) => {
    setSelectedUserForHistory(user);
    setShowShiftHistoryModal(true);
    setLoadingShiftHistory(true);
    setUserShiftHistory([]);
    try {
      const res = await axios.get(`${API}/${user.id_nguoiDung}/shift-history`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setUserShiftHistory(res.data);
    } catch (err) {
      alert('Không thể tải lịch sử ca làm việc');
    } finally {
      setLoadingShiftHistory(false);
    }
  };

  const BanUnbanButton = ({ user }) => {
    const isBanned = user.trangThai === 'Bị khóa';
    return isBanned ? (
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
    );
  };

  const StatusBadge = ({ user }) => {
    const isBanned = user.trangThai === 'Bị khóa';
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        padding: '0.3rem 0.65rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: '600',
        background: isBanned ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
        color: isBanned ? '#ef4444' : '#22c55e'
      }}>
        {isBanned ? <Lock size={12} /> : <Unlock size={12} />}
        {isBanned ? 'Bị khóa' : 'Hoạt động'}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Quản lý tài khoản</h1>
        {activeTab === 'staff' && (
          <button
            id="btn-create-staff"
            onClick={() => { setShowModal(true); setError(''); }}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <UserPlus size={18} /> Tạo Nhân Viên
          </button>
        )}
      </div>

      {/* Success toast */}
      {successMsg && (
        <div style={{
          background: 'rgba(34,197,94,0.12)', border: '1px solid #22c55e', color: '#22c55e',
          borderRadius: '0.75rem', padding: '0.875rem 1.25rem', marginBottom: '1.5rem',
          fontSize: '0.9rem', fontWeight: '600'
        }}>
          {successMsg}
        </div>
      )}

      {/* Tab Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{
          display: 'inline-flex', background: 'var(--surface-card)',
          borderRadius: '0.75rem', padding: '4px', border: '1px solid var(--border)'
        }}>
          {[
            { key: 'staff', label: 'Nhân Viên', icon: <Shield size={16} />, count: staffUsers.length },
            { key: 'customer', label: 'Khách Hàng', icon: <Users size={16} />, count: customerUsers.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.55rem 1.1rem', border: 'none', borderRadius: '0.55rem',
                background: activeTab === tab.key ? 'var(--primary)' : 'transparent',
                color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
                fontWeight: activeTab === tab.key ? 700 : 400,
                cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s'
              }}
            >
              {tab.icon} {tab.label}
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '20px', height: '20px', borderRadius: '50%', fontSize: '0.72rem',
                fontWeight: 700,
                background: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : 'var(--surface-light)',
                color: activeTab === tab.key ? '#fff' : 'var(--text-muted)'
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '380px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'staff' ? 'Tìm nhân viên...' : 'Tìm khách hàng...'}
            style={{
              width: '100%', padding: '0.55rem 0.85rem 0.55rem 2.4rem',
              borderRadius: '0.5rem', border: '1px solid var(--border)',
              background: 'var(--surface-light)', color: 'var(--text-main)',
              fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu…</div>
        ) : activeTab === 'staff' ? (
          /* ===== STAFF TABLE ===== */
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
              {currentStaff.map(user => {
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
                            padding: '0.35rem 0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)',
                            background: 'var(--surface)', color: 'var(--text)', fontSize: '0.8rem', cursor: 'pointer', outline: 'none'
                          }}
                        >
                          <option value="">Chưa gán ca</option>
                          <option value="Ca sáng">Ca sáng (07h-12h)</option>
                          <option value="Ca chiều">Ca chiều (12h-17h)</option>
                          <option value="Ca tối">Ca tối (17h-24h)</option>
                        </select>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}><StatusBadge user={user} /></td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        {(user.tenVaiTro === 'Nhân viên nhà bếp' || user.tenVaiTro === 'Nhân viên phục vụ') && (
                          <button
                            onClick={() => handleViewShiftHistory(user)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                              padding: '0.45rem 0.9rem', borderRadius: '0.5rem', border: 'none',
                              cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
                              background: 'var(--surface-light)', color: 'var(--text)', transition: 'all 0.2s',
                              border: '1px solid var(--border)'
                            }}
                            onMouseEnter={e => e.target.style.background = 'var(--surface)'}
                            onMouseLeave={e => e.target.style.background = 'var(--surface-light)'}
                          >
                            Lịch sử ca
                          </button>
                        )}
                        <BanUnbanButton user={user} />
                      </div>
                    </td>
                  </tr>

                );
              })}
              {filteredStaff.length === 0 && (
                <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {searchQuery ? 'Không tìm thấy nhân viên phù hợp.' : 'Chưa có nhân viên nào.'}
                </td></tr>
              )}
            </tbody>
          </table>
        ) : (
          /* ===== CUSTOMER TABLE ===== */
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-light)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Mã KH</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Họ Tên</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Số Điện Thoại</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Email</th>
                <th style={{ padding: '1rem', fontWeight: 'bold' }}>Trạng Thái</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'center' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {currentCustomers.map(user => {
                const isBanned = user.trangThai === 'Bị khóa';
                return (
                  <tr key={user.id_nguoiDung} style={{ borderBottom: '1px solid var(--border)', opacity: isBanned ? 0.7 : 1 }}>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>KH{user.id_nguoiDung}</td>
                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '36px', height: '36px', flexShrink: 0,
                        background: isBanned ? '#6b7280' : '#6366f1',
                        color: 'white', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem'
                      }}>
                        {user.hoTen?.charAt(0)?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight: '600' }}>{user.hoTen}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>{user.soDienThoai || '-'}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user.email}</td>
                    <td style={{ padding: '1rem' }}><StatusBadge user={user} /></td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}><BanUnbanButton user={user} /></td>
                  </tr>
                );
              })}
              {filteredCustomers.length === 0 && (
                <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {searchQuery ? 'Không tìm thấy khách hàng phù hợp.' : 'Chưa có khách hàng nào.'}
                </td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination UI */}
        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--surface-light)' }}>
            {activeTab === 'staff' ? (
              <>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredStaff.length)} trong tổng số {filteredStaff.length} nhân viên
                </div>
                {totalStaffPages > 1 && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '0.4rem 0.8rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                        background: currentPage === 1 ? 'var(--surface-card)' : 'var(--surface)',
                        color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-main)',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem'
                      }}
                    >
                      Trước
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {Array.from({ length: totalStaffPages }, (_, i) => i + 1).map(page => {
                        if (page === 1 || page === totalStaffPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              style={{
                                padding: '0.4rem 0.75rem', border: 'none', borderRadius: '0.4rem',
                                background: currentPage === page ? 'var(--primary)' : 'transparent',
                                color: currentPage === page ? '#fff' : 'var(--text-main)',
                                fontWeight: currentPage === page ? 'bold' : 'normal',
                                cursor: 'pointer', fontSize: '0.85rem'
                              }}
                            >
                              {page}
                            </button>
                          );
                        }
                        if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} style={{ padding: '0 0.2rem', color: 'var(--text-muted)' }}>...</span>;
                        }
                        return null;
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalStaffPages))}
                      disabled={currentPage === totalStaffPages}
                      style={{
                        padding: '0.4rem 0.8rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                        background: currentPage === totalStaffPages ? 'var(--surface-card)' : 'var(--surface)',
                        color: currentPage === totalStaffPages ? 'var(--text-muted)' : 'var(--text-main)',
                        cursor: currentPage === totalStaffPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem'
                      }}
                    >
                      Sau
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredCustomers.length)} trong tổng số {filteredCustomers.length} khách hàng
                </div>
                {totalCustomerPages > 1 && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '0.4rem 0.8rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                        background: currentPage === 1 ? 'var(--surface-card)' : 'var(--surface)',
                        color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-main)',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem'
                      }}
                    >
                      Trước
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {Array.from({ length: totalCustomerPages }, (_, i) => i + 1).map(page => {
                        if (page === 1 || page === totalCustomerPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              style={{
                                padding: '0.4rem 0.75rem', border: 'none', borderRadius: '0.4rem',
                                background: currentPage === page ? 'var(--primary)' : 'transparent',
                                color: currentPage === page ? '#fff' : 'var(--text-main)',
                                fontWeight: currentPage === page ? 'bold' : 'normal',
                                cursor: 'pointer', fontSize: '0.85rem'
                              }}
                            >
                              {page}
                            </button>
                          );
                        }
                        if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} style={{ padding: '0 0.2rem', color: 'var(--text-muted)' }}>...</span>;
                        }
                        return null;
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalCustomerPages))}
                      disabled={currentPage === totalCustomerPages}
                      style={{
                        padding: '0.4rem 0.8rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                        background: currentPage === totalCustomerPages ? 'var(--surface-card)' : 'var(--surface)',
                        color: currentPage === totalCustomerPages ? 'var(--text-muted)' : 'var(--text-main)',
                        cursor: currentPage === totalCustomerPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem'
                      }}
                    >
                      Sau
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
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

              {[
                { name: 'hoTen', label: 'Họ và tên', type: 'text', placeholder: 'Nguyễn Văn A', id: 'staff-hoTen' },
                { name: 'email', label: 'Email', type: 'email', placeholder: 'nhanvien@bayfood.com', id: 'staff-email' },
                { name: 'soDienThoai', label: 'Số điện thoại', type: 'tel', placeholder: '0901234567', id: 'staff-phone' },
                { name: 'matKhau', label: 'Mật khẩu', type: 'password', placeholder: 'Tối thiểu 6 ký tự', id: 'staff-password', minLength: 6 },
              ].map(field => (
                <div key={field.name}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>{field.label}</label>
                  <input
                    id={field.id}
                    name={field.name}
                    type={field.type}
                    required
                    value={form[field.name]}
                    onChange={handleFormChange}
                    placeholder={field.placeholder}
                    minLength={field.minLength}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline" style={{ flex: 1 }}>Hủy</button>
                <button id="btn-submit-staff" type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitting}>
                  {submitting ? 'Đang tạo...' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lịch sử ca làm */}
      {showShiftHistoryModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '800px', maxWidth: '95vw', maxHeight: '90vh', padding: '2rem', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={() => setShowShiftHistoryModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={22} />
            </button>

            <h2 style={{ marginTop: 0, marginBottom: '0.25rem', fontSize: '1.35rem' }}>
              Lịch sử ca làm - {selectedUserForHistory?.hoTen}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
              Lịch sử vào ca và tan ca của nhân viên này.
            </p>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
              {loadingShiftHistory ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu…</div>
              ) : userShiftHistory.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nhân viên này chưa có lịch sử ca làm.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1, boxShadow: '0 1px 0 var(--border)' }}>
                    <tr>
                      <th style={{ padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ngày</th>
                      <th style={{ padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ca Làm</th>
                      <th style={{ padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Giờ Vào</th>
                      <th style={{ padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Giờ Ra</th>
                      <th style={{ padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Thời Lượng</th>
                      <th style={{ padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userShiftHistory.map(shift => (
                      <tr key={shift.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem', fontWeight: '600' }}>{shift.ngay}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ padding: '0.25rem 0.65rem', borderRadius: '0.5rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.75rem', fontWeight: '700' }}>
                            {shift.caLamViec}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: '600' }}>{shift.thoiGianVao}</td>
                        <td style={{ padding: '1rem', color: shift.thoiGianRa === 'Chưa tan ca' ? 'var(--text-muted)' : 'inherit', fontWeight: '600' }}>
                          {shift.thoiGianRa}
                        </td>
                        <td style={{ padding: '1rem', color: '#f97316', fontWeight: '700' }}>
                          {shift.soGio !== null ? `${shift.soGio} giờ` : '-'}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {shift.trangThai === 'Đang làm' ? (
                            <span style={{ padding: '0.25rem 0.65rem', borderRadius: '1rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.75rem', fontWeight: '700' }}>
                              Đang làm
                            </span>
                          ) : (
                            <span style={{ padding: '0.25rem 0.65rem', borderRadius: '1rem', background: 'var(--surface-light)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700' }}>
                              {shift.trangThai}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
