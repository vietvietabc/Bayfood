import React from 'react';
import { Users, Edit } from 'lucide-react';

const TableCard = ({ table, status, isHovered, sc, onMouseEnter, onMouseLeave, onEdit, getImageUrl }) => {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        borderRadius: '1rem',
        border: `2px solid ${isHovered ? sc.border : sc.border + '88'}`,
        background: isHovered ? sc.bg : sc.bg + '88',
        padding: '1.25rem',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        transform: isHovered ? 'translateY(-3px)' : 'none',
        boxShadow: isHovered ? `0 8px 24px ${sc.border}33` : 'none',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Status dot */}
      <div style={{
        position: 'absolute', top: '1rem', right: '1rem',
        width: '10px', height: '10px', borderRadius: '50%',
        background: sc.dot,
        boxShadow: `0 0 0 3px ${sc.dot}33`
      }} />

      {/* Table image if exists */}
      {table.hinhAnh && (
        <div style={{ marginBottom: '0.85rem', borderRadius: '0.6rem', overflow: 'hidden', height: '80px' }}>
          <img
            src={getImageUrl(table.hinhAnh)}
            alt={table.tenBan}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>
      )}

      <div style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
        {table.tenBan}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Users size={12} /> {table.sucChua} chỗ
        </span>
        {table.tienCocMacDinh > 0 && (
          <span style={{ fontSize: '0.78rem', color: '#f97316' }}>
            Cọc {Number(table.tienCocMacDinh).toLocaleString('vi-VN')} ₫
          </span>
        )}
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        padding: '0.3rem 0.7rem', borderRadius: '1rem', fontSize: '0.78rem', fontWeight: 700,
        background: sc.bg, color: sc.text, border: `1px solid ${sc.border}55`
      }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: sc.dot }} />
        {status}
      </div>

      {/* Edit button on hover */}
      {isHovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(table); }}
          style={{
            position: 'absolute', bottom: '1rem', right: '1rem',
            padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: 'none',
            background: 'var(--primary)', color: '#fff', fontSize: '0.75rem',
            fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
            transition: 'opacity 0.15s'
          }}
        >
          <Edit size={12} /> Sửa
        </button>
      )}
    </div>
  );
};

export default TableCard;
