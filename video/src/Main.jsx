import React from 'react';
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Audio } from '@remotion/media';
import timeline from './timeline.json';
import { arabic, C, mono, sans } from './theme.js';
import { clamp } from './components.jsx';
import { BatteryScene, CliffScene, InertiaScene, OutroScene, RenewablesScene, ResultsScene, TripScene } from './scenes.jsx';

export const FPS = 30;
const LEAD = 0.5, GAP = 0.3, SCENE_GAP = 0.8, TAIL = 2.2;

// ---------- Build timing from the voice-over durations ----------
const LINES = [];
{
  let t = LEAD;
  timeline.forEach((l, i) => {
    if (i > 0 && timeline[i - 1].scene !== l.scene) t += SCENE_GAP - GAP;
    const s = Math.round(t * FPS);
    const e = Math.round((t + l.duration) * FPS);
    LINES.push({ ...l, s, e });
    t += l.duration + GAP;
  });
}
const SCENE_ORDER = ['trip', 'inertia', 'renewables', 'cliff', 'battery', 'results', 'outro'];
const COMPONENTS = { trip: TripScene, inertia: InertiaScene, renewables: RenewablesScene, cliff: CliffScene, battery: BatteryScene, results: ResultsScene, outro: OutroScene };
export const TOTAL_FRAMES = LINES[LINES.length - 1].e + Math.round(TAIL * FPS);

const SCENES = SCENE_ORDER.map((name, k) => {
  const own = LINES.filter((l) => l.scene === name);
  const from = k === 0 ? 0 : own[0].s - Math.round(0.35 * FPS);
  return { name, from, own };
}).map((sc, k, arr) => {
  const to = k < arr.length - 1 ? arr[k + 1].from : TOTAL_FRAMES;
  return { ...sc, dur: to - sc.from, lines: sc.own.map((l) => ({ s: l.s - sc.from, e: l.e - sc.from })) };
});

// ---------- Overlays ----------
const Header = () => (
  <div style={{ position: 'absolute', top: 48, left: 60, right: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: mono, fontWeight: 700, color: C.accent, letterSpacing: 6, fontSize: 26 }}>
      <span style={{ width: 16, height: 16, borderRadius: 8, background: C.accent, boxShadow: `0 0 18px ${C.accent}` }} />INERTIA LAB
    </div>
    <div style={{ fontFamily: sans, color: C.muted, fontSize: 24, letterSpacing: 2 }}>ABDULLAH ALRUWAILI</div>
  </div>
);

const Subtitle = () => {
  const frame = useCurrentFrame();
  const idx = LINES.findIndex((l, i) => frame >= l.s - 2 && frame < (LINES[i + 1]?.s ?? l.e + 15) - 2 && frame < l.e + 12);
  if (idx < 0) return null;
  const l = LINES[idx];
  const o = interpolate(frame, [l.s - 2, l.s + 5, l.e + 6, l.e + 12], [0, 1, 1, 0], clamp);
  const y = interpolate(frame, [l.s - 2, l.s + 6], [16, 0], clamp);
  return (
    <div style={{ position: 'absolute', left: 50, right: 50, bottom: 70, display: 'flex', justifyContent: 'center', opacity: o, transform: `translateY(${y}px)` }}>
      <div dir="rtl" style={{
        fontFamily: arabic, fontWeight: 700, fontSize: 43, lineHeight: 1.5, color: '#ffffff', textAlign: 'center',
        background: 'rgba(4,8,14,.78)', border: '1px solid rgba(54,214,255,.25)', borderRadius: 24, padding: '14px 30px',
        textShadow: '0 2px 10px rgba(0,0,0,.6)', maxWidth: 1000,
      }}>
        {l.ar}
      </div>
    </div>
  );
};

const Progress = () => {
  const frame = useCurrentFrame();
  return <div style={{ position: 'absolute', left: 0, bottom: 0, height: 8, width: `${(frame / TOTAL_FRAMES) * 100}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.gfm})` }} />;
};

export const Main = () => (
  <AbsoluteFill style={{
    background: `radial-gradient(900px 700px at 85% -5%, rgba(54,214,255,.13), transparent 60%), radial-gradient(800px 600px at -10% 100%, rgba(46,230,166,.09), transparent 60%), ${C.bg}`,
  }}>
    {SCENES.map((sc) => {
      const Comp = COMPONENTS[sc.name];
      return (
        <Sequence key={sc.name} from={sc.from} durationInFrames={sc.dur} premountFor={15}>
          <SceneFade dur={sc.dur}><Comp lines={sc.lines} dur={sc.dur} /></SceneFade>
        </Sequence>
      );
    })}
    {LINES.map((l) => (
      <Sequence key={l.file} from={l.s} durationInFrames={l.e - l.s + 10} layout="none">
        <Audio src={staticFile(l.file)} />
      </Sequence>
    ))}
    <Header />
    <Subtitle />
    <Progress />
  </AbsoluteFill>
);

const SceneFade = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 8, dur - 8, dur], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
