import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { simulate, sweepRES } from '../../src/model.js';
import { C, mono, sans } from './theme.js';
import { Badge, Card, clamp, FadeIn, Fleet, LineChart, Solar, Title, Turbine } from './components.jsx';

// ---------- Simulation data (computed once from the real model) ----------
const xy = (r, key = 'f', tMax = 20) => r.t.map((t, i) => ({ x: t, y: r[key][i] })).filter((p) => p.x <= tMax);
const CLASSIC = simulate({ resShare: 0.1, bessMode: 'none' });
const HIGH_RES = simulate({ resShare: 0.9, bessMode: 'none' });
const EDGE_P = { resShare: 0.9, lossMW: 1800, bessMW: 1500, Hsync: 4.5 };
const EDGE = {
  none: simulate({ ...EDGE_P, bessMode: 'none' }),
  gfl: simulate({ ...EDGE_P, bessMode: 'gfl' }),
  gfm: simulate({ ...EDGE_P, bessMode: 'gfm' }),
};
const SWEEP = sweepRES({}, 38);
const CLIFF_IDX = SWEEP.modes.none.findIndex((p) => p.status !== 'SECURE');
const CLIFF_X = SWEEP.shares[CLIFF_IDX] * 100;
const RATIO = HIGH_RES.metrics.initialRocof / CLASSIC.metrics.initialRocof;

const Content = ({ children, top = 150 }) => (
  <AbsoluteFill style={{ top, bottom: 270, height: 'auto', alignItems: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column', gap: 40 }}>
    {children}
  </AbsoluteFill>
);

// Accumulate rotor angle so speed changes never cause jumps.
const rotorAngle = (frame, hzAt) => {
  let a = 0;
  for (let f = 0; f < frame; f++) a += 9 * Math.max(0, 1 + (hzAt(f) - 50) * 0.45);
  return a;
};
const hzFrom = (r, simT) => {
  const i = Math.max(0, Math.min(r.t.length - 1, Math.round(simT / 0.01)));
  return r.f[i] ?? 47.5;
};

// ---------- 1. Trip ----------
export const TripScene = ({ lines }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tripF = lines[0].s + Math.round(0.9 * fps);
  const hzAt = (f) => (f < tripF ? 50 : hzFrom(CLASSIC, 1 + ((f - tripF) / fps) * 1.6));
  const hz = hzAt(frame);
  const tp = frame >= tripF ? (frame - tripF) / fps : 0;
  return (
    <Content>
      <Fleet isSync={(i) => i < 18} tripped={0} tripProgress={tp} angle={rotorAngle(frame, hzAt)} size={124} />
      <FadeIn at={tripF} style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: mono, fontSize: 30, color: C.none, letterSpacing: 4 }}>⚠ 1,200 MW UNIT TRIPPED</div>
      </FadeIn>
      <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 112, color: hz < 49.6 ? C.gfl : C.text, letterSpacing: -2 }}>
        {hz.toFixed(3)} <span style={{ fontSize: 56, color: C.muted }}>Hz</span>
      </div>
    </Content>
  );
};

// ---------- 2. Inertia ----------
export const InertiaScene = ({ lines }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chartAt = lines[2].s;
  const prog = interpolate(frame, [chartAt, lines[2].e], [0, 1], clamp);
  const lift = interpolate(frame, [chartAt - 8, chartAt + 8], [0, 1], clamp);
  return (
    <Content>
      <Title kicker="TRADITIONAL GRID">Spinning mass = <span style={{ color: C.accent }}>inertia</span></Title>
      <div style={{ display: 'flex', alignItems: 'center', gap: 50, transform: `scale(${1 - lift * 0.35})`, marginBottom: -lift * 140, marginTop: -lift * 40 }}>
        <div style={{ filter: 'drop-shadow(0 0 40px rgba(54,214,255,.45))' }}>
          <Turbine angle={frame * 9} size={300} />
        </div>
        <FadeIn at={lines[1].s} style={{ fontFamily: mono, color: C.text }}>
          <div style={{ fontSize: 30, color: C.muted }}>stored kinetic energy</div>
          <div style={{ fontSize: 64, fontWeight: 700 }}>E<sub style={{ fontSize: 34 }}>k</sub> = H · S</div>
          <div style={{ fontSize: 30, color: C.accent, marginTop: 10 }}>50.000 Hz · synchronised</div>
        </FadeIn>
      </div>
      <div style={{ opacity: lift }}>
        <LineChart width={940} height={470} x={[0, 20]} y={[49.2, 50.1]} xTicks={[0, 5, 10, 15, 20]} yTicks={[49.4, 49.6, 49.8, 50]}
          xLabel="Time [s]" yLabel="Frequency [Hz]"
          series={[{ key: 'c', data: xy(CLASSIC), color: C.accent, progress: prog }]} />
      </div>
    </Content>
  );
};

