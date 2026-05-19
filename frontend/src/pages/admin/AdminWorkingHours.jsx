import React, { useEffect, useState } from 'react';
import api from '../../utils/axiosSetup';
import { Calendar, Clock, Edit2, Info, CheckCircle2, AlertCircle } from 'lucide-react';

const todayString = new Date().toLocaleDateString('en-CA');
const nextMonth = new Date();
nextMonth.setDate(nextMonth.getDate() + 30);
const nextMonthString = nextMonth.toLocaleDateString('en-CA');

const AdminWorkingHours = () => {
    const [selectedDate, setSelectedDate] = useState(todayString);
    const [formData, setFormData] = useState({
        ngay: todayString,
        gioMoCua: '07:00',
        gioDongCua: '24:00',
        isNghi: false,
        ghiChu: '',
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const [timeline, setTimeline] = useState([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [timelineSearch, setTimelineSearch] = useState({
        fromDate: todayString,
        toDate: nextMonthString,
    });

    const fetchWorkingHours = async (dateValue) => {
        try {
            setLoading(true);
            setError('');
            setMessage('');
            const response = await api.get('http://localhost:8000/api/gio-lam-viec', {
                params: { ngay: dateValue },
            });
            const data = response.data || {};
            setFormData({
                ngay: data.ngay || dateValue,
                gioMoCua: data.gioMoCua || '07:00',
                gioDongCua: data.gioDongCua || '24:00',
                isNghi: Boolean(data.isNghi),
                ghiChu: data.ghiChu || '',
            });
        } catch (fetchError) {
            console.error('Không tải được giờ làm việc', fetchError);
            setError('Không tải được giờ làm việc của ngày đã chọn.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTimeline = async () => {
        try {
            setTimelineLoading(true);
            const response = await api.get('http://localhost:8000/api/gio-lam-viec/range', {
                params: { tu_ngay: timelineSearch.fromDate, den_ngay: timelineSearch.toDate },
            });
            setTimeline(response.data || []);
        } catch (error) {
            console.error('Không tải được timeline:', error);
        } finally {
            setTimelineLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkingHours(selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        if (timelineSearch.fromDate && timelineSearch.toDate) {
            fetchTimeline();
        }
    }, [timelineSearch.fromDate, timelineSearch.toDate]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((current) => ({
            ...current,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleTimelineRangeChange = (e) => {
        const { name, value } = e.target;
        setTimelineSearch((current) => {
            const next = { ...current, [name]: value };
            if (name === 'fromDate' && next.toDate < value) {
                next.toDate = value;
            }
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setMessage('');
            setError('');
            const response = await api.put('http://localhost:8000/api/gio-lam-viec', {
                ngay: selectedDate,
                gioMoCua: formData.isNghi ? null : formData.gioMoCua,
                gioDongCua: formData.isNghi ? null : formData.gioDongCua,
                isNghi: formData.isNghi,
                ghiChu: formData.ghiChu,
            });

            const data = response.data || {};
            setFormData({
                ngay: data.ngay || selectedDate,
                gioMoCua: data.gioMoCua || '07:00',
                gioDongCua: data.gioDongCua || '24:00',
                isNghi: Boolean(data.isNghi),
                ghiChu: data.ghiChu || '',
            });
            setMessage('Đã cập nhật giờ làm việc thành công.');
            fetchTimeline();
        } catch (submitError) {
            console.error('Không lưu được giờ làm việc', submitError);
            setError(submitError.response?.data?.detail || 'Không thể cập nhật giờ làm việc.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: 'grid', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header>
                <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Quản Lý Giờ Làm Việc</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                    Thiết lập giờ mở/đóng cửa và lịch nghỉ lễ cho nhà hàng.
                </p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
                {/* Left Column: Edit Form */}
                <section className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                            <Edit2 size={20} color="var(--primary)" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Cập nhật ngày: {new Date(selectedDate).toLocaleDateString('vi-VN')}</h2>
                    </div>

                    <div className="input-group">
                        <label htmlFor="selectedDate" className="input-label">Chọn ngày cần sửa</label>
                        <input
                            id="selectedDate"
                            type="date"
                            className="input-field"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.5rem 0' }} />

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            Đang tải thông tin...
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="input-group">
                                    <label htmlFor="gioMoCua" className="input-label flex items-center gap-2"><Clock size={16} /> Giờ mở cửa</label>
                                    <select
                                        id="gioMoCua"
                                        name="gioMoCua"
                                        className="input-field"
                                        value={formData.gioMoCua || '07:00'}
                                        onChange={handleChange}
                                        disabled={formData.isNghi}
                                        style={{ background: 'var(--surface)', color: 'var(--text-main)' }}
                                    >
                                        {Array.from({ length: 96 }).map((_, index) => {
                                            const hour = Math.floor(index / 4);
                                            const min = (index % 4) * 15;
                                            const tStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                                            return <option key={tStr} value={tStr}>{tStr}</option>;
                                        })}
                                        <option value="24:00">24:00</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="gioDongCua" className="input-label flex items-center gap-2"><Clock size={16} /> Giờ đóng cửa</label>
                                    <select
                                        id="gioDongCua"
                                        name="gioDongCua"
                                        className="input-field"
                                        value={formData.gioDongCua || '24:00'}
                                        onChange={handleChange}
                                        disabled={formData.isNghi}
                                        style={{ background: 'var(--surface)', color: 'var(--text-main)' }}
                                    >
                                        {Array.from({ length: 96 }).map((_, index) => {
                                            const hour = Math.floor(index / 4);
                                            const min = (index % 4) * 15;
                                            const tStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                                            return <option key={tStr} value={tStr}>{tStr}</option>;
                                        })}
                                        <option value="24:00">24:00</option>
                                    </select>
                                </div>
                            </div>

                            <div className="input-group">
                                <label htmlFor="ghiChu" className="input-label">Ghi chú (không bắt buộc)</label>
                                <textarea
                                    id="ghiChu"
                                    name="ghiChu"
                                    className="input-field"
                                    style={{ minHeight: '80px', resize: 'vertical' }}
                                    value={formData.ghiChu}
                                    onChange={handleChange}
                                    placeholder="Ví dụ: Nghỉ lễ, sửa chữa, mở muộn..."
                                />
                            </div>

                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                background: formData.isNghi ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-hover)',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease, border-color 0.2s ease',
                                border: formData.isNghi ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border)'
                            }}>
                                <input
                                    type="checkbox"
                                    name="isNghi"
                                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                    checked={formData.isNghi}
                                    onChange={handleChange}
                                />
                                <span style={{ fontWeight: '600', color: formData.isNghi ? 'var(--danger)' : 'var(--text)' }}>Hôm nay quán nghỉ</span>
                            </label>

                            <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>Khi chọn "Quán nghỉ", khách hàng sẽ không thể đặt bàn vào ngày này trên hệ thống.</span>
                            </div>

                            {message && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', borderRadius: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <CheckCircle2 size={18} />
                                    {message}
                                </div>
                            )}

                            {error && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', borderRadius: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '1rem', fontSize: '1.1rem' }}>
                                {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                            </button>
                        </form>
                    )}
                </section>

                {/* Right Column: Timeline View */}
                <section className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', maxHeight: '800px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                            <Calendar size={20} color="#10b981" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Lịch làm việc sắp tới</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="input-group">
                            <label htmlFor="fromDate" className="input-label flex items-center gap-2">Từ ngày</label>
                            <input
                                id="fromDate"
                                type="date"
                                name="fromDate"
                                className="input-field"
                                value={timelineSearch.fromDate}
                                onChange={handleTimelineRangeChange}
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="toDate" className="input-label flex items-center gap-2">Đến ngày</label>
                            <input
                                id="toDate"
                                type="date"
                                name="toDate"
                                className="input-field"
                                value={timelineSearch.toDate}
                                onChange={handleTimelineRangeChange}
                                min={timelineSearch.fromDate}
                            />
                        </div>
                    </div>

                    {timelineLoading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            Đang tải lịch trình...
                        </div>
                    ) : (
                        <div style={{ overflowY: 'auto', display: 'grid', gap: '0.75rem', paddingRight: '0.5rem' }}>
                            {timeline.length > 0 ? timeline.map((day) => {
                                const dateObj = new Date(`${day.ngay}T00:00:00`);
                                const isSelected = selectedDate === day.ngay;
                                return (
                                    <div
                                        key={day.ngay}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedDate(day.ngay)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedDate(day.ngay); }}
                                        style={{
                                            padding: '1.25rem',
                                            borderRadius: '1rem',
                                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                                            background: day.isNghi ? 'rgba(239, 68, 68, 0.03)' : 'var(--surface)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: isSelected ? '0 4px 12px rgba(249, 115, 22, 0.1)' : 'none',
                                            transform: isSelected ? 'scale(1.01)' : 'scale(1)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: day.isNghi ? 'var(--danger)' : 'var(--text)' }}>
                                                {dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                                            </div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Clock size={14} />
                                                {day.isNghi ? (
                                                    <span style={{ color: 'var(--danger)', fontWeight: '500' }}>Quán nghỉ</span>
                                                ) : (
                                                    <span>{day.gioMoCua} - {day.gioDongCua}</span>
                                                )}
                                                {day.source === 'custom' && !day.isNghi && (
                                                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '999px', background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', fontWeight: 'bold' }}>
                                                        Tùy chỉnh
                                                    </span>
                                                )}
                                            </div>
                                            {day.ghiChu && (
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                                    "{day.ghiChu}"
                                                </div>
                                            )}
                                        </div>
                                        <Edit2 size={18} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                                    </div>
                                );
                            }) : (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: '1rem' }}>
                                    Không có dữ liệu cho khoảng thời gian này.
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default AdminWorkingHours;