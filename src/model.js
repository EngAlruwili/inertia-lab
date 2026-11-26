/**
 * Inertia Lab — System Frequency Response (SFR) model
 * Author: Abdullah Alruwailil
 * License: MIT
 *
 * Aggregated single-bus swing-equation model of a power system after a
 * sudden generation loss. All powers are per-unit on the pre-event system
 * load; frequency deviation is per-unit on nominal frequency.
 *
 *   2·H_sys · dΔf/dt = ΔP_m + ΔP_bess + ΔP_shed − ΔP_loss − D·Δf
 *
 * H_sys   = H_sync · (1 − RES share)      (inverter-based plants add no inertia)
 * ΔP_m    = reheat-steam governor response of the remaining synchronous fleet
 * ΔP_bess = battery response (none / grid-following FFR / grid-forming VSM)
 * ΔP_shed = under-frequency load shedding (UFLS) stages
 */

export const DEFAULTS = Object.freeze({
  f0: 50,              // nominal frequency [Hz]
  loadMW: 20000,       // system demand [MW]
  lossMW: 1200,        // largest credible contingency [MW]
  resShare: 0.5,       // share of demand served by inverter-based renewables [0..1]
  Hsync: 5.0,          // inertia constant of synchronous fleet [s]
  D: 1.0,              // load damping [pu P / pu f]
  R: 0.05,             // governor droop [pu]
  headroom: 0.10,      // governor headroom as share of online sync capacity
  Tg: 0.2,             // governor time constant [s]
  Tr: 7.0,             // reheater time constant [s]
  Fhp: 0.3,            // high-pressure turbine fraction
  bessMW: 1000,        // battery power rating [MW]
  bessMode: 'none',    // 'none' | 'gfl' | 'gfm'
  Hv: 6.0,             // virtual inertia of grid-forming BESS on its own rating [s]
  Rb: 0.01,            // battery droop on its own rating [pu]
  ufls: true,          // enable under-frequency load shedding
  tEvent: 1,           // time of generator trip [s]
  tEnd: 30,            // simulation horizon [s]
  dt: 0.001,           // integration step [s]
});

/** Battery control personalities. */
export const BESS_MODES = Object.freeze({
  none: { label: 'No battery support', inertia: false, droop: false, Tm: 0, Tb: 0, delay: 0 },
  // Grid-following: PLL-based measurement, deadband detection delay, converter lag.
  gfl:  { label: 'Grid-following battery (FFR)', inertia: false, droop: true, Tm: 0.10, Tb: 0.15, delay: 0.25 },
  // Grid-forming virtual synchronous machine: voltage-source behaviour, near-instant.
  gfm:  { label: 'Grid-forming battery (VSM)', inertia: true, droop: true, Tm: 0.02, Tb: 0.02, delay: 0 },
});

/** Under-frequency load shedding plan (Hz threshold, share of load, relay delay s). */
export const UFLS_STAGES = Object.freeze([
  { f: 49.0, share: 0.05, delay: 0.15 },
  { f: 48.8, share: 0.05, delay: 0.15 },
  { f: 48.6, share: 0.05, delay: 0.15 },
  { f: 48.4, share: 0.05, delay: 0.15 },
  { f: 48.2, share: 0.05, delay: 0.15 },
]);

export const LIMITS = Object.freeze({
  blackoutHz: 47.5,    // generator under-frequency protection → system collapse
  rocofHz: 1.0,        // RoCoF protection setting [Hz/s] over 500 ms window
  rocofWindow: 0.5,
});

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/**
 * Run one simulation.
 * @param {Partial<typeof DEFAULTS>} input
 * @returns {{t:number[], f:number[], pm:number[], pb:number[], shed:number[], metrics:object}}
 */
