// Inertia Lab — UI layer · Abdullah Alruwailil · MIT
import { simulate, sweepRES, BESS_MODES, LIMITS } from './model.js';

const $ = (id) => document.getElementById(id);
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const COLORS = { none: css('--none'), gfl: css('--gfl'), gfm: css('--gfm') };
const MODES = ['none', 'gfl', 'gfm'];
const UNITS = 20;

const state = { results: {}, sweep: null, playing: false };

// ---------- Inputs ----------
const inputs = {
  res: $('res'), load: $('load'), loss: $('loss'), bess: $('bess'), h: $('h'), ufls: $('ufls'),
};
function params() {
  return {
    resShare: +inputs.res.value / 100,
    loadMW: +inputs.load.value,
    lossMW: +inputs.loss.value,
    bessMW: +inputs.bess.value,
    Hsync: +inputs.h.value,
    ufls: inputs.ufls.checked,
  };
}
function labels(p) {
  $('resVal').textContent = `${Math.round(p.resShare * 100)} %`;
  $('loadVal').textContent = `${(p.loadMW / 1000).toFixed(0)} GW`;
  $('lossVal').textContent = `${p.lossMW.toLocaleString()} MW`;
  $('bessVal').textContent = `${p.bessMW.toLocaleString()} MW`;
  $('hVal').textContent = `${p.Hsync.toFixed(1)} s`;
}

// ---------- Fleet ----------
const turbineSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><g class="rotor"><circle cx="12" cy="12" r="2.2"/><path d="M12 9.8V3.5M13.9 13.1l5.4 3.1M10.1 13.1l-5.4 3.1"/></g><circle cx="12" cy="12" r="10" stroke-opacity=".35"/></svg>`;
const solarSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="11" rx="1.5"/><path d="M3 11.5h18M9 6v11M15 6v11M12 17v3M8 20h8"/></svg>`;
let rotors = [];
let rotorAngle = 0;

function renderFleet(p, tripped = false) {
  const sync = Math.round(UNITS * (1 - p.resShare));
  const html = [];
  for (let i = 0; i < UNITS; i++) {
    const isSync = i < sync;
    const trip = tripped && isSync && i === 0;
    html.push(`<div class="unit ${isSync ? 'sync' : 'res'} ${trip ? 'tripped' : ''}" title="${isSync ? 'Synchronous generator (stores kinetic energy)' : 'Inverter-based renewable (no inertia)'}">${isSync ? turbineSVG : solarSVG}</div>`);
  }
  $('fleet').innerHTML = html.join('');
  rotors = [...document.querySelectorAll('.unit.sync:not(.tripped) .rotor')];
  const r0 = state.results.none?.metrics;
  $('fleetLabel').textContent = `${sync} synchronous · ${UNITS - sync} inverter-based · stored kinetic energy ${r0 ? r0.kineticEnergyGWs.toFixed(0) : '–'} GW·s`;
}

// Rotor speed tracks grid frequency (deviation exaggerated ×40 so it is visible).
let liveHz = 50;
function spin() {
  const speed = Math.max(0, 1 + (liveHz - 50) * 0.4);
  rotorAngle = (rotorAngle + 6 * speed) % 360;
  for (const r of rotors) r.setAttribute('transform', `rotate(${rotorAngle} 12 12)`);
  requestAnimationFrame(spin);
}
function setLiveHz(hz) {
  liveHz = hz ?? 0;
  const el = $('liveHz');
  el.textContent = hz == null ? 'BLACKOUT' : `${hz.toFixed(3)} Hz`;
  el.style.color = hz == null || hz < 49 ? css('--bad') : hz < 49.5 ? css('--warn') : css('--text');
}

// ---------- Charts ----------
Chart.defaults.color = '#8a9ab0';
Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
Chart.defaults.borderColor = '#1f2b3d';

const lineDs = (label, color, extra = {}) => ({ label, data: [], borderColor: color, backgroundColor: color, borderWidth: 2.4, pointRadius: 0, tension: 0, spanGaps: false, ...extra });
const refDs = (label, color) => lineDs(label, color, { borderDash: [6, 5], borderWidth: 1.2 });

