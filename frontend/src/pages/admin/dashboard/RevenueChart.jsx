import React, { useState } from 'react';

const RevenueChart = ({ data7d, loading, fmtShort, getLast7Days, todayStr }) => {
  const [hovered, setHovered] = useState(null);
  const W = 560, H = 180, PAD_L = 0, PAD_B = 32, BAR_GAP = 8;
  const days = getLast7Days();
  const values = days.map(d => data7d[d] || 0);
  const maxVal = Math.max(...values, 1);
  const barW = (W - PAD_L - BAR_GAP * (days.length - 1)) / days.length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: `${H}px`, padding: '0 0 32px' }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ flex: 1, borderRadius: '6px 6px 0 0', background: 'var(--hairline)', height: `${30 + Math.random() * 70}%`, animation: 'shimmer 1.6s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="barHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(t => {
          const y = (H - PAD_B) * (1 - t);
          return (
            <line key={t} x1={0} y1={y} x2={W} y2={y}
              stroke="var(--hairline)" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
          );
        })}

        {/* Bars */}
        {values.map((v, i) => {
          const barH = Math.max(4, ((H - PAD_B) * v) / maxVal);
          const x = i * (barW + BAR_GAP);
          const y = H - PAD_B - barH;
          const dayLabel = days[i].slice(5).replace('-', '/');
          const isToday = days[i] === todayStr();
          const isHovered = hovered === i;

          return (
            <g key={i} style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Hover area */}
              <rect x={x} y={0} width={barW} height={H - PAD_B} fill="transparent" />

              {/* Bar */}
              <rect
                x={x} y={y} width={barW} height={barH}
                rx="5" ry="5"
                fill={isHovered ? 'url(#barHover)' : isToday ? 'url(#barGrad)' : 'var(--hairline)'}
                opacity={isHovered ? 1 : isToday ? 1 : 0.55}
                style={{ transition: 'all 0.2s cubic-bezier(0.32,0.72,0,1)' }}
              />

              {/* Tooltip on hover */}
              {isHovered && v > 0 && (
                <g>
                  <rect x={Math.min(x - 4, W - 90)} y={y - 36} width={88} height={26} rx="6"
                    fill="var(--surface-soft)" stroke="var(--hairline)" strokeWidth="1" />
                  <text x={Math.min(x - 4, W - 90) + 44} y={y - 18}
                    textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink)">
                    {fmtShort(v)}
                  </text>
                </g>
              )}

              {/* X axis label */}
              <text x={x + barW / 2} y={H - 6} textAnchor="middle"
                fontSize="10" fontWeight={isToday ? '700' : '500'}
                fill={isToday ? 'var(--primary)' : 'var(--muted)'}>
                {isToday ? 'Hôm nay' : dayLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default RevenueChart;