// ---------- 3. Renewables ----------
export const RenewablesScene = ({ lines }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flipStart = lines[0].s + Math.round(1.2 * fps);
  const flipT = (i) => flipStart + (17 - i) * 3;
  const isSync = (i) => i < 2 || frame < flipT(i) + 5;
  const flip = (i) => (i < 2 ? 1 : Math.abs(interpolate(frame, [flipT(i), flipT(i) + 10], [1, -1], clamp)));
  const swap = interpolate(frame, [lines[1].s - 6, lines[1].s + 8], [0, 1], clamp);
  const prog = interpolate(frame, [lines[1].s + 6, lines[1].e - 10], [0, 1], clamp);
  return (
    <Content>
      <Title kicker="90% RENEWABLES">Inverters store <span style={{ color: C.none }}>zero</span> inertia</Title>
      <div style={{ position: 'relative', width: 980, height: 700 }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - swap, display: 'grid', placeItems: 'center' }}>
          <Fleet isSync={isSync} flip={flip} angle={frame * 9} size={130} />
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: swap }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 22, marginBottom: 18 }}>
            <Badge color={C.accent}>10% RES · {CLASSIC.metrics.initialRocof.toFixed(2)} Hz/s</Badge>
            <Badge color={C.none}>90% RES · {HIGH_RES.metrics.initialRocof.toFixed(2)} Hz/s</Badge>
          </div>
          <LineChart width={960} height={540} x={[0, 10]} y={[48.5, 50.1]} xTicks={[0, 2, 4, 6, 8, 10]} yTicks={[48.6, 49, 49.4, 49.8]}
            xLabel="Time [s]" yLabel="Frequency [Hz]"
            series={[
              { key: 'lo', data: xy(CLASSIC, 'f', 10), color: C.accent, progress: prog },
              { key: 'hi', data: xy(HIGH_RES, 'f', 10), color: C.none, progress: prog },
            ]}>
            {({ sx, sy }) => (
              <text x={sx(5.2)} y={sy(48.85)} fill={C.none} fontFamily={sans} fontWeight={800} fontSize={88}
                opacity={interpolate(frame, [lines[1].s + 40, lines[1].s + 55], [0, 1], clamp)}>
                {Math.round(RATIO)}× faster
              </text>
            )}
          </LineChart>
        </div>
      </div>
    </Content>
  );
};