const freqChart = new Chart($('freqChart'), {
  type: 'line',
  data: { datasets: [
    lineDs(BESS_MODES.none.label, COLORS.none),
    lineDs(BESS_MODES.gfl.label, COLORS.gfl),
    lineDs(BESS_MODES.gfm.label, COLORS.gfm),
    refDs('UFLS stage 1 (49.0 Hz)', '#ffb02099'),
    refDs('Collapse (47.5 Hz)', '#ff5a5f99'),
  ] },
  options: {
    animation: false, maintainAspectRatio: false, parsing: false, normalized: true,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { type: 'linear', min: 0, max: 20, title: { display: true, text: 'Time [s]' }, grid: { color: '#141d2a' } },
      y: { title: { display: true, text: 'Frequency [Hz]' }, grid: { color: '#141d2a' } },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y?.toFixed(3)} Hz` } },
    },
  },
});

const cliffChart = new Chart($('cliffChart'), {
  type: 'line',
  data: { datasets: [
    lineDs('No support', COLORS.none),
    lineDs('Grid-following', COLORS.gfl),
    lineDs('Grid-forming', COLORS.gfm),
    { label: 'Current scenario', type: 'scatter', data: [], pointRadius: 6, pointBackgroundColor: '#36d6ff', pointBorderColor: '#021018', borderWidth: 2 },
  ] },
  options: {
    animation: false, maintainAspectRatio: false, parsing: false,
    scales: {
      x: { type: 'linear', min: 0, max: 95, title: { display: true, text: 'Renewable share [%]' }, grid: { color: '#141d2a' } },
      y: { title: { display: true, text: 'Nadir [Hz]' }, grid: { color: '#141d2a' } },
    },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y.toFixed(2)} Hz @ ${c.parsed.x.toFixed(0)} %` } } },
  },
});

const powerChart = new Chart($('powerChart'), {
  type: 'line',
  data: { datasets: [
    lineDs('Governors (spinning fleet)', '#36d6ff'),
    lineDs('Battery', COLORS.gfm),
    lineDs('Load shed', '#ffb020'),
    refDs('Generation lost', '#ff5a5f'),
  ] },
  options: {
    animation: false, maintainAspectRatio: false, parsing: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { type: 'linear', min: 0, max: 20, title: { display: true, text: 'Time [s]' }, grid: { color: '#141d2a' } },
      y: { title: { display: true, text: 'MW' }, beginAtZero: true, grid: { color: '#141d2a' } },
    },
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 3 } } },
  },
});

const toXY = (t, y, upto = Infinity) => {
  const out = [];
  for (let i = 0; i < t.length && t[i] <= upto; i++) out.push({ x: t[i], y: y[i] });
  return out;
};

// ---------- Rendering ----------
function renderKPIs(p) {
  $('kpis').innerHTML = MODES.map((m) => {
    const r = state.results[m].metrics;
    const status = r.status;
    const cls = status.split(' ')[0];
    const disabled = m !== 'none' && p.bessMW === 0;
    return `<div class="card kpi">
      <div class="top"><div class="name"><span class="dot" style="background:${COLORS[m]}"></span>${BESS_MODES[m].label}</div>
      <span class="badge ${cls}">${disabled ? 'NO BATTERY' : status}</span></div>
      <div class="vals">
        <div><div class="v">${r.blackout ? '—' : r.nadir.toFixed(2)}</div><div class="k">Nadir [Hz]</div></div>
        <div><div class="v" style="color:${r.maxRocof > LIMITS.rocofHz ? css('--bad') : 'inherit'}">${r.maxRocof.toFixed(2)}</div><div class="k">RoCoF [Hz/s]</div></div>
        <div><div class="v">${(r.shedMW / 1000).toFixed(1)}</div><div class="k">Load shed [GW]</div></div>
      </div></div>`;
  }).join('');
}

