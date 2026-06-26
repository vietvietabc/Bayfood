import React from 'react';
import { Calendar, Clock, Users, Edit3 } from 'lucide-react';

const CartTimelineModal = ({
    showModal,
    setShowModal,
    loadingTables,
    tables,
    selectedTableFilter,
    setSelectedTableFilter,
    timelineSearch,
    handleTimelineRangeChange,
    todayString,
    timelineLoading,
    timelineDays,
    isSlotWithinSearchRange,
    isBookedSlot,
    isBlockedSlot,
    isWarningSlot,
    formatTimelineTime,
    handlePickSlot,
    selectedSlotKey,
    selectedTableLocal,
    bookingForm,
    setBookingForm,
    submitOrder,
    isSubmitting
}) => {
    if (!showModal) return null;

    return (
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
                        aria-label="Đóng"
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
                            <label className="input-label" htmlFor="timeline-from-date" style={{ fontSize: '0.85rem' }}><Calendar size={14} className="inline" /> Ngày đến</label>
                            <input
                                id="timeline-from-date"
                                type="date" name="fromDate"
                                className="input-field"
                                value={timelineSearch.fromDate}
                                onChange={handleTimelineRangeChange}
                                min={todayString}
                                aria-label="Ngày đến lọc timeline"
                            />
                        </div>
                        <div className="input-group mb-0">
                            <label className="input-label" htmlFor="timeline-from-time" style={{ fontSize: '0.85rem' }}><Clock size={14} className="inline" /> Lọc từ giờ</label>
                            <input
                                id="timeline-from-time"
                                type="time" name="fromTime"
                                className="input-field"
                                value={timelineSearch.fromTime}
                                onChange={handleTimelineRangeChange}
                                aria-label="Giờ đến lọc timeline"
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
                                <label className="input-label" htmlFor="booking-so-nguoi" style={{ fontSize: '0.85rem' }}><Users size={14} className="inline" /> Số người <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tối đa {selectedTableLocal.sucChua} chỗ)</span></label>
                                <input
                                    id="booking-so-nguoi"
                                    type="number" min="1" max={selectedTableLocal.sucChua}
                                    className="input-field"
                                    value={bookingForm.soNguoi}
                                    onChange={e => {
                                        const val = parseInt(e.target.value) || 1;
                                        const max = selectedTableLocal.sucChua || 20;
                                        const clamped = Math.min(Math.max(1, val), max);
                                        setBookingForm({ ...bookingForm, soNguoi: clamped });
                                    }}
                                    style={{ borderColor: parseInt(bookingForm.soNguoi) > (selectedTableLocal.sucChua || 20) ? '#ef4444' : '' }}
                                    aria-label="Số người đi cùng"
                                />
                                {parseInt(bookingForm.soNguoi) > (selectedTableLocal.sucChua || 20) && (
                                    <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                        Bàn này chỉ chứa tối đa {selectedTableLocal.sucChua} người.
                                    </div>
                                )}
                            </div>
                            <div className="input-group mb-0">
                                <label className="input-label" htmlFor="booking-ghi-chu" style={{ fontSize: '0.85rem' }}><Edit3 size={14} className="inline" /> Ghi chú</label>
                                <input
                                    id="booking-ghi-chu"
                                    type="text" placeholder="Thêm yêu cầu..."
                                    className="input-field"
                                    value={bookingForm.ghiChu}
                                    onChange={e => setBookingForm({ ...bookingForm, ghiChu: e.target.value })}
                                    aria-label="Ghi chú thêm cho đặt bàn"
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
    );
};

export default CartTimelineModal;
