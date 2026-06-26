import React from 'react';

const UserTable = ({
  activeTab,
  currentStaff,
  currentCustomers,
  filteredStaff,
  filteredCustomers,
  searchQuery,
  getRoleConfig,
  handleUpdateShift,
  handleViewShiftHistory,
  StatusBadge,
  BanUnbanButton
}) => {
  if (activeTab === 'staff') {
    return (
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
    );
  }

  // Customer table
  return (
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
  );
};

export default UserTable;
