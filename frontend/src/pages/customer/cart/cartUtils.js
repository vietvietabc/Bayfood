export const pad2 = (value) => String(value).padStart(2, '0');

export const toLocalDateString = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

export const toMinutes = (value) => {
    if (!value) return null;
    const [hours, minutes] = value.split(':').map(Number);
    return (hours * 60) + minutes;
};

export const buildDateRange = (startDate, endDate) => {
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

export const formatTimelineTime = (value, isEnd = false) => {
    const hours = value.getHours();
    const minutes = value.getMinutes();
    if (isEnd && hours === 0 && minutes === 0) return '24:00';
    return value.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

export const isBookedSlot = (slot) => slot.trangThai === 'Đã có người đặt';
export const isBlockedSlot = (slot) => slot.trangThai === 'Không đủ thời gian';
export const isWarningSlot = (slot) => slot.trangThai === 'Có giới hạn giờ';