// ---------- 4. Inertia cliff ----------
export const CliffScene = ({ lines }) => {
  const frame = useCurrentFrame();
  const prog = interpolate(frame, [lines[0].s + 10, lines[0].e - 10], [0, 1], clamp);
  const mark = interpolate(frame, [lines[0].e - 25, lines[0].e - 5], [0, 1], clamp);
  const shade = interpolate(frame, [lines[1].s, lines[1].s + 20], [0, 1], clamp);
  const data = SWEEP.shares.map((s, i) => ({ x: s * 100, y: SWEEP.modes.none[i].nadir }));
  const yMin = Math.floor((Math.min(...data.map((d) => d.y)) - 0.15) * 10) / 10;
  return (
    <Content>
      <Title kicker="SWEEP 0 → 95% RENEWABLES">The <span style={{ color: C.none }}>inertia cliff</span></Title>
      <LineChart width={960} height={640} x={[0, 95]} y={[yMin, 50.05]} xTicks={[0, 20, 40, 60, 80]} yTicks={[49, 49.4, 49.8]}
        xLabel="Renewable share [%]" yLabel="Frequency nadir [Hz]"
        refs={[{ y: 49, label: 'UFLS 49.0 Hz', color: C.gfl }]}
        series={[{ key: 'n', data, color: C.text, progress: prog, width: 5 }]}>
        {({ sx, sy, pad, H, W }) => (
          <g>
            <rect x={sx(CLIFF_X)} y={pad.t} width={pad.l + W - sx(CLIFF_X)} height={H} fill={C.none} opacity={0.13 * shade} />
            <text x={sx(CLIFF_X) + 24} y={pad.t + H - 30} fill={C.none} fontFamily={sans} fontWeight={700} fontSize={32} opacity={shade}>
              Customers disconnected
            </text>
            {data.filter((d) => d.x <= prog * 95).map((d, i) => (
              <circle key={i} cx={sx(d.x)} cy={sy(d.y)} r={7} fill={SWEEP.modes.none[i].status === 'SECURE' ? C.gfm : SWEEP.modes.none[i].status === 'LOAD SHED' ? C.gfl : C.none} />
            ))}
            <g opacity={mark}>
              <line x1={sx(CLIFF_X)} x2={sx(CLIFF_X)} y1={pad.t} y2={pad.t + H} stroke={C.none} strokeWidth={4} strokeDasharray="12 8" />
              <text x={sx(CLIFF_X) - 16} y={pad.t + 50} textAnchor="end" fill={C.none} fontFamily={mono} fontWeight={700} fontSize={30}>
                CLIFF ≈ {Math.round(CLIFF_X)}%
              </text>
            </g>
          </g>
        )}
      </LineChart>
    </Content>
  );
};

// ---------- 5. Battery ----------
export const BatteryScene = ({ lines }) => {
  const frame = useCurrentFrame();
  const p1 = interpolate(frame, [lines[1].s + 5, lines[1].e - 15], [0, 1], clamp);
  const p2 = interpolate(frame, [lines[2].s + 5, lines[2].e - 15], [0, 1], clamp);
  const lbl = (f) => interpolate(frame, [f, f + 12], [0, 1], clamp);
  return (
    <Content>
      <FadeIn at={lines[0].s}>
        <Card style={{ display: 'flex', alignItems: 'center', gap: 30, padding: '24px 40px' }}>
          <svg width={90} height={90} viewBox="0 0 24 24" fill="none" stroke={C.gfm} strokeWidth={1.6}>
            <rect x="3" y="7" width="16" height="10" rx="2" /><path d="M21 10.5v3" /><path d="M11.5 9l-2.5 3.5h4L10.5 15" />
          </svg>
          <div>
            <div style={{ fontFamily: mono, color: C.gfm, fontSize: 52, fontWeight: 700 }}>1,500 MW</div>
            <div style={{ fontFamily: sans, color: C.muted, fontSize: 26 }}>battery · 90% RES · 1,800 MW trip</div>
          </div>
        </Card>
      </FadeIn>
      <LineChart width={960} height={600} x={[0, 10]} y={[48.3, 50.1]} xTicks={[0, 2, 4, 6, 8, 10]} yTicks={[48.5, 49, 49.5, 50]}
        xLabel="Time [s]" yLabel="Frequency [Hz]"
        series={[
          { key: 'n', data: xy(EDGE.none, 'f', 10), color: C.none, progress: p1 },
          { key: 'l', data: xy(EDGE.gfl, 'f', 10), color: C.gfl, progress: p1 },
          { key: 'm', data: xy(EDGE.gfm, 'f', 10), color: C.gfm, progress: p2, width: 8 },
        ]}>
        {({ sx, sy }) => (
          <g fontFamily={sans} fontWeight={700} fontSize={30}>
            <text x={sx(3.2)} y={sy(48.55)} fill={C.none} opacity={lbl(lines[1].s + 30)}>No support</text>
            <text x={sx(4.6)} y={sy(48.95)} fill={C.gfl} opacity={lbl(lines[1].s + 60)}>Grid-following · ~250 ms late</text>
            <text x={sx(3.2)} y={sy(49.7)} fill={C.gfm} opacity={lbl(lines[2].s + 50)}>Grid-forming · milliseconds</text>
          </g>
        )}
      </LineChart>
    </Content>
  );
};

