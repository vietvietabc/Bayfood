import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const Skeleton = ({ w = '100%', h = '1rem', r = '0.5rem', style = {} }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg, var(--surface-soft) 25%, var(--hairline) 50%, var(--surface-soft) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.6s ease-in-out infinite',
    ...style
  }} />
);

const StatCard = ({ title, value, sub, icon, accent, loading, trend, trendUp }) => (
  <div style={{
    background: 'var(--surface-card)',
    border: '1px solid var(--hairline)',
    borderRadius: '1.25rem',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.25s cubic-bezier(0.32,0.72,0,1), box-shadow 0.25s cubic-bezier(0.32,0.72,0,1)',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.18)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
  >
    {/* Glow accent */}
    <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '80px', height: '80px', borderRadius: '50%', background: accent, opacity: 0.15, filter: 'blur(24px)', pointerEvents: 'none' }} />

    {/* Icon + label row */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.3rem' }}>
          {title}
        </div>
        {loading
          ? <Skeleton w="120px" h="2rem" r="0.4rem" />
          : <div style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>{value}</div>
        }
      </div>
      <div style={{ padding: '0.65rem', borderRadius: '0.875rem', background: accent + '22', color: accent, flexShrink: 0 }}>
        {icon}
      </div>
    </div>

    {/* Trend + sub */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      {loading
        ? <Skeleton w="80px" h="0.875rem" r="0.3rem" />
        : <>
          {trend != null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 700, color: trendUp ? '#10b981' : '#ef4444' }}>
              {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trend}
            </span>
          )}
          {sub && <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{sub}</span>}
        </>
      }
    </div>
  </div>
);

export { StatCard, Skeleton };
