import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, mono, sans } from './theme.js';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

export const FadeIn = ({ at = 0, dur = 12, y = 30, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 200 } });
  const o = interpolate(frame, [at, at + dur], [0, 1], clamp);
  return <div style={{ opacity: o, transform: `translateY(${(1 - s) * y}px)`, ...style }}>{children}</div>;
};

export const Title = ({ kicker, children, at = 0 }) => (
  <FadeIn at={at} style={{ textAlign: 'center' }}>
    {kicker && <div style={{ fontFamily: mono, color: C.accent, fontSize: 26, letterSpacing: 6, marginBottom: 14 }}>{kicker}</div>}
    <div style={{ fontFamily: sans, color: C.text, fontSize: 62, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1 }}>{children}</div>
  </FadeIn>
);

// ---------- Fleet icons ----------
export const Turbine = ({ angle = 0, color = C.accent, size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6}>
    <circle cx="12" cy="12" r="10" strokeOpacity={0.35} />
    <g transform={`rotate(${angle} 12 12)`}>
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 9.8V3.5M13.9 13.1l5.4 3.1M10.1 13.1l-5.4 3.1" />
    </g>
  </svg>
);

export const Solar = ({ color = C.sun, size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6}>
    <rect x="3" y="6" width="18" height="11" rx="1.5" />
    <path d="M3 11.5h18M9 6v11M15 6v11M12 17v3M8 20h8" />
  </svg>
);

/**
 * Grid of generating units. `isSync(i)` decides turbine vs solar; `tripped` index turns red.
 */
export const Fleet = ({ count = 20, cols = 5, isSync, tripped = -1, tripProgress = 0, angle = 0, flip = () => 1, size = 150 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${size}px)`, gap: 22, justifyContent: 'center' }}>
    {Array.from({ length: count }, (_, i) => {
      const sync = isSync(i);
      const trip = i === tripped && tripProgress > 0;
      const shake = trip ? Math.sin(tripProgress * 60) * 6 * (1 - Math.min(1, tripProgress)) : 0;
      const sc = flip(i);
      return (
        <div key={i} style={{
          width: size, height: size, borderRadius: 26, display: 'grid', placeItems: 'center',
          background: trip ? 'rgba(255,90,95,.16)' : C.panel,
          border: `2px solid ${trip ? C.none : C.line}`,
          transform: `translateX(${shake}px) scaleX(${sc})`,
          boxShadow: trip ? '0 0 40px rgba(255,90,95,.45)' : 'none',
        }}>
          {sync
            ? <Turbine angle={trip ? 0 : angle + i * 17} color={trip ? C.none : C.accent} size={size * 0.68} />
            : <Solar size={size * 0.68} />}
        </div>
      );
    })}
  </div>
);

// ---------- SVG line chart ----------
export const LineChart = ({
  width = 960, height = 560, x: [x0, x1], y: [y0, y1], series = [], refs = [],
  xLabel = '', yLabel = '', xTicks = [], yTicks = [], children,
}) => {
  const pad = { l: 96, r: 24, t: 20, b: 70 };
  const W = width - pad.l - pad.r, H = height - pad.t - pad.b;
  const sx = (v) => pad.l + ((v - x0) / (x1 - x0)) * W;
  const sy = (v) => pad.t + (1 - (v - y0) / (y1 - y0)) * H;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {yTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={pad.l} x2={pad.l + W} y1={sy(v)} y2={sy(v)} stroke="#16202f" strokeWidth={2} />
          <text x={pad.l - 16} y={sy(v) + 9} textAnchor="end" fill={C.muted} fontFamily={mono} fontSize={24}>{v}</text>
        </g>
      ))}
      {xTicks.map((v) => (
        <text key={`x${v}`} x={sx(v)} y={pad.t + H + 40} textAnchor="middle" fill={C.muted} fontFamily={mono} fontSize={24}>{v}</text>
      ))}
      <text x={pad.l + W / 2} y={height + 6} textAnchor="middle" fill={C.muted} fontFamily={sans} fontSize={24}>{xLabel}</text>
      <text transform={`translate(22 ${pad.t + H / 2}) rotate(-90)`} textAnchor="middle" fill={C.muted} fontFamily={sans} fontSize={24}>{yLabel}</text>
      {refs.map((r) => (
        <g key={r.label}>
          <line x1={pad.l} x2={pad.l + W} y1={sy(r.y)} y2={sy(r.y)} stroke={r.color} strokeWidth={2} strokeDasharray="10 8" opacity={0.8} />
          <text x={pad.l + W - 6} y={sy(r.y) - 10} textAnchor="end" fill={r.color} fontFamily={mono} fontSize={22}>{r.label}</text>
        </g>
      ))}
      {series.map((s) => {
        const lim = x0 + (s.progress ?? 1) * (x1 - x0);
        const pts = s.data.filter((p) => p.y != null && p.x <= lim);
        if (pts.length < 2) return null;
        const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(Math.max(y0, Math.min(y1, p.y))).toFixed(1)}`).join('');
        const last = pts[pts.length - 1];
        return (
          <g key={s.key}>
            <path d={d} fill="none" stroke={s.color} strokeWidth={s.width ?? 6} strokeLinejoin="round" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 10px ${s.color}88)` }} opacity={s.opacity ?? 1} />
            {(s.progress ?? 1) < 1 && <circle cx={sx(last.x)} cy={sy(Math.max(y0, last.y))} r={10} fill={s.color} />}
          </g>
        );
      })}
      {children?.({ sx, sy, pad, W, H })}
    </svg>
  );
};

export const Card = ({ children, style }) => (
  <div style={{ background: `linear-gradient(180deg, ${C.panel}, #0b111b)`, border: `2px solid ${C.line}`, borderRadius: 32, padding: 36, ...style }}>{children}</div>
);

export const Badge = ({ color, children }) => (
  <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 24, color, background: `${color}22`, padding: '8px 18px', borderRadius: 999, letterSpacing: 1 }}>{children}</span>
);