export function simulate(input = {}) {
  const p = { ...DEFAULTS, ...input };
  const mode = BESS_MODES[p.bessMode] ?? BESS_MODES.none;

  const syncShare = clamp(1 - p.resShare, 0.0, 1.0);
  const Hsys = Math.max(p.Hsync * syncShare, 1e-3);   // on load base
  const dPloss = p.lossMW / p.loadMW;
  const bessPu = mode === BESS_MODES.none ? 0 : p.bessMW / p.loadMW;
  const govMax = p.headroom * syncShare;              // pu of load
  const Kgov = syncShare / p.R;                       // aggregate governor gain

  // States
  let df = 0;          // pu frequency deviation
  let pv = 0;          // valve position (pu)
  let pr = 0;          // reheater output (pu)
  let fm = 0;          // battery-measured frequency deviation (pu)
  let rocofM = 0;      // battery-measured RoCoF (pu/s)
  let pb = 0;          // battery output (pu)
  let shed = 0;        // load shed (pu)
  let dfdtPrev = 0;

  const stageTimers = UFLS_STAGES.map(() => null);
  const stageDone = UFLS_STAGES.map(() => false);

  const t = [], f = [], pmArr = [], pbArr = [], shedArr = [];
  const sampleEvery = Math.max(1, Math.round(0.01 / p.dt)); // store at 100 Hz
  const n = Math.round(p.tEnd / p.dt);

  let nadir = p.f0, tNadir = 0, blackout = false, tBlackout = null;
  const histF = [];       // for windowed RoCoF
  const winN = Math.round(LIMITS.rocofWindow / p.dt);
  let maxRocof = 0;

  for (let k = 0; k <= n; k++) {
    const time = k * p.dt;
    const event = time >= p.tEvent ? 1 : 0;

    // --- Governor + reheat turbine (limited by headroom) ---
    const pvRef = clamp(-Kgov * df, -govMax, govMax);
    pv += (p.dt / p.Tg) * (pvRef - pv);
    pr += (p.dt / p.Tr) * (pv - pr);
    const pm = p.Fhp * pv + (1 - p.Fhp) * pr;

    // --- Battery ---
    if (bessPu > 0) {
      fm += mode.Tm > 0 ? (p.dt / mode.Tm) * (df - fm) : (df - fm);
      rocofM += mode.Tm > 0 ? (p.dt / mode.Tm) * (dfdtPrev - rocofM) : (dfdtPrev - rocofM);
      let ref = 0;
      if (time >= p.tEvent + mode.delay) {
        if (mode.droop) ref += -(fm / p.Rb) * bessPu;
        if (mode.inertia) ref += -2 * p.Hv * rocofM * bessPu;
      }
      ref = clamp(ref, -bessPu, bessPu);
      pb += mode.Tb > 0 ? (p.dt / mode.Tb) * (ref - pb) : (ref - pb);
      pb = clamp(pb, -bessPu, bessPu);
    }

    // --- UFLS ---
    const fHz = p.f0 * (1 + df);
    if (p.ufls) {
      UFLS_STAGES.forEach((s, i) => {
        if (stageDone[i]) return;
        if (fHz <= s.f) {
          if (stageTimers[i] === null) stageTimers[i] = time;
          if (time - stageTimers[i] >= s.delay) { stageDone[i] = true; shed += s.share; }
        } else {
          stageTimers[i] = null;
        }
      });
    }

    // --- Swing equation ---
    const imbalance = pm + pb + shed - event * dPloss - p.D * df;
    const dfdt = blackout ? 0 : imbalance / (2 * Hsys);
    if (!blackout) df += p.dt * dfdt;
    dfdtPrev = dfdt;

    const fNow = p.f0 * (1 + df);
    histF.push(fNow);
    if (histF.length > winN) {
      const r = Math.abs(fNow - histF[histF.length - 1 - winN]) / LIMITS.rocofWindow;
      if (r > maxRocof) maxRocof = r;
      if (histF.length > 2 * winN) histF.splice(0, histF.length - winN - 1);
    }
    if (fNow < nadir) { nadir = fNow; tNadir = time; }
    if (!blackout && fNow <= LIMITS.blackoutHz) { blackout = true; tBlackout = time; }

    if (k % sampleEvery === 0) {
      t.push(+time.toFixed(3));
      f.push(blackout ? null : fNow);
      pmArr.push(pm * p.loadMW);
      pbArr.push(pb * p.loadMW);
      shedArr.push(shed * p.loadMW);
    }
  }

  const initialRocof = (dPloss * p.f0) / (2 * Hsys);  // analytical, Hz/s
  const shedMW = shed * p.loadMW;
  let status = 'SECURE';
  if (blackout) status = 'BLACKOUT';
  else if (maxRocof > LIMITS.rocofHz) status = 'ROCOF TRIP RISK';
  else if (shedMW > 0) status = 'LOAD SHED';

  return {
    t, f, pm: pmArr, pb: pbArr, shed: shedArr,
    metrics: {
      Hsys, initialRocof, maxRocof, nadir, tNadir,
      finalHz: blackout ? null : p.f0 * (1 + df),
      shedMW, blackout, tBlackout, status,
      kineticEnergyGWs: (Hsys * p.loadMW) / 1000,
    },
  };
}

/**
 * Sweep renewable share and return frequency nadir for each battery mode.
 * Reveals the "inertia cliff".
 */
export function sweepRES(input = {}, steps = 40, maxShare = 0.95) {
  const shares = Array.from({ length: steps + 1 }, (_, i) => (i / steps) * maxShare);
  const out = { shares, modes: {} };
  for (const mode of Object.keys(BESS_MODES)) {
    out.modes[mode] = shares.map((s) => {
      const r = simulate({ ...input, resShare: s, bessMode: mode, tEnd: 12, dt: 0.002 });
      return { nadir: r.metrics.blackout ? DEFAULTS.f0 - 2.6 : r.metrics.nadir, status: r.metrics.status, rocof: r.metrics.maxRocof };
    });
  }
  return out;
}
