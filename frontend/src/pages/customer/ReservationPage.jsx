import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Clock, AlignLeft, MapPin, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ReservationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const pad2 = (value) => String(value).padStart(2, '0');
  const toLocalDateString = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  const todayString = toLocalDateString(new Date());
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    soNguoi: 2,
    ghiChu: ''
  });
  const [timelineSearch, setTimelineSearch] = useState({
    fromDate: todayString,
    toDate: todayString,
    fromTime: '07:00',
  });
  const [timelineDays, setTimelineDays] = useState([]);
  const [timelineError, setTimelineError] = useState('');
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedSlotKey, setSelectedSlotKey] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error', null
  const [statusMessage, setStatusMessage] = useState('');
  const [showOrderPrompt, setShowOrderPrompt] = useState(false); // Modal hỏi đặt món
  const [pendingBookingPayload, setPendingBookingPayload] = useState(null); // Dữ liệu đặt bàn chờ xử lý
  const [heldTables, setHeldTables] = useState(new Set()); // Bàn đang bị người khác giữ chỗ
  const statusRef = useRef(null);

  const currentTimelineWorkingHours = timelineDays[0]?.workingHours || null;
  const timelineOpenTime = currentTimelineWorkingHours?.isNghi
    ? timelineSearch.fromTime
    : (currentTimelineWorkingHours?.gioMoCua || '07:00');
  const timelineCloseTime = currentTimelineWorkingHours?.isNghi
    ? timelineSearch.fromTime
    : (currentTimelineWorkingHours?.gioDongCua || '24:00');

  const toMinutes = (value) => {
    if (!value) return null;
    const [hours, minutes] = value.split(':').map(Number);
    return (hours * 60) + minutes;
  };

  const buildDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return [];

    const dates = [];
    const current = new Date(`${startDate}T00:00:00`);
    const end = `${endDate}T00:00:00`;
    if (Number.isNaN(current.getTime())) {
      return [];
    }

    while (`${toLocalDateString(current)}T00:00:00` <= end) {
      dates.push(toLocalDateString(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const selectedDateTime = formData.date && formData.time
    ? new Date(`${formData.date}T${formData.time}:00`)
    : null;

  useEffect(() => {
    if (status && statusRef.current) {
      statusRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [status, statusMessage]);

  const isPastSelectedTime = selectedDateTime ? selectedDateTime <= new Date() : false;

  useEffect(() => {
    const loadTimeline = async () => {
      const dates = buildDateRange(timelineSearch.fromDate, timelineSearch.toDate);
      if (dates.length === 0) {
        setTimelineDays([]);
        setTimelineError(timelineSearch.fromDate && timelineSearch.toDate ? 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.' : '');
        return;
      }

      setTimelineError('');
      setTimelineLoading(true);
      try {
        const results = await Promise.all(
          dates.map(async (date) => {
            const response = await axios.get(`${BASE_URL}/api/datban/timeline`, {
              params: { ngay: date, fromTime: timelineSearch.fromTime }
            });
            return response.data || { ngay: date, workingHours: null, tables: [] };
          })
        );
        setTimelineDays(results);
      } catch (error) {
        console.error('Failed to load range timeline', error);
        setTimelineDays([]);
        setTimelineError('Không tải được timeline theo khoảng ngày đã chọn.');
      } finally {
        setTimelineLoading(false);
      }
    };

    loadTimeline();
  }, [timelineSearch.fromDate, timelineSearch.toDate, timelineSearch.fromTime]);

  useEffect(() => {
    if (!currentTimelineWorkingHours || currentTimelineWorkingHours.isNghi) {
      return;
    }

    if (timelineSearch.fromTime === '07:00' && currentTimelineWorkingHours.gioMoCua) {
      setTimelineSearch((current) => ({
        ...current,
        fromTime: currentTimelineWorkingHours.gioMoCua,
      }));
    }
  }, [currentTimelineWorkingHours]);

  useEffect(() => {
    const loadTables = async () => {
      try {
        setLoadingTables(true);
        const response = await axios.get(`${BASE_URL}/api/ban`);
        const loadedTables = response.data || [];
        setTables(loadedTables);
      } catch (error) {
        console.error('Failed to load tables', error);
        setTables([]);
      } finally {
        setLoadingTables(false);
      }
    };

    loadTables();
  }, []);

  const handleTimelineRangeChange = (e) => {
    const { name, value } = e.target;

    if (name === 'fromDate') {
      setTimelineSearch((current) => ({
        ...current,
        fromDate: value,
        toDate: current.toDate < value ? value : current.toDate,
      }));
      return;
    }

    setTimelineSearch({ ...timelineSearch, [name]: value });
  };

  const isSlotWithinSearchRange = (slotStart) => {
    const startMinutes = toMinutes(timelineSearch.fromTime);
    const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();

    if (startMinutes == null) return true;
    return slotStartMinutes >= startMinutes;
  };

  const formatTimelineTime = (value, isEnd = false) => {
    const hours = value.getHours();
    const minutes = value.getMinutes();
    if (isEnd && hours === 0 && minutes === 0) {
      return '24:00';
    }
    return value.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const isBookedSlot = (slot) => slot.trangThai === 'Đã có người đặt';
  const isBlockedSlot = (slot) => slot.trangThai === 'Không đủ thời gian';
  const isWarningSlot = (slot) => slot.trangThai === 'Có giới hạn giờ';

  const handleSelectTable = async (table) => {
    // Release hold on previously selected table
    if (selectedTable && selectedTable.id_ban !== table.id_ban) {
      try {
        await axios.delete(`${BASE_URL}/api/ban/${selectedTable.id_ban}/hold`);
      } catch (e) { /* ignore */ }
    }
    // Try to hold new table
    try {
      await axios.post(`${BASE_URL}/api/ban/${table.id_ban}/hold`);
      setSelectedTable(table);
      // Refresh held tables status
      const statusRes = await axios.get(`${BASE_URL}/api/ban/holds/status`);
      setHeldTables(new Set(statusRes.data.held_tables.map(h => h.id_ban)));
    } catch (err) {
      if (err.response?.status === 409) {
        alert(err.response.data.detail);
      } else {
        // Network error - still allow selection
        setSelectedTable(table);
      }
    }
  };

  const handlePickSlot = (dateString, table, slot) => {
    if (isBookedSlot(slot) || isBlockedSlot(slot)) return;
    const slotKey = `${dateString}-${table.id_ban}-${slot.batDau}`;

    if (isWarningSlot(slot)) {
      const confirmed = window.confirm(
        slot.warningMessage || 'Khung giờ này có giới hạn thời gian. Bạn có chắc chắn muốn đặt không?'
      );

      if (!confirmed) return;
    }

    setFormData((prev) => ({
      ...prev,
      date: dateString,
      time: new Date(slot.batDau).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
    }));
    setSelectedSlotKey(slotKey);
    setSelectedTable(table);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setBookingLoading(true);
      setStatusMessage('');
      setStatus(null);

      if (!user) {
        setStatus('error');
        setStatusMessage('Bạn cần đăng nhập trước khi đặt bàn.');
        navigate('/login');
        return;
      }

      if (!selectedTable) {
        setStatus('error');
        setStatusMessage('Vui lòng chọn bàn phù hợp trước khi đặt.');
        return;
      }

      if (!selectedDateTime || Number.isNaN(selectedDateTime.getTime())) {
        setStatus('error');
        setStatusMessage('Vui lòng chọn đầy đủ ngày và giờ đặt bàn.');
        return;
      }

      if (isPastSelectedTime) {
        setStatus('error');
        setStatusMessage('Thời gian đặt bàn phải lớn hơn thời gian hiện tại.');
        return;
      }

      const soNguoiVal = parseInt(formData.soNguoi) || 1;
      if (selectedTable.sucChua && soNguoiVal > selectedTable.sucChua) {
        setStatus('error');
        setStatusMessage(`Số người vượt sức chứa của bàn (tối đa ${selectedTable.sucChua} người).`);
        return;
      }

      const dateTime = `${formData.date}T${formData.time}:00`;
      const tienCoc = selectedTable.tienCocMacDinh || 0;

      // --- Luồng có tiền cọc: hiện modal hỏi đặt món ---
      if (tienCoc > 0) {
        setPendingBookingPayload({
          id_ban: selectedTable.id_ban,
          thoiGianDen: dateTime,
          soNguoi: parseInt(formData.soNguoi),
          ghiChu: formData.ghiChu || null,
          tienCoc,
          tenBan: selectedTable.tenBan,
          viTri: selectedTable.viTri,
        });
        setShowOrderPrompt(true);
        return;
      }

      // --- Luồng miễn cọc: đặt thẳng ---
      const payload = {
        id_ban: selectedTable.id_ban,
        thoiGianDen: dateTime,
        soNguoi: parseInt(formData.soNguoi),
        ghiChu: formData.ghiChu
      };
      const response = await axios.post(`${BASE_URL}/api/datban`, payload);
      const newReservationId = response.data.id_datBan;
      setStatus('success');
      setStatusMessage(
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', color: '#059669' }}>
          <strong style={{ fontSize: '1.1rem' }}>Đặt bàn thành công! Mã đơn: #DB{newReservationId}</strong>
          <span style={{ color: 'var(--text)' }}>
            Hệ thống đã ghi nhận đơn đặt bàn của bạn. Bạn có muốn đặt món trước luôn để không phải chờ đợi khi tới nơi không?
          </span>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => navigate(`/menu?reservationId=${newReservationId}&tableId=${selectedTable.id_ban}`)}
              className="btn btn-primary"
            >
              Có, chọn món ngay
            </button>
            <button
              type="button"
              onClick={() => navigate('/account')}
              className="btn btn-outline"
            >
              Không, để sau
            </button>
          </div>
        </div>
      );
      setFormData({ date: '', time: '', soNguoi: 2, ghiChu: '' });
      setSelectedSlotKey('');
    } catch (error) {
      console.error(error);
      setStatus('error');
      setStatusMessage(error.response?.data?.detail || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleOrderWithBooking = () => {
    if (!pendingBookingPayload) return;
    sessionStorage.setItem('pendingReservation', JSON.stringify({
      id_ban: pendingBookingPayload.id_ban,
      thoiGianDen: pendingBookingPayload.thoiGianDen,
      soNguoi: pendingBookingPayload.soNguoi,
      ghiChu: pendingBookingPayload.ghiChu,
      tenBan: pendingBookingPayload.tenBan,
      viTri: pendingBookingPayload.viTri,
      tienCoc: pendingBookingPayload.tienCoc,
    }));
    setShowOrderPrompt(false);
    navigate('/menu'); // Vào thực đơn chọn món, CartPage sẽ đọc sessionStorage
  };


  // Xử lý khi khách chọn "Chỉ đặt bàn"— tiến hành VNPay cọc
  const handleReservationOnly = async () => {
    if (!pendingBookingPayload) return;
    setShowOrderPrompt(false);
    setBookingLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/payment/initiate-reservation`, {
        id_ban: pendingBookingPayload.id_ban,
        thoiGianDen: pendingBookingPayload.thoiGianDen,
        soNguoi: pendingBookingPayload.soNguoi,
        ghiChu: pendingBookingPayload.ghiChu,
      });
      window.location.href = res.data.paymentUrl;
    } catch (error) {
      setStatus('error');
      setStatusMessage(error.response?.data?.detail || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="container py-8">
      {/* ===== MODAL HỎI ĐẶT MÓN ===== */}
      {showOrderPrompt && pendingBookingPayload && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem', animation: 'scaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1)' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                fontSize: '2.5rem', marginBottom: '0.75rem',
                filter: 'drop-shadow(0 0 12px rgba(249,115,22,0.4))'
              }}>🍽️</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                Bạn có muốn đặt món trước không?
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Đặt món ngay để không phải chờ khi tới — bếp sẽ chuẩn bị sẵn cho bạn!
              </p>
            </div>

            {/* Thông tin đặt bàn */}
            <div style={{
              padding: '0.85rem 1rem', borderRadius: '0.75rem', marginBottom: '1.5rem',
              background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)',
              display: 'grid', gap: '0.35rem', fontSize: '0.88rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Bàn</span>
                <strong>{pendingBookingPayload.tenBan} ({pendingBookingPayload.viTri})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Giờ đến</span>
                <strong>{new Date(pendingBookingPayload.thoiGianDen).toLocaleString('vi-VN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tiền cọc</span>
                <strong style={{ color: '#f97316' }}>{Number(pendingBookingPayload.tienCoc).toLocaleString('vi-VN')} ₫</strong>
              </div>
            </div>

            {/* Hai lựa chọn */}
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <button
                onClick={handleOrderWithBooking}
                style={{
                  padding: '0.9rem 1.25rem', borderRadius: '0.85rem', border: 'none',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '1rem',
                  boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'transform 0.15s'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🍜 Có, đặt món ngay — rồi thanh toán cọc
              </button>
              <button
                onClick={handleReservationOnly}
                disabled={bookingLoading}
                style={{
                  padding: '0.9rem 1.25rem', borderRadius: '0.85rem',
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--text)', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  opacity: bookingLoading ? 0.6 : 1
                }}
              >
                💳 {bookingLoading ? 'Đang xử lý...' : 'Không, chỉ đặt bàn & thanh toán cọc ngay'}
              </button>
              <button
                onClick={() => { setShowOrderPrompt(false); setPendingBookingPayload(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', padding: '0.25rem' }}
              >
                ← Quay lại chọn bàn
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Sơ Đồ Đặt Bàn</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem', marginBottom: '1.5rem' }}>
            Chọn bàn trên sơ đồ, rồi bấm vào ô timeline phù hợp của bàn đó để đặt.
          </p>

          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} color="var(--primary)" /> Sơ đồ bàn
              </h2>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{tables.length} bàn</span>
            </div>

            {loadingTables ? (
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Đang tải sơ đồ bàn...</p>
            ) : tables.length > 0 ? (
              (() => {
                // Group by vị trí
                const grouped = tables.reduce((acc, t) => {
                  const k = t.viTri || 'Khác';
                  if (!acc[k]) acc[k] = [];
                  acc[k].push(t);
                  return acc;
                }, {});
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Legend */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                      {[
                        { color: '#10b981', label: 'Trống' },
                        { color: '#3b82f6', label: 'Đang chọn' },
                        { color: '#a855f7', label: 'Có người đang xem' },
                        { color: '#ef4444', label: 'Không thể đặt' },
                      ].map(s => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: s.color }} />
                          <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                    {Object.entries(grouped).map(([area, areaTables]) => (
                      <div key={area}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', paddingBottom: '0.35rem', borderBottom: '1px solid var(--border)' }}>
                          {area}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.65rem' }}>
                          {areaTables.map((table) => {
                            const isSelected = selectedTable?.id_ban === table.id_ban;
                            const isHeld = heldTables.has(table.id_ban) && !isSelected;

                            let borderColor = '#10b98144';
                            let bgColor = 'var(--surface)';
                            let statusText = table.trangThai === 'Trống' ? 'Trống' : table.trangThai;
                            let statusColor = '#10b981';

                            if (isSelected) { borderColor = '#3b82f6'; bgColor = 'rgba(59,130,246,0.1)'; statusText = '✓ Đang chọn'; statusColor = '#3b82f6'; }
                            else if (isHeld) { borderColor = '#a855f7'; bgColor = 'rgba(168,85,247,0.06)'; statusText = 'Có người xem'; statusColor = '#a855f7'; }
                            else if (table.trangThai === 'Có khách') { borderColor = '#f9731644'; bgColor = 'rgba(249,115,22,0.05)'; statusColor = '#f97316'; }
                            else if (table.trangThai === 'Bảo trì') { borderColor = '#6b728044'; bgColor = 'rgba(107,114,128,0.06)'; statusColor = '#9ca3af'; }

                            return (
                              <button
                                key={table.id_ban}
                                type="button"
                                disabled={isHeld}
                                onClick={() => !isHeld && handleSelectTable(table)}
                                style={{
                                  padding: '0.85rem',
                                  borderRadius: '0.75rem',
                                  border: `2px solid ${borderColor}`,
                                  background: bgColor,
                                  cursor: isHeld ? 'not-allowed' : 'pointer',
                                  textAlign: 'left',
                                  transition: 'all 0.2s ease',
                                  opacity: 1,
                                }}
                              >
                                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: isSelected ? '#3b82f6' : 'var(--text)', marginBottom: '0.2rem' }}>
                                  {table.tenBan}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                                  {table.sucChua} chỗ
                                </div>
                                <div style={{ fontSize: '0.73rem', fontWeight: 700, color: statusColor }}>
                                  {statusText}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : (
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Chưa có bàn nào.</p>
            )}
          </div>

          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Lọc timeline theo ngày giờ</h2>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.4rem 0.75rem', borderRadius: '999px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontSize: '0.82rem', fontWeight: 'bold' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: '#f87171' }}></span>
                Đã đặt / không đủ thời gian
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.4rem 0.75rem', borderRadius: '999px', background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', fontSize: '0.82rem', fontWeight: 'bold' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: '#fbbf24' }}></span>
                Có giới hạn giờ
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.4rem 0.75rem', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', fontSize: '0.82rem', fontWeight: 'bold' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: '#34d399' }}></span>
                Trống
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '1rem' }}>
              <div className="input-group">
                <label htmlFor="fromDateInput" className="input-label flex items-center gap-2"><Calendar size={16} /> Từ ngày</label>
                <input
                  id="fromDateInput"
                  type="date"
                  name="fromDate"
                  value={timelineSearch.fromDate}
                  onChange={handleTimelineRangeChange}
                  className="input-field"
                  min={todayString}
                />
              </div>
              <div className="input-group">
                <label htmlFor="toDateInput" className="input-label flex items-center gap-2"><Calendar size={16} /> Tới ngày</label>
                <input
                  id="toDateInput"
                  type="date"
                  name="toDate"
                  value={timelineSearch.toDate}
                  onChange={handleTimelineRangeChange}
                  className="input-field"
                  min={timelineSearch.fromDate || todayString}
                />
              </div>
              <div className="input-group">
                <label htmlFor="fromTimeInput" className="input-label flex items-center gap-2"><Clock size={16} /> Từ giờ</label>
                <input
                  id="fromTimeInput"
                  type="time"
                  name="fromTime"
                  value={timelineSearch.fromTime}
                  onChange={handleTimelineRangeChange}
                  className="input-field"
                  min={timelineOpenTime}
                  max={timelineCloseTime === '24:00' ? '23:59' : timelineCloseTime}
                />
              </div>
              <div className="input-group">
              </div>
            </div>

            {timelineError ? (
              <div style={{ padding: '0.85rem 1rem', borderRadius: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1rem' }}>
                {timelineError}
              </div>
            ) : null}

            {timelineLoading ? (
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Đang tải timeline theo khoảng đã chọn...</p>
            ) : timelineDays.length > 0 ? (
              <div style={{ maxHeight: '58vh', overflowY: 'auto', paddingRight: '0.35rem' }}>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {timelineDays.map((day) => {
                    const dayKey = day.date || day.ngay;
                    const dayWorkingHours = day.workingHours || null;

                    return (
                      <div key={dayKey} style={{ border: '1px solid var(--border)', borderRadius: '1rem', padding: '1rem', background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{new Date(`${dayKey}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                              {dayWorkingHours?.isNghi
                                ? 'Hôm nay quán nghỉ'
                                : `Giờ làm: ${dayWorkingHours?.gioMoCua || '07:00'} - ${dayWorkingHours?.gioDongCua || '24:00'}`}
                            </div>
                          </div>
                        </div>

                        {dayWorkingHours?.isNghi && (
                          <div style={{ padding: '0.95rem 1rem', borderRadius: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1rem' }}>
                            Ngày này quán đang nghỉ, khách vui lòng chọn ngày khác.
                          </div>
                        )}

                        <div style={{ display: 'grid', gap: '1rem' }}>
                          {day.tables
                            .filter((entry) => !selectedTable || entry.table.id_ban === selectedTable.id_ban)
                            .map((entry) => {
                              const table = entry.table;
                              const filteredSlots = entry.slots.filter((slot) => {
                                const slotStart = new Date(slot.batDau);
                                return isSlotWithinSearchRange(slotStart);
                              });

                              if (filteredSlots.length === 0) {
                                return null;
                              }

                              return (
                                <div key={`${dayKey}-${table.id_ban}`} style={{ border: '1px solid var(--border)', borderRadius: '0.9rem', padding: '0.85rem', background: 'rgba(255,255,255,0.02)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                                    <div>
                                      <div style={{ fontWeight: 'bold', fontSize: '0.98rem' }}>{table.tenBan}</div>
                                      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{table.viTri} · {table.sucChua} chỗ</div>
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{filteredSlots.length} slot</div>
                                  </div>

                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: '0.75rem' }}>
                                    {filteredSlots.map((slot) => {
                                      const booked = isBookedSlot(slot);
                                      const blocked = isBlockedSlot(slot);
                                      const warning = isWarningSlot(slot);
                                      const slotStartDate = new Date(slot.batDau);
                                      const slotEndDate = new Date(slot.ketThuc);
                                      const isPastSlot = slotStartDate <= new Date();
                                      // Nếu slot bắt đầu trước fromTime đã lọc, hiển thị fromTime thay vì slotStart gốc
                                      const fromTimeMinutes = toMinutes(timelineSearch.fromTime);
                                      const slotStartMinutes = slotStartDate.getHours() * 60 + slotStartDate.getMinutes();
                                      const displaySlotStart = (fromTimeMinutes != null && slotStartMinutes < fromTimeMinutes)
                                        ? timelineSearch.fromTime
                                        : formatTimelineTime(slotStartDate);
                                      const slotStart = displaySlotStart;
                                      const slotEnd = formatTimelineTime(slotEndDate, true);
                                      const slotKey = `${dayKey}-${table.id_ban}-${slot.batDau}`;
                                      const isSelectedSlot = selectedSlotKey === slotKey;

                                      let slotBackground = 'rgba(16, 185, 129, 0.09)';
                                      if (isPastSlot) slotBackground = 'var(--surface-light)';
                                      else if (booked || blocked) slotBackground = 'rgba(239, 68, 68, 0.09)';
                                      else if (isSelectedSlot) slotBackground = 'rgba(59, 130, 246, 0.14)';
                                      else if (warning) slotBackground = 'rgba(245, 158, 11, 0.12)';

                                      let slotTextColor = '#34d399';
                                      if (isPastSlot) slotTextColor = 'var(--text-muted)';
                                      else if (booked || blocked) slotTextColor = '#f87171';
                                      else if (isSelectedSlot) slotTextColor = '#60a5fa';
                                      else if (warning) slotTextColor = '#fbbf24';

                                      const isDisabled = booked || blocked || isPastSlot;

                                      return (
                                        <button
                                          key={slotKey}
                                          type="button"
                                          disabled={isDisabled}
                                          onClick={() => !isPastSlot && handlePickSlot(dayKey, table, slot)}
                                          style={{
                                            borderRadius: '0.85rem',
                                            padding: '0.85rem 0.8rem',
                                            border: isSelectedSlot ? '2px solid #2563eb' : '1px solid var(--border)',
                                            background: slotBackground,
                                            color: 'var(--text-main)',
                                            minHeight: '96px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            textAlign: 'left',
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            opacity: isDisabled ? 0.6 : 1,
                                            boxShadow: isSelectedSlot ? '0 0 0 3px rgba(59, 130, 246, 0.16)' : 'none',
                                          }}
                                        >
                                          <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.25rem', color: isDisabled ? 'var(--text-muted)' : 'var(--text-main)' }}>
                                              {slotStart} - {slotEnd}
                                            </div>
                                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Mỗi ô = tối đa 3 tiếng</div>
                                          </div>
                                          <div style={{ fontSize: '0.78rem', color: slotTextColor, fontWeight: 'bold' }}>
                                            {isPastSlot
                                              ? 'Đã qua giờ'
                                              : booked
                                                ? 'Đã có người đặt'
                                                : blocked
                                                  ? 'Không đủ thời gian'
                                                  : warning
                                                    ? 'Có giới hạn giờ - bấm để xem cảnh báo'
                                                    : 'Trống - bấm để chọn'}
                                          </div>
                                          {isSelectedSlot && !isDisabled && (
                                            <div style={{ fontSize: '0.72rem', color: '#2563eb', marginTop: '0.25rem', fontWeight: 'bold' }}>
                                              Đang được chọn
                                            </div>
                                          )}
                                          {(booked || blocked || isPastSlot) && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: 1.35 }}>
                                              Slot này không thể đặt.
                                            </div>
                                          )}
                                          {warning && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: 1.35 }}>
                                              {slot.warningType === 'next'
                                                ? 'Sẽ có giới hạn theo lượt đặt tiếp theo.'
                                                : 'Khung giờ này cần xác nhận trước khi đặt.'}
                                            </div>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Chọn khoảng ngày giờ để hiển thị timeline.</p>
            )}
          </div>

          <div className="card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Hình ảnh thực tế</h2>
            {selectedTable ? (
              <div style={{ position: 'relative', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1rem' }}>
                <img
                  src={selectedTable.hinhAnh || 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800'}
                  alt={selectedTable.tenBan}
                  style={{ width: '100%', objectFit: 'cover', height: '280px', display: 'block', transition: 'all 0.3s ease' }}
                />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2rem 1rem 1rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                  <h3 style={{ fontSize: '1.25rem', color: 'white', marginBottom: '0.25rem' }}>{selectedTable.tenBan} - {selectedTable.viTri}</h3>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>Không có bàn trống vào lúc này.</p>
            )}
            {selectedTable && (
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.5' }}>{selectedTable.moTa || `Bàn ${selectedTable.sucChua} chỗ tại ${selectedTable.viTri}`}</p>
            )}
          </div>
          <div ref={statusRef} className="card" style={{ padding: '1.25rem 1.5rem' }}>
            {status === 'success' && (
              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)', borderRadius: '0.75rem', marginBottom: '1rem', border: '1px solid var(--secondary)' }}>
                {statusMessage}
              </div>
            )}
            {status === 'error' && (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '0.75rem', marginBottom: '1rem', border: '1px solid var(--danger)' }}>
                {statusMessage || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.'}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Đã chọn</div>
                <div style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                  {selectedTable ? `${selectedTable.tenBan} (${selectedTable.viTri})` : 'Bấm vào ô timeline trống để chọn'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  {selectedDateTime ? selectedDateTime.toLocaleString('vi-VN') : 'Chưa có ngày giờ'}
                </div>

                {/* Input số người */}
                {selectedTable && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <label htmlFor="reservation-so-nguoi" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      👥 Số người
                    </label>
                    <input
                      id="reservation-so-nguoi"
                      type="number"
                      min={1}
                      max={selectedTable.sucChua}
                      value={formData.soNguoi}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 1;
                        const max = selectedTable.sucChua || 20;
                        setFormData(f => ({ ...f, soNguoi: Math.min(Math.max(1, val), max) }));
                      }}
                      style={{
                        width: '72px', padding: '0.3rem 0.5rem', borderRadius: '0.45rem',
                        border: `1px solid ${parseInt(formData.soNguoi) > (selectedTable.sucChua || 99) ? '#ef4444' : 'var(--border)'}`,
                        background: 'var(--surface)', color: 'var(--text)', fontSize: '0.9rem', textAlign: 'center'
                      }}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      / tối đa {selectedTable.sucChua} chỗ
                    </span>
                    {parseInt(formData.soNguoi) > (selectedTable.sucChua || 99) && (
                      <span style={{ color: '#ef4444', fontSize: '0.78rem' }}>Vượt sức chứa!</span>
                    )}
                  </div>
                )}
                {/* Hiển thị thông tin tiền cọc */}
                {selectedTable && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {(selectedTable.tienCocMacDinh || 0) > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', fontSize: '0.85rem' }}>
                        <CreditCard size={14} color="#f97316" />
                        <span>Yêu cầu đặt cọc:</span>
                        <strong style={{ color: '#f97316' }}>{Number(selectedTable.tienCocMacDinh).toLocaleString('vi-VN')} ₫</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>— thanh toán qua VNPay</span>
                      </div>
                    ) : (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#059669' }}>
                        <span>&#10003;</span> Miễn cọc — đặt ngay không cần thanh toán
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedDateTime && isPastSelectedTime && (
                <div style={{ padding: '0.8rem 1rem', borderRadius: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  Chọn ô timeline khác.
                </div>
              )}

              {!user && (
                <div style={{ padding: '0.8rem 1rem', borderRadius: '0.75rem', background: 'rgba(245, 158, 11, 0.08)', color: '#b45309', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  Bạn chưa đăng nhập nên chưa thể lưu đặt bàn vào hệ thống.
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {(selectedTable || selectedSlotKey) && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (selectedTable) {
                        try { await axios.delete(`${BASE_URL}/api/ban/${selectedTable.id_ban}/hold`); } catch (e) { /* ignore */ }
                      }
                      setSelectedTable(null);
                      setSelectedSlotKey('');
                      setFormData(f => ({ ...f, date: '', time: '' }));
                    }}
                    style={{
                      padding: '0.95rem 1.1rem',
                      border: '1px solid var(--border)',
                      borderRadius: '0.75rem',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    ↩ Chọn lại bàn / đổi giờ
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '0.95rem 1.25rem', minWidth: '200px', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
                  onClick={handleSubmit}
                  disabled={!selectedTable || isPastSelectedTime || bookingLoading}
                >
                  {bookingLoading
                    ? 'Đang xử lý...'
                    : (selectedTable?.tienCocMacDinh || 0) > 0
                      ? <><CreditCard size={16} /> Thanh Toán &amp; Đặt Bàn</>
                      : 'Xác Nhận Đặt Bàn'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationPage;
