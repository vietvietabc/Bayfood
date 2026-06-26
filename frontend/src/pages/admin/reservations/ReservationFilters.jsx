import React from 'react';
import { Search } from 'lucide-react';

const ReservationFilters = ({ searchQuery, setSearchQuery, filterStatus, setFilterStatus, statusOptions }) => {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Tìm mã đặt bàn, tên khách..."
          style={{
            padding: '0.4rem 0.875rem 0.4rem 2.2rem', borderRadius: '999px',
            border: '1px solid var(--border)', background: 'var(--surface-light)',
            color: 'var(--text)', fontSize: '0.8rem', outline: 'none', width: '200px'
          }}
        />
      </div>
      {/* Status pills */}
      {statusOptions.map(s => (
        <button key={s} onClick={() => setFilterStatus(s)} style={{
          padding: '0.4rem 0.875rem', borderRadius: '999px',
          border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: filterStatus === s ? 'bold' : 'normal',
          background: filterStatus === s ? 'var(--primary)' : 'transparent',
          color: filterStatus === s ? 'white' : 'var(--text-muted)',
        }}>{s}</button>
      ))}
    </div>
  );
};

export default ReservationFilters;
