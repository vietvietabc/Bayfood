import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight, ShoppingCart, Calendar, Clock, Users, Edit3 } from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const pad2 = (value) => String(value).padStart(2, '0');
const toLocalDateString = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const todayString = toLocalDateString(new Date());

const CartPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { cart, updateQuantity, removeFromCart, cartTotal, clearCart, selectedTableId, editingOrderId, setEditingOrderId } = useCart();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Booking Form State
    const [bookingForm, setBookingForm] = useState({
        id_ban: '',
        date: todayString,
        time: '',
        soNguoi: 2,
        ghiChu: ''
    });

    const nextWeekString = toLocalDateString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    // Timeline State
    const [timelineSearch, setTimelineSearch] = useState({
        fromDate: todayString,
        toDate: nextWeekString,
        fromTime: '07:00',
    });
    const [orderDate, setOrderDate] = useState(todayString);
    const [orderTime, setOrderTime] = useState('');
    const [timelineDays, setTimelineDays] = useState([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [tables, setTables] = useState([]);
    const [loadingTables, setLoadingTables] = useState(true);
    const [selectedTableLocal, setSelectedTableLocal] = useState(null);
    const [selectedSlotKey, setSelectedSlotKey] = useState('');
    const [selectedTableFilter, setSelectedTableFilter] = useState(null);
    const [upcomingReservation, setUpcomingReservation] = useState(null);
    const [isEditingTime, setIsEditingTime] = useState(false);

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
        if (Number.isNaN(current.getTime())) return [];
        while (`${toLocalDateString(current)}T00:00:00` <= end) {
            dates.push(toLocalDateString(current));
            current.setDate(current.getDate() + 1);
        }
        return dates;
    };

    useEffect(() => {
        if (selectedTableId) return;
        const loadTables = async () => {
            try {
                setLoadingTables(true);
                const response = await axios.get('http://localhost:8000/api/ban');
                setTables(response.data || []);
            } catch (error) {
                console.error('Failed to load tables', error);
                setTables([]);
            } finally {
                setLoadingTables(false);
            }
        };
        loadTables();
    }, [selectedTableId]);

    useEffect(() => {
        if (user && !selectedTableId && !editingOrderId) {
            const fetchUpcomingReservation = async () => {
                try {
                    const res = await axios.get('http://localhost:8000/api/datban/me');
                    const activeRes = res.data.find(r => 
                        ['Chờ xác nhận', 'Đã đặt', 'Đã xác nhận'].includes(r.trangThai) &&
                        new Date(r.thoiGianDen) > new Date()
                    );
                    if (activeRes) {
                        setUpcomingReservation(activeRes);
                        const resDate = new Date(activeRes.thoiGianDen);
                        setOrderDate(toLocalDateString(resDate));
                        setOrderTime(resDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));
                    }
                } catch (e) {
                    console.error("Failed to load upcoming reservation", e);
                }
            };
            fetchUpcomingReservation();
        }
    }, [user, selectedTableId, editingOrderId]);

    useEffect(() => {
        if (selectedTableId || !showModal) return;
        const loadTimeline = async () => {
            const dates = buildDateRange(timelineSearch.fromDate, timelineSearch.toDate);
            if (dates.length === 0) {
                setTimelineDays([]);
                return;
            }
            setTimelineLoading(true);
            try {
                const results = await Promise.all(
                    dates.map(async (date) => {
                        const response = await axios.get('http://localhost:8000/api/datban/timeline', {
                            params: { ngay: date, fromTime: timelineSearch.fromTime }
                        });
                        return response.data || { ngay: date, workingHours: null, tables: [] };
                    })
                );
                setTimelineDays(results);
            } catch (error) {
                console.error('Failed to load range timeline', error);
                setTimelineDays([]);
            } finally {
                setTimelineLoading(false);
            }
        };
        loadTimeline();
    }, [timelineSearch.fromDate, timelineSearch.toDate, timelineSearch.fromTime, selectedTableId, showModal]);

    const handleTimelineRangeChange = (e) => {
        const { name, value } = e.target;
        if (name === 'fromDate') {
            setTimelineSearch((current) => ({
                ...current,
                fromDate: value,
                toDate: current.toDate < value ? value : current.toDate,
            }));
            setBookingForm(prev => ({ ...prev, date: value }));
            return;
        }
        setTimelineSearch(prev => ({ ...prev, [name]: value }));
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
        if (isEnd && hours === 0 && minutes === 0) return '24:00';
        return value.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const isBookedSlot = (slot) => slot.trangThai === 'Đã có người đặt';
    const isBlockedSlot = (slot) => slot.trangThai === 'Không đủ thời gian';
    const isWarningSlot = (slot) => slot.trangThai === 'Có giới hạn giờ';

    const handlePickSlot = (dateString, table, slot) => {
        if (isBookedSlot(slot) || isBlockedSlot(slot)) return;
        const slotKey = `${dateString}-${table.id_ban}-${slot.batDau}`;
        if (isWarningSlot(slot)) {
            const confirmed = window.confirm(slot.warningMessage || 'Khung giờ này có giới hạn thời gian. Bạn có chắc chắn muốn đặt không?');
            if (!confirmed) return;
        }

        const timeString = new Date(slot.batDau).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

        setBookingForm({
            ...bookingForm,
            id_ban: table.id_ban,
            date: dateString,
            time: timeString
        });

        setSelectedSlotKey(slotKey);
        setSelectedTableLocal(table);
    };

    const handleCheckoutClick = () => {
        if (cart.length === 0) return;

        if (!user) {
            alert('Vui lòng đăng nhập trước khi đặt món.');
            navigate('/login');
            return;
        }

        if (editingOrderId) {
            submitOrderEdit();
            return;
        }

        if (!selectedTableId && (!orderDate || !orderTime)) {
            alert('Vui lòng chọn ngày và giờ dự kiến bạn sẽ tới ăn hoặc lấy món.');
            return;
        }

        if (!selectedTableId && orderDate && orderTime) {
            const currentDateTime = new Date();
            const selectedDateTime = new Date(`${orderDate}T${orderTime}:00`);
            if (selectedDateTime <= currentDateTime) {
                alert('Thời gian tới phải lớn hơn thời gian hiện tại.');
                return;
            }
        }

        if (selectedTableId || (upcomingReservation && !isEditingTime)) {
            submitOrder(false);
        } else {
            setShowModal(true);
        }
    };

    const submitOrderEdit = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                chi_tiet: cart.map(item => ({
                    id_monAn: item.id_monAn,
                    soLuong: item.quantity,
                    giaTaiThoiDiemBan: item.giaTien
                }))
            };

            await axios.put(`http://localhost:8000/api/donhang/me/${editingOrderId}`, payload);

            clearCart();
            setEditingOrderId(null);
            alert('Cập nhật đơn hàng thành công!');
            navigate('/account');
        } catch (error) {
            console.error('Lỗi khi cập nhật đơn hàng:', error);
            alert(error.response?.data?.detail || 'Có lỗi xảy ra khi cập nhật đơn hàng.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelEdit = () => {
        clearCart();
        setEditingOrderId(null);
        navigate('/account');
    };

    const submitOrder = async (isBookingTable) => {
        setIsSubmitting(true);
        try {
            const payload = {
                id_ban: selectedTableId ? parseInt(selectedTableId) : (upcomingReservation && !isEditingTime && upcomingReservation.id_ban ? upcomingReservation.id_ban : null),
                id_datBan: (!selectedTableId && !isBookingTable && upcomingReservation && !isEditingTime) ? upcomingReservation.id_datBan : null,
                chi_tiet: cart.map(item => ({
                    id_monAn: item.id_monAn,
                    soLuong: item.quantity,
                    giaTaiThoiDiemBan: item.giaTien
                })),
                dat_ban: null
            };

            if (!selectedTableId && !isBookingTable && orderDate && orderTime) {
                payload.thoiGianDen = `${orderDate}T${orderTime}:00`;
            }

            if (isBookingTable) {
                const thoiGianDen = `${bookingForm.date}T${bookingForm.time}:00`;
                payload.thoiGianDen = thoiGianDen;
                payload.dat_ban = {
                    id_ban: bookingForm.id_ban ? parseInt(bookingForm.id_ban) : null,
                    thoiGianDen: thoiGianDen,
                    soNguoi: parseInt(bookingForm.soNguoi),
                    ghiChu: bookingForm.ghiChu
                };
            }

            await axios.post('http://localhost:8000/api/donhang/create-with-booking', payload);

            clearCart();
            if (isBookingTable) {
                alert('Đặt bàn và đặt món thành công! Đơn hàng của bạn đã được gắn kèm với lịch đặt bàn mới của bạn.');
            } else if (upcomingReservation && !isEditingTime) {
                alert(`Đặt món thành công! Đơn hàng của bạn đã được tự động gắn vào lịch đặt bàn #${upcomingReservation.id_datBan} có sẵn.`);
            } else {
                alert('Đặt món thành công! Đơn hàng của bạn đang được xử lý.');
            }
            setShowModal(false);
            navigate('/account');
        } catch (error) {
            console.error('Lỗi khi đặt hàng:', error);
            alert(error.response?.data?.detail || 'Đã xảy ra lỗi khi đặt hàng.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Giỏ Hàng</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Kiểm tra món ăn, chỉnh số lượng và tiến hành đặt món.</p>
                </div>
                <Link to="/menu" className="btn btn-outline" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                    <ShoppingBag size={18} /> Tiếp tục chọn món
                </Link>
            </div>

            {cart.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <ShoppingCart size={56} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.6 }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Giỏ hàng đang trống</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Thêm món từ thực đơn để tạo đơn hàng mới.</p>
                    <Link to="/menu" className="btn btn-primary" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        Xem thực đơn <ArrowRight size={18} />
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-8" style={{ alignItems: 'start' }}>
                    <div className="card" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Món đã chọn</h2>
                        </div>
                        <div style={{ padding: '1rem' }}>
                            {cart.map((item) => (
                                <div key={item.id_monAn} style={{ display: 'grid', gridTemplateColumns: '88px 1fr auto', gap: '1rem', padding: '1rem', borderRadius: '0.75rem', background: 'var(--surface-light)', marginBottom: '0.75rem', alignItems: 'center' }}>
                                    <img src={item.hinhAnh || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'} alt={item.tenMon} style={{ width: '88px', height: '88px', objectFit: 'cover', borderRadius: '0.75rem' }} />
                                    <div>
                                        <h3 style={{ marginBottom: '0.35rem', fontSize: '1.05rem' }}>{item.tenMon}</h3>
                                        <p style={{ color: 'var(--primary)', fontWeight: 'bold', marginBottom: '0.75rem' }}>{Number(item.giaTien).toLocaleString('vi-VN')} đ</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <button className="btn btn-outline" style={{ padding: '0.35rem' }} onClick={() => updateQuantity(item.id_monAn, -1)}><Minus size={16} /></button>
                                            <span style={{ minWidth: '28px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</span>
                                            <button className="btn btn-outline" style={{ padding: '0.35rem' }} onClick={() => updateQuantity(item.id_monAn, 1)}><Plus size={16} /></button>
                                        </div>
                                    </div>
                                    <button className="btn" style={{ padding: '0.5rem', background: 'transparent', color: 'var(--danger)' }} onClick={() => removeFromCart(item.id_monAn)}><Trash2 size={18} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '1.5rem' }}>
                        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Tóm tắt đơn hàng</h2>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>Số lượng món</span>
                            <strong style={{ color: 'var(--text-main)' }}>{cart.reduce((count, item) => count + item.quantity, 0)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                            <span>Tạm tính</span>
                            <strong style={{ color: 'var(--text-main)' }}>{cartTotal.toLocaleString('vi-VN')} đ</strong>
                        </div>
                        {!editingOrderId && (
                            <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(249, 115, 22, 0.08)', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                                {selectedTableId ? `Đơn này sẽ được gắn trực tiếp vào bàn #${selectedTableId} bạn đang ngồi.` : 'Bạn có thể chọn đặt bàn giữ chỗ trước, hoặc đặt mang về tuỳ thích.'}
                            </div>
                        )}

                        {editingOrderId && (
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '0.75rem', color: '#1d4ed8' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Edit3 size={18} /> Đang chỉnh sửa đơn hàng #{editingOrderId}</div>
                                <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Thêm bớt món ăn và nhấn cập nhật để lưu thay đổi. Bạn có thể quay lại thực đơn để thêm món.</div>
                                <button onClick={handleCancelEdit} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}>Hủy chỉnh sửa</button>
                            </div>
                        )}

                        {!selectedTableId && !editingOrderId && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-main)', fontWeight: 'bold' }}>Thời gian tới <span style={{ color: 'red' }}>*</span></h3>
                                    {upcomingReservation && !isEditingTime && (
                                        <button 
                                            className="btn btn-outline" 
                                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}
                                            onClick={() => setIsEditingTime(true)}
                                            type="button"
                                        >
                                            <Edit3 size={14} /> Chỉnh sửa
                                        </button>
                                    )}
                                </div>
                                {upcomingReservation && !isEditingTime ? (
                                    <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Lấy từ lịch đặt bàn (#{upcomingReservation.id_datBan})</div>
                                        <div style={{ fontWeight: 'bold', color: '#059669', fontSize: '1.05rem' }}>
                                            {orderTime} - {new Date(orderDate).toLocaleDateString('vi-VN')}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="input-group mb-0">
                                            <label className="input-label" style={{ fontSize: '0.85rem' }}><Calendar size={14} className="inline" /> Ngày đến</label>
                                            <input
                                                type="date"
                                                className="input-field"
                                                value={orderDate}
                                                onChange={(e) => setOrderDate(e.target.value)}
                                                min={todayString}
                                            />
                                        </div>
                                        <div className="input-group mb-0">
                                            <label className="input-label" style={{ fontSize: '0.85rem' }}><Clock size={14} className="inline" /> Giờ đến</label>
                                            <input
                                                type="time"
                                                className="input-field"
                                                value={orderTime}
                                                onChange={(e) => setOrderTime(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button className="btn btn-primary w-full" style={{ padding: '1rem', fontSize: '1.05rem', display: 'inline-flex', justifyContent: 'center', gap: '0.5rem' }} onClick={handleCheckoutClick} disabled={isSubmitting}>
                            {isSubmitting ? 'Đang xử lý...' : (editingOrderId ? 'Cập nhật đơn hàng' : 'Xác nhận đặt món')}
                        </button>
                        {!editingOrderId && (
                            <button className="btn btn-outline w-full mt-4" style={{ padding: '1rem', fontSize: '1rem' }} onClick={() => clearCart()} disabled={isSubmitting}>Xóa toàn bộ giỏ hàng</button>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL HỎI ĐẶT BÀN CÓ TIMELINE */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, padding: '1rem'
                }}>
                    <div className="card" style={{ maxWidth: '800px', width: '100%', padding: '2rem', animation: 'fadeIn 0.2s ease-out', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex justify-between items-start mb-4">
                            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>
                                Bạn có muốn đặt bàn dùng bữa tại quán cùng với đơn hàng này không?
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0.5rem', lineHeight: 1 }}
                            >✕</button>
                        </div>

                        <div style={{
                            background: 'rgba(249, 115, 22, 0.1)',
                            borderBottom: '2px solid var(--primary)',
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            marginBottom: '1.5rem',
                            color: 'var(--text-main)',
                            fontSize: '0.9rem'
                        }}>
                            <strong>Lưu ý:</strong> Đặt bàn ngay để chúng tôi giữ chỗ và chuẩn bị sẵn các món ăn nóng hổi ngay khi bạn vừa đến!
                        </div>

                        {/* CHỌN BÀN */}
                        <div style={{ marginBottom: '1.5rem', border: '1px solid var(--border)', padding: '1rem', borderRadius: '0.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0' }}>Chọn bàn</h3>
                            {loadingTables ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Đang tải bàn...</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {tables.map(table => {
                                        const isSelected = selectedTableFilter === table.id_ban;
                                        return (
                                            <button
                                                key={table.id_ban}
                                                type="button"
                                                onClick={() => setSelectedTableFilter(isSelected ? null : table.id_ban)}
                                                style={{
                                                    padding: '0.75rem',
                                                    borderRadius: '0.75rem',
                                                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                                                    background: isSelected ? 'rgba(249, 115, 22, 0.1)' : 'var(--surface)',
                                                    fontSize: '0.875rem',
                                                    textAlign: 'left'
                                                }}
                                            >
                                                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: isSelected ? 'var(--primary)' : 'var(--text)' }}>{table.tenBan}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{table.viTri} · {table.sucChua} chỗ</div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* KHU VỰC CHỌN GIỜ THEO TIMELINE */}
                        <div style={{ marginBottom: '1.5rem', border: '1px solid var(--border)', padding: '1rem', borderRadius: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Thời gian tới</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="input-group mb-0">
                                    <label className="input-label" style={{ fontSize: '0.85rem' }}><Calendar size={14} className="inline" /> Ngày đến</label>
                                    <input
                                        type="date" name="fromDate"
                                        className="input-field"
                                        value={timelineSearch.fromDate}
                                        onChange={handleTimelineRangeChange}
                                        min={todayString}
                                    />
                                </div>
                                <div className="input-group mb-0">
                                    <label className="input-label" style={{ fontSize: '0.85rem' }}><Clock size={14} className="inline" /> Lọc từ giờ</label>
                                    <input
                                        type="time" name="fromTime"
                                        className="input-field"
                                        value={timelineSearch.fromTime}
                                        onChange={handleTimelineRangeChange}
                                    />
                                </div>
                            </div>

                            {/* HIỂN THỊ TIMELINE */}
                            <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                {timelineLoading ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Đang tải timeline...</p>
                                ) : timelineDays.length > 0 ? (
                                    timelineDays.map((day) => {
                                        const dayKey = day.date || day.ngay;
                                        return (
                                            <div key={dayKey}>
                                                {day.tables.map(entry => {
                                                    if (selectedTableFilter && entry.table.id_ban !== selectedTableFilter) return null;
                                                    const table = entry.table;
                                                    const filteredSlots = entry.slots.filter(slot => isSlotWithinSearchRange(new Date(slot.batDau)));
                                                    if (filteredSlots.length === 0) return null;
                                                    return (
                                                        <div key={table.id_ban} style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                                                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{table.tenBan} ({new Date(dayKey).toLocaleDateString('vi-VN')})</div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
                                                                {filteredSlots.map(slot => {
                                                                    const slotStartDate = new Date(slot.batDau);
                                                                    const isPastSlot = slotStartDate <= new Date();
                                                                    const booked = isBookedSlot(slot);
                                                                    const blocked = isBlockedSlot(slot);
                                                                    const warning = isWarningSlot(slot);
                                                                    const slotKey = `${dayKey}-${table.id_ban}-${slot.batDau}`;
                                                                    const isSelectedSlot = selectedSlotKey === slotKey;
                                                                    const isDisabled = booked || blocked || isPastSlot;
                                                                    return (
                                                                        <button
                                                                            key={slotKey}
                                                                            type="button"
                                                                            disabled={isDisabled}
                                                                            onClick={() => !isPastSlot && handlePickSlot(dayKey, table, slot)}
                                                                            style={{
                                                                                padding: '0.5rem',
                                                                                borderRadius: '0.5rem',
                                                                                border: isSelectedSlot ? '2px solid #2563eb' : '1px solid var(--border)',
                                                                                background: isPastSlot ? 'var(--surface-light)' : booked || blocked ? '#fee2e2' : isSelectedSlot ? '#dbeafe' : warning ? '#fef3c7' : '#d1fae5',
                                                                                color: isPastSlot ? 'var(--text-muted)' : booked || blocked ? '#ef4444' : isSelectedSlot ? '#2563eb' : warning ? '#d97706' : '#059669',
                                                                                textAlign: 'center',
                                                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                                opacity: isDisabled ? 0.6 : 1
                                                                            }}
                                                                        >
                                                                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{formatTimelineTime(new Date(slot.batDau))}</div>
                                                                            <div style={{ fontSize: '0.65rem', marginTop: '0.15rem' }}>
                                                                                {isPastSlot ? 'Đã qua' : booked ? 'Đã đặt' : blocked ? 'Kín' : warning ? 'Có giới hạn' : 'Trống'}
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Không có dữ liệu timeline.</p>
                                )}
                            </div>
                        </div>

                        {/* THÔNG TIN BỔ SUNG NẾU ĐÃ CHỌN BÀN */}
                        {selectedTableLocal && bookingForm.time && (
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--text)', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                                <div style={{ color: '#059669', marginBottom: '0.75rem', fontWeight: 'bold' }}>
                                    Đã chọn <strong>{selectedTableLocal.tenBan}</strong> lúc <strong>{bookingForm.time} ({bookingForm.date})</strong>.
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="input-group mb-0">
                                        <label className="input-label" style={{ fontSize: '0.85rem' }}><Users size={14} className="inline" /> Số người</label>
                                        <input
                                            type="number" min="1"
                                            className="input-field"
                                            value={bookingForm.soNguoi}
                                            onChange={e => setBookingForm({ ...bookingForm, soNguoi: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group mb-0">
                                        <label className="input-label" style={{ fontSize: '0.85rem' }}><Edit3 size={14} className="inline" /> Ghi chú</label>
                                        <input
                                            type="text" placeholder="Thêm yêu cầu..."
                                            className="input-field"
                                            value={bookingForm.ghiChu}
                                            onChange={e => setBookingForm({ ...bookingForm, ghiChu: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                            <button
                                className="btn btn-outline"
                                onClick={() => submitOrder(false)}
                                disabled={isSubmitting}
                            >
                                Không, chỉ đặt món
                            </button>

                            <button
                                className="btn btn-primary"
                                onClick={() => submitOrder(true)}
                                disabled={isSubmitting || !bookingForm.id_ban || !bookingForm.date || !bookingForm.time}
                                title={(!bookingForm.id_ban || !bookingForm.time) ? 'Vui lòng chọn 1 khung giờ trống ở trên' : ''}
                            >
                                Có, Đặt bàn kèm món
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartPage;