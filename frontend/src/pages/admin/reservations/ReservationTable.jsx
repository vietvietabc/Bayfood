import React from 'react';
import { GitMerge, Trash2 } from 'lucide-react';
import api from '../../../utils/axiosSetup';
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ReservationTable = ({
  currentItems, filtered, indexOfFirstItem, indexOfLastItem, totalPages, currentPage, setCurrentPage,
  STATUS_STYLE, COC_STYLE, fmt, fmtMoney,
  handleViewDetail, handleCancelMerge, handleOpenMergeModal, handleUpdateStatus,
  setCancelAdminModal, setCancelAdminReason, setCancelAdminError,
  setNoShowModal, setNoShowReason, setNoShowOrderData, setNoShowOrderLoading,
  activeMerges
}) => {
  return (
    <div className="card" style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
        <thead>
          <tr style={{ background: 'var(--surface-light)', borderBottom: '1px solid var(--border)' }}>
            {['Mã', 'Khách', 'Bàn', 'Giờ đến', 'Đến thực tế', 'Số người', 'Tiền cọc', 'Trạng thái', 'Thao tác'].map(h => (
              <th key={h} style={{ padding: '0.875rem 1rem', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {currentItems.map(res => {
            const ss = STATUS_STYLE[res.trangThai] || { bg: 'var(--surface-light)', color: 'var(--text-muted)' };
            const cs = res.trangThaiCoc ? (COC_STYLE[res.trangThaiCoc] || {}) : null;
            const isPast = res.thoiGianDen && new Date(res.thoiGianDen) < new Date();
            const is3HoursPast = res.thoiGianDen && new Date(new Date(res.thoiGianDen).getTime() + 3 * 60 * 60 * 1000) < new Date();
            const canNoShow = ['Đã xác nhận', 'Chờ xác nhận', 'Đã đặt'].includes(res.trangThai) && is3HoursPast;

            return (
              <tr key={res.id_datBan} style={{ borderBottom: '1px solid var(--border)', background: res.trangThai === 'Vắng mặt' ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                <td style={{ padding: '0.875rem 1rem', fontWeight: 'bold' }}>#DB{res.id_datBan}</td>
                <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)' }}>
                  {res.tenKhachHang
                    ? <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{res.tenKhachHang}</span>
                    : <span>KH{res.id_nguoiDung}</span>
                  }
                </td>
                <td style={{ padding: '0.875rem 1rem' }}>
                  {res.tenBan || (res.id_ban ? `Bàn ${res.id_ban}` : <span style={{ color: 'var(--text-muted)' }}>Chưa xếp</span>)}
                </td>
                <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap', color: isPast && res.trangThai !== 'Đã checkin' && res.trangThai !== 'Hoàn thành' ? '#ef4444' : 'inherit' }}>{fmt(res.thoiGianDen)}</td>
                <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap', color: '#059669' }}>{fmt(res.thoiGianDenThucTe)}</td>
                <td style={{ padding: '0.875rem 1rem' }}>
                  <div>{res.soNguoi} người</div>
                  {res.ghiChu && (() => {
                    const isGhep = res.ghiChu.toLowerCase().includes('ghép') || res.ghiChu.toLowerCase().includes('ghep') || res.ghiChu.toLowerCase().includes('bàn thêm') || res.ghiChu.toLowerCase().includes('nhóm đông');
                    return (
                      <div title={res.ghiChu} style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '0.35rem', background: isGhep ? 'rgba(124,58,237,0.1)' : 'rgba(234,179,8,0.08)', border: `1px solid ${isGhep ? 'rgba(124,58,237,0.25)' : 'rgba(234,179,8,0.2)'}`, maxWidth: '160px', cursor: 'help' }}>
                        <span style={{ flexShrink: 0 }}>{isGhep ? '🪑' : '📝'}</span>
                        <span style={{ fontSize: '0.72rem', color: isGhep ? '#a78bfa' : '#ca8a04', fontWeight: isGhep ? 700 : 500, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                          {res.ghiChu}
                        </span>
                      </div>
                    );
                  })()}
                </td>
                {/* Tiền cọc */}
                <td style={{ padding: '0.875rem 1rem', minWidth: '160px' }}>
                  {res.tienCoc ? (
                    <div style={{ display: 'grid', gap: '0.2rem' }}>
                      <div style={{ fontWeight: 'bold', color: res.trangThaiCoc === 'Mất cọc' ? '#dc2626' : res.trangThaiCoc === 'Đã cọc' ? '#059669' : 'var(--text)' }}>
                        {fmtMoney(res.tienCoc)}
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {cs && (
                          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700', background: cs.bg, color: cs.color }}>
                            {res.trangThaiCoc}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Chưa đặt cọc</span>
                  )}
                  {res.lyDoHuy && (
                    <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem', fontStyle: 'italic' }}>
                      {res.lyDoHuy}
                    </div>
                  )}
                </td>
                {/* Trạng thái */}
                <td style={{ padding: '0.875rem 1rem' }}>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 'bold', background: ss.bg, color: ss.color, whiteSpace: 'nowrap' }}>
                    {res.trangThai}
                  </span>
                </td>
                {/* Thao tác */}
                <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {/* Chi tiết */}
                    <button onClick={() => handleViewDetail(res)}
                      style={{ padding: '0.35rem 0.75rem', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}>
                      Chi tiết
                    </button>
                    {/* Ghép bàn - Chỉ cho Tầng thượng */}
                    {['Chờ xác nhận', 'Đã xác nhận', 'Đã checkin'].includes(res.trangThai) && res.viTri?.toLowerCase() === 'tầng thượng' && (
                      activeMerges[res.id_datBan] ? (
                        <button
                          onClick={() => handleCancelMerge(res.id_datBan)}
                          title={`Đang ghép: ${activeMerges[res.id_datBan].ban_details?.map(b => b.tenBan).join(', ')}`}
                          style={{ padding: '0.35rem 0.75rem', background: 'rgba(168,85,247,0.12)', color: '#9333ea', border: '1px solid #9333ea', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Trash2 size={13} /> Huỷ ghép
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenMergeModal(res)}
                          style={{ padding: '0.35rem 0.75rem', background: 'rgba(168,85,247,0.1)', color: '#7c3aed', border: '1px solid #7c3aed', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <GitMerge size={13} /> Ghép bàn
                        </button>
                      )
                    )}
                    {/* Xác nhận / Hủy */}
                    {res.trangThai === 'Chờ xác nhận' && (
                      <>
                        <button onClick={() => handleUpdateStatus(res.id_datBan, 'Đã xác nhận')}
                          style={{ padding: '0.35rem 0.75rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid #10b981', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}>
                          Xác nhận
                        </button>
                        <button onClick={() => { setCancelAdminModal(res); setCancelAdminReason(''); setCancelAdminError(''); }}
                          style={{ padding: '0.35rem 0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}>
                          Hủy đơn
                        </button>
                      </>
                    )}
                    {/* Hủy đơn cho trạng thái Đã đặt và Đã xác nhận */}
                    {['Đã đặt', 'Đã xác nhận'].includes(res.trangThai) && (
                      <button onClick={() => { setCancelAdminModal(res); setCancelAdminReason(''); setCancelAdminError(''); }}
                        style={{ padding: '0.35rem 0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}>
                        Hủy đơn
                      </button>
                    )}

                    {/* Vắng mặt */}
                    {canNoShow && (
                      <button onClick={() => {
                        setNoShowModal(res);
                        setNoShowReason('Khách không đến đúng giờ');
                        setNoShowOrderData(null);
                        if (res.id_donHang) {
                          setNoShowOrderLoading(true);
                          api.get(`${BASE_URL}/api/donhang/${res.id_donHang}/detail`)
                            .then(r => setNoShowOrderData(r.data))
                            .catch(() => setNoShowOrderData(null))
                            .finally(() => setNoShowOrderLoading(false));
                        }
                      }}
                        style={{ padding: '0.35rem 0.75rem', background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}>
                        Vắng mặt
                      </button>
                    )}
                    {/* Hoàn thành */}
                    {res.trangThai === 'Đã checkin' && (
                      <button onClick={() => handleUpdateStatus(res.id_datBan, 'Hoàn thành')}
                        style={{ padding: '0.35rem 0.75rem', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}>
                        Hoàn thành
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr><td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Không có đơn đặt bàn nào.</td></tr>
          )}
        </tbody>
      </table>

      {/* Pagination UI */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--surface-light)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filtered.length)} trong tổng số {filtered.length} đặt bàn
          </div>
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                // Hiển thị các trang xung quanh trang hiện tại (tối đa 5 nút)
                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
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
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                padding: '0.4rem 0.8rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                background: currentPage === totalPages ? 'var(--surface-card)' : 'var(--surface)',
                color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-main)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem'
              }}
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationTable;
