// Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, sweepRES } from '../src/model.js';

test('initial RoCoF matches analytical ΔP·f0 / 2H', () => {
  const r = simulate({ resShare: 0.5, bessMode: 'none', ufls: false, tEnd: 1.2 });
  // H_sys = 5 * 0.5 = 2.5 s ; ΔP = 1200/20000 = 0.06 pu → 0.06*50/5 = 0.6 Hz/s
  assert.ok(Math.abs(r.metrics.initialRocof - 0.6) < 1e-9);
  // numerical slope over the first 20 ms after the event
  const i0 = r.t.indexOf(1), i1 = r.t.indexOf(1.02);
  const slope = (r.f[i1] - r.f[i0]) / 0.02;
  assert.ok(Math.abs(slope + 0.6) < 0.03, `slope was ${slope}`);
});

test('steady-state deviation follows droop + damping (no limits hit)', () => {
  const r = simulate({ resShare: 0, lossMW: 400, bessMode: 'none', ufls: false, tEnd: 120, dt: 0.005 });
  // Δf_ss = −ΔP / (1/R + D) = −0.02 / 21 pu
  const expected = 50 * (1 - 0.02 / 21);
  assert.ok(Math.abs(r.metrics.finalHz - expected) < 0.005, `final ${r.metrics.finalHz} vs ${expected}`);
});

test('less inertia → deeper nadir', () => {
  const lo = simulate({ resShare: 0.2, ufls: false });
  const hi = simulate({ resShare: 0.7, ufls: false });
  assert.ok(hi.metrics.nadir < lo.metrics.nadir);
});

test('grid-forming beats grid-following beats nothing', () => {
  const base = { resShare: 0.75 };
  const none = simulate({ ...base, bessMode: 'none' });
  const gfl = simulate({ ...base, bessMode: 'gfl' });
  const gfm = simulate({ ...base, bessMode: 'gfm' });
  assert.ok(gfm.metrics.nadir > gfl.metrics.nadir, `gfm ${gfm.metrics.nadir} gfl ${gfl.metrics.nadir}`);
  assert.ok(gfl.metrics.nadir > none.metrics.nadir || none.metrics.blackout);
  assert.ok(gfm.metrics.maxRocof < none.metrics.maxRocof);
});

test('sweep reveals the inertia cliff', () => {
  const s = sweepRES({}, 20);
  const none = s.modes.none;
  assert.equal(none[0].status, 'SECURE');
  assert.ok(none.some((x) => x.status === 'BLACKOUT' || x.status === 'LOAD SHED'));
});