// ---------- 6. Results ----------
export const ResultsScene = ({ lines }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rows = [
    ['none', 'No support', C.none],
    ['gfl', 'Grid-following battery', C.gfl],
    ['gfm', 'Grid-forming battery', C.gfm],
  ];
  const punch = spring({ frame: frame - lines[1].s, fps, config: { damping: 14 } });
  return (
    <Content>
      {rows.map(([k, name, col], i) => {
        const m = EDGE[k].metrics;
        const ok = m.status === 'SECURE';
        return (
          <FadeIn key={k} at={lines[0].s + i * 18} y={60}>
            <Card style={{ width: 940, borderColor: ok ? C.gfm : C.line, boxShadow: ok ? '0 0 60px rgba(46,230,166,.25)' : 'none', padding: '28px 36px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 36, color: C.text, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 9, background: col, display: 'inline-block' }} />{name}
                </div>
                <Badge color={ok ? C.gfm : C.none}>{ok ? '✓ SECURE' : '✕ ' + m.status}</Badge>
              </div>
              <div style={{ display: 'flex', gap: 60, marginTop: 20, fontFamily: mono }}>
                {[[m.maxRocof.toFixed(2), 'RoCoF Hz/s'], [m.nadir.toFixed(2), 'Nadir Hz'], [(m.shedMW / 1000).toFixed(1), 'Load shed GW']].map(([v, l]) => (
                  <div key={l}><div style={{ fontSize: 50, fontWeight: 700, color: ok ? C.gfm : C.text }}>{v}</div><div style={{ fontSize: 22, color: C.muted }}>{l}</div></div>
                ))}
              </div>
            </Card>
          </FadeIn>
        );
      })}
      <div style={{ fontFamily: sans, fontWeight: 800, fontSize: 54, color: C.text, opacity: Math.min(1, punch), transform: `scale(${0.8 + 0.2 * punch})`, textAlign: 'center' }}>
        The only difference: <span style={{ color: C.gfm }}>control</span>
      </div>
    </Content>
  );
};

// ---------- 7. Outro ----------
export const OutroScene = ({ lines }) => {
  const frame = useCurrentFrame();
  return (
    <Content>
      <FadeIn at={0} style={{ filter: 'drop-shadow(0 0 50px rgba(54,214,255,.5))' }}>
        <Turbine angle={frame * 9} size={220} />
      </FadeIn>
      <FadeIn at={6} style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 96, letterSpacing: 10, color: C.text }}>INERTIA LAB</div>
        <div style={{ fontFamily: sans, fontSize: 34, color: C.muted, marginTop: 10 }}>Low-inertia grid frequency simulator</div>
      </FadeIn>
      <FadeIn at={18} style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: sans, fontSize: 30, color: C.muted }}>Built by</div>
        <div style={{ fontFamily: sans, fontWeight: 800, fontSize: 58, color: C.accent }}>Abdullah Alruwaili</div>
        <div style={{ fontFamily: sans, fontSize: 28, color: C.muted, marginTop: 6 }}>Electrical Power Engineering</div>
      </FadeIn>
      <FadeIn at={lines[1].s} style={{ display: 'flex', gap: 20 }}>
        <Badge color={C.gfm}>OPEN SOURCE · MIT</Badge>
        <Badge color={C.accent}>LINK IN COMMENTS ↓</Badge>
      </FadeIn>
    </Content>
  );
};