function renderFreq(upto = Infinity) {
  let lo = 50;
  MODES.forEach((m, i) => {
    const r = state.results[m];
    freqChart.data.datasets[i].data = toXY(r.t, r.f, upto);
    lo = Math.min(lo, r.metrics.blackout ? 47.3 : r.metrics.nadir);
  });
  freqChart.data.datasets[3].data = [{ x: 0, y: 49 }, { x: 20, y: 49 }];
  freqChart.data.datasets[4].data = lo < 48 ? [{ x: 0, y: 47.5 }, { x: 20, y: 47.5 }] : [];
  freqChart.options.scales.y.min = Math.floor((lo - 0.15) * 10) / 10;
  freqChart.options.scales.y.max = 50.1;
  freqChart.update('none');
}

function renderPower(p, upto = Infinity) {
  const m = $('powerMode').value;
  const r = state.results[m];
  powerChart.data.datasets[0].data = toXY(r.t, r.pm, upto);
  powerChart.data.datasets[1].data = toXY(r.t, r.pb, upto);
  powerChart.data.datasets[1].borderColor = COLORS[m];
  powerChart.data.datasets[2].data = toXY(r.t, r.shed, upto);
  powerChart.data.datasets[3].data = [{ x: 1, y: p.lossMW }, { x: 20, y: p.lossMW }];
  powerChart.update('none');
}

function renderCliff(p) {
  const s = state.sweep;
  MODES.forEach((m, i) => {
    cliffChart.data.datasets[i].data = s.shares.map((x, k) => ({ x: x * 100, y: s.modes[m][k].nadir }));
  });
  const cur = state.results[$('powerMode').value].metrics;
  cliffChart.data.datasets[3].data = [{ x: p.resShare * 100, y: cur.blackout ? 47.4 : cur.nadir }];
  cliffChart.update('none');
}

let sweepTimer = null;
function recompute({ sweep = true } = {}) {
  const p = params();
  labels(p);
  for (const m of MODES) state.results[m] = simulate({ ...p, bessMode: m, tEnd: 20, dt: 0.001 });
  renderFleet(p);
  renderKPIs(p);
  renderFreq();
  renderPower(p);
  setLiveHz(50);
  if (sweep) {
    clearTimeout(sweepTimer);
    sweepTimer = setTimeout(() => { state.sweep = sweepRES(p, 38); renderCliff(p); }, 80);
  } else if (state.sweep) renderCliff(p);
}

// ---------- Playback ----------
function play() {
  if (state.playing) return;
  state.playing = true;
  $('playBtn').disabled = true;
  const p = params();
  renderFleet(p, true);
  const m = $('powerMode').value;
  const r = state.results[m];
  const SPEED = 2.2;     // sim seconds per real second
  const t0 = performance.now();
  const step = (now) => {
    const simT = ((now - t0) / 1000) * SPEED;
    renderFreq(simT);
    renderPower(p, simT);
    const i = Math.min(r.t.length - 1, Math.round(simT / 0.01));
    setLiveHz(r.f[i]);
    if (simT < 20) requestAnimationFrame(step);
    else {
      state.playing = false;
      $('playBtn').disabled = false;
      $('playBtn').innerHTML = '↻&nbsp; Replay the trip';
    }
  };
  requestAnimationFrame(step);
}

// ---------- Wiring ----------
const PRESETS = {
  classic: { res: 10, load: 20000, loss: 1200, bess: 1000, h: 5 },
  today: { res: 40, load: 20000, loss: 1200, bess: 1000, h: 5 },
  '2035': { res: 75, load: 20000, loss: 1200, bess: 1000, h: 5 },
  edge: { res: 90, load: 20000, loss: 1800, bess: 1500, h: 4.5 },
};
let debounce = null;
Object.values(inputs).forEach((el) => el.addEventListener('input', () => {
  if (state.playing) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => recompute(), 30);
}));
$('powerMode').addEventListener('change', () => { if (!state.playing) recompute({ sweep: false }); });
document.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
  if (state.playing) return;
  const ps = PRESETS[b.dataset.preset];
  for (const k of Object.keys(ps)) inputs[k].value = ps[k];
  recompute();
}));
$('playBtn').addEventListener('click', play);

recompute();
requestAnimationFrame(spin);
