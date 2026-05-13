import React, { useEffect, useState } from 'react';
import api from '../../utils/axiosSetup';

const todayString = new Date().toLocaleDateString('en-CA');

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

  const fetchWorkingHours = async (dateValue) => {
    try {
      setLoading(true);
      setError('');
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

  useEffect(() => {
    fetchWorkingHours(selectedDate);
  }, [selectedDate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage('');
      setError('');
      const response = await api.put('http://localhost:8000/api/gio-lam-viec', {
        ngay: formData.ngay,
        gioMoCua: formData.isNghi ? null : formData.gioMoCua,
        gioDongCua: formData.isNghi ? null : formData.gioDongCua,
        isNghi: formData.isNghi,
        ghiChu: formData.ghiChu,
      });

      const data = response.data || {};
      setFormData({
        ngay: data.ngay || formData.ngay,
        gioMoCua: data.gioMoCua || '07:00',
        gioDongCua: data.gioDongCua || '24:00',
        isNghi: Boolean(data.isNghi),
        ghiChu: data.ghiChu || '',
      });
      setMessage('Đã cập nhật giờ làm việc thành công.');
    } catch (submitError) {
      console.error('Không lưu được giờ làm việc', submitError);
      setError(submitError.response?.data?.detail || 'Không thể cập nhật giờ làm việc.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Cập Nhật Giờ Làm Việc</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Chọn một ngày để đặt giờ mở cửa, giờ đóng cửa hoặc đánh dấu hôm nay là ngày nghỉ.
        </p>
      </div>

      <div className="card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
        <div className="input-group" style={{ maxWidth: '260px' }}>
          <label className="input-label">Chọn ngày</label>
          <input
            type="date"
            className="input-field"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Đang tải giờ làm việc...</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="input-group">
                <label className="input-label">Giờ mở cửa</label>
                <input
                  type="time"
                  name="gioMoCua"
                  className="input-field"
                  value={formData.gioMoCua}
                  onChange={handleChange}
                  disabled={formData.isNghi}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Giờ đóng cửa</label>
                <input
                  type="time"
                  name="gioDongCua"
                  className="input-field"
                  value={formData.gioDongCua}
                  onChange={handleChange}
                  disabled={formData.isNghi}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Ghi chú</label>
              <input
                type="text"
                name="ghiChu"
                className="input-field"
                value={formData.ghiChu}
                onChange={handleChange}
                placeholder="Ví dụ: mở muộn vì sự kiện riêng"
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 'bold', color: 'var(--text)' }}>
              <input
                type="checkbox"
                name="isNghi"
                checked={formData.isNghi}
                onChange={handleChange}
              />
              Hôm nay quán nghỉ
            </label>

            <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(249, 115, 22, 0.08)', color: 'var(--text)', border: '1px solid rgba(249, 115, 22, 0.18)' }}>
              Khi lưu, hệ thống đặt bàn sẽ tự dùng giờ này cho ngày đã chọn. Nếu bật nghỉ, khách sẽ không thể đặt bàn trong ngày đó.
            </div>

            {message && (
              <div style={{ padding: '0.9rem 1rem', borderRadius: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                {message}
              </div>
            )}

            {error && (
              <div style={{ padding: '0.9rem 1rem', borderRadius: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {error}
              </div>
            )}

            <div>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: '180px' }}>
                {saving ? 'Đang lưu...' : 'Lưu giờ làm việc'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminWorkingHours;