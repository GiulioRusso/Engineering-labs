// Coil: magnetic field and induction — scene, controls and plots around model/coil.js.
import * as THREE from 'three';
import '../../lib/lab.css';
import { createStage, label } from '../../lib/ui/stage.js';
import { createHandles } from '../../lib/ui/handles.js';
import { createPanel } from '../../lib/ui/panel.js';
import { createPlot } from '../../lib/ui/plots.js';
import { createHud } from '../../lib/ui/hud.js';
import { initExplain } from '../../lib/ui/explain.js';
import { createTour } from '../../lib/ui/tour.js';
import { initTheme, cssVar } from '../../lib/ui/theme.js';
import { readUrl, writeUrl, buildUrl } from '../../lib/ui/urlstate.js';
import { si } from '../../lib/ui/format.js';
import { createFieldLines, traceBoth } from '../../lib/viz/fieldlines.js';
import { createParticles } from '../../lib/viz/particles.js';
import { createArrows } from '../../lib/viz/arrows.js';
import { createSlice } from '../../lib/viz/slice.js';
import { createLegend } from '../../lib/viz/legend.js';
import { logNorm } from '../../lib/viz/colormap.js';
import { sampleStack, addStackField } from '../../lib/physics/axisym.js';
import { MU0 } from '../../lib/physics/loop.js';
import { createModel, scripted, simulateDrop, BOX, DEFAULTS } from './model/coil.js';

const $ = (s) => document.querySelector(s);

// ------------------------------------------------------------------------------------ state ----
const SCENARIOS = {
  'single-loop': { label: 'Single loop', cam: 'iso', motion: 'still',
    p: { mode: 'probe', N: 1, R: 0.05, L: 0.002, I0: 5, f: 0, a: 0.02, x: 0.13, z: 0.12 } },
  'long-solenoid': { label: 'Long solenoid: uniform inside', cam: 'front', motion: 'still',
    p: { mode: 'probe', N: 150, R: 0.025, L: 0.6, I0: 2, f: 0, a: 0.015, x: 0, z: 0.1 } },
  'short-coil': { label: 'Short coil: fringing', cam: 'front', motion: 'still',
    p: { mode: 'probe', N: 12, R: 0.06, L: 0.03, I0: 4, f: 0, a: 0.02, x: 0, z: 0.09 } },
  'magnet-push': { label: 'Push the magnet in', cam: 'iso', motion: 'push', speed: 0.25,
    p: { mode: 'magnet', N: 40, R: 0.04, L: 0.16, Rc: 0.5, open: false, pushT: 0.15, pol: 1, x: 0, z: -0.3 } },
  'magnet-still': { label: 'Magnet held still', cam: 'iso', motion: 'still',
    p: { mode: 'magnet', N: 40, R: 0.04, L: 0.16, Rc: 0.5, open: false, pol: 1, x: 0, z: 0 } },
  'ac-coil': { label: 'AC coil, nearby loop', cam: 'iso', motion: 'still', speed: 0.02,
    p: { mode: 'probe', N: 60, R: 0.03, L: 0.12, I0: 3, f: 50, a: 0.03, Rp: 0.05, x: 0, z: 0.12 },
    layers: { slice: true, sliceField: 'E', arrows: true, arrowField: 'E' } },
  'drop': { label: 'Drop: magnetic braking', cam: 'front', motion: 'drop', speed: 0.5,
    p: { mode: 'magnet', N: 200, R: 0.02, L: 0.2, Rc: 0.05, open: false, mass: 0.05, pol: 1, x: 0, z: 0.3 } },
};
const LAYER_DEFAULTS = { lines: true, particles: true, arrows: false, arrowField: 'B', slice: true, sliceField: 'B', sliceOrient: 'xz', lenz: true, forces: true, labels: true, grid: true };
const BASE = { ...DEFAULTS, open: false, pushT: 0.15, x: 0, z: 0, motion: 'still', speed: 1 };
const URL_KEYS = ['N', 'R', 'L', 'I0', 'f', 'mode', 'a', 'Rp', 'Br', 'pol', 'Rc', 'open', 'mass', 'motion', 'pushT', 'x', 'z', 'speed', ...Object.keys(LAYER_DEFAULTS)];

const state = { scenario: 'magnet-push', ...BASE, ...LAYER_DEFAULTS };
const model = createModel();
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let playing = !reduced, t = 0, D = 2, timeline = null, drop = null, live = { pos: [0, 0, 0], vel: [0, 0, 0], prev: null, hist: [] };
let snap = null, maxima = { emf: 1e-6, I: 1e-6, F: 1e-9, v: 1e-6, phi: 1e-12 }, highlight = null;

// ------------------------------------------------------------------------------------ scene ----
const stage = createStage($('#stage'), {
  size: 0.5,
  presets: {
    front: { pos: [0, -1.25, 0.05] }, side: { pos: [1.25, 0, 0.05] }, top: { pos: [0, -0.001, 1.3] },
    iso: { pos: [0.75, -0.85, 0.5] },
  },
});
stage.grid.position.z = -BOX.z - 0.02;
const handles = createHandles(stage, $('#hint'));
const S = stage.scene;

const mats = {
  copper: new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.35, transparent: true, opacity: 0.62, depthWrite: false }),
  probe: new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.2 }),
  north: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
  south: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
};
const coilGroup = new THREE.Group(); S.add(coilGroup);
let coilMesh = null, coilCurve = null;
const coilLabel = label('coil'); S.add(coilLabel);

const probe = new THREE.Group(); S.add(probe);
const probeMesh = new THREE.Mesh(new THREE.TorusGeometry(1, 1, 8, 72), mats.probe); probe.add(probeMesh);
const probeHit = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.02, 32), new THREE.MeshBasicMaterial({ visible: false }));
probeHit.rotation.x = Math.PI / 2; probe.add(probeHit);
const probeLabel = label('probe ring'); probe.add(probeLabel);

const magnet = new THREE.Group(); S.add(magnet);
const magTop = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32), mats.north);
const magBot = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32), mats.south);
for (const m of [magTop, magBot]) { m.rotation.x = Math.PI / 2; magnet.add(m); }
const nLabel = label('N'), sLabel = label('S'); magnet.add(nLabel, sLabel);

// current carriers: points riding the windings / the probe ring
function carriers(n) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
  const pts = new THREE.Points(geom, new THREE.PointsMaterial({ size: 4.5, sizeAttenuation: false }));
  pts.frustumCulled = false; pts.renderOrder = 2; pts.material.depthTest = false;
  return { pts, u: 0, n };
}
const coilCarriers = carriers(1300); S.add(coilCarriers.pts);
const probeCarriers = carriers(48); probe.add(probeCarriers.pts);

// arrows used as single vectors (force, velocity, Lenz)
function vecArrow(colorVar, text) {
  const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0), mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 14).translate(0, 0.5, 0), mat);
  g.add(shaft, head);
  const lb = label(text); g.add(lb);
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  return {
    g, colorVar, mat,
    set(origin, v, len) {
      const m = Math.hypot(...v);
      g.visible = len > 1e-4 && m > 0;
      if (!g.visible) return;
      d.set(v[0] / m, v[1] / m, v[2] / m);
      g.position.set(...origin);
      g.quaternion.setFromUnitVectors(up, d);
      const hl = Math.min(0.018, len * 0.4), r = 0.0022;
      shaft.scale.set(r, len - hl, r); head.position.y = len - hl; head.scale.set(r * 3, hl, r * 3);
      lb.position.set(0, len + 0.015, 0);
    },
  };
}
const fArrow = vecArrow('--c-F', 'F'), vArrow = vecArrow('--c-v', 'v');
const dphiArrow = vecArrow('--c-ref', 'dΦ/dt'), bindArrow = vecArrow('--c-B', 'B ind');
for (const a of [fArrow, vArrow, dphiArrow, bindArrow]) S.add(a.g);

const lines = createFieldLines(stage);
const parts = createParticles(stage, { count: 700, size: 2.6 });
const arrows = createArrows(stage, 800);
const slice = createSlice(stage, { w: 2 * BOX.rho, h: 2 * BOX.z, res: [120, 160] });
const sliceKnob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), new THREE.MeshStandardMaterial({ roughness: 0.5 }));
S.add(sliceKnob);
const legend = createLegend($('#legend'));

// ------------------------------------------------------------------------------------ build ----
let linesKey = '';
function rebuildCoilMesh() {
  const { N, R, L } = state;
  if (coilMesh) { coilGroup.remove(coilMesh); coilMesh.geometry.dispose(); }
  coilCurve = new (class extends THREE.Curve {
    getPoint(u, o = new THREE.Vector3()) {
      const turns = N === 1 ? 1 : N, th = 2 * Math.PI * turns * u;
      return o.set(R * Math.cos(th), R * Math.sin(th), N === 1 ? 0 : -L / 2 + L * u);
    }
  })();
  const tube = Math.max(0.0005, Math.min(N > 1 ? 0.4 * L / N : 0.0025, 0.0025)); // see-through copper: the field inside stays visible
  coilMesh = new THREE.Mesh(new THREE.TubeGeometry(coilCurve, Math.min(6000, Math.max(96, N * 28)), tube, 6, false), mats.copper);
  coilGroup.add(coilMesh);
  coilLabel.position.set(R + 0.03, 0, N === 1 ? 0.02 : L / 2 + 0.02);
}

// Equal-flux seeds on the source mid-plane: Φ(r) = 2πr·A(r, 0). Line density then follows |B|.
function seeds(T, radius) {
  const tmp = { Br: 0, Bz: 0, A: 0 }, phi = (r) => (sampleStack(T, r, 0, tmp), 2 * Math.PI * r * tmp.A);
  let rmax = radius, best = 0;
  for (let r = radius * 0.02; r < radius * 2; r += radius * 0.01) { const p = phi(r); if (p > best) { best = p; rmax = r; } }
  const radii = [];
  for (const frac of [0.08, 0.3, 0.55, 0.78, 0.94]) {
    let lo = 0, hi = rmax;
    for (let k = 0; k < 40; k++) { const mid = 0.5 * (lo + hi); phi(mid) < frac * best ? (lo = mid) : (hi = mid); }
    radii.push(0.5 * (lo + hi));
  }
  const out = [];
  for (const r of radii) for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; out.push([r * Math.cos(a), r * Math.sin(a), 0]); }
  return out;
}

// Applied-field lines, in the source's own frame: the coil (per ampere) or the magnet.
function rebuildLines() {
  const key = state.mode === 'probe' ? `c${state.N},${state.R},${state.L}` : `m${model.p.rm},${model.p.lm},${state.Br},${state.pol}`;
  if (key === linesKey) return;
  linesKey = key;
  const T = state.mode === 'probe' ? model.coil : model.magnet;
  const I = state.mode === 'probe' ? 1 : model.magnetRingCurrent();
  const radius = state.mode === 'probe' ? state.R : model.p.rm;
  const field = (x, y, z, b) => { b[0] = b[1] = b[2] = 0; addStackField(T, I, 0, 0, 0, x, y, z, b); return Math.hypot(b[0], b[1], b[2]); };
  const inside = (x, y, z) => Math.hypot(x, y) < BOX.rho + 0.05 && Math.abs(z) < BOX.z + 0.05;
  const t0 = performance.now();
  const L = seeds(T, radius).map((s) => traceBoth(field, s, { hMin: 2e-4, hMax: 0.01, tol: 2e-4, maxLen: 2.5, inside }));
  window.__lab.timings.lines = performance.now() - t0;
  lines.set(L);
  parts.setLines(L);
  // colour range from the field actually drawn: 2nd to 97th percentile of |B| along the lines
  // (the top few % sit next to the ring currents, where a ring model is singular)
  const all = L.flatMap((l) => l.mags).filter((m) => m > 0).sort((a, b) => a - b);
  lineRange = all.length ? [all[Math.floor(0.02 * all.length)], all[Math.floor(0.97 * (all.length - 1))]] : [1e-6, 1];
}
let lineRange = [1e-6, 1];

function configure() {
  model.configure({ ...pick(state, Object.keys(DEFAULTS)), Rc: state.open ? Infinity : state.Rc });
  if (state.mode === 'probe' && state.motion === 'drop') state.motion = 'still';
  rebuildCoilMesh();
  rebuildLines();
  buildTimeline();
  placeStatic();
  refreshLegend();
}
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]]));

// ------------------------------------------------------------------------------- kinematics ----
function kinAt(tt) {
  if (state.motion === 'push') return scripted({ x: state.x, z0: state.z, z1: 0, t0: 0.2, T: state.pushT })(tt);
  if (state.motion === 'drop' && drop) {
    const i = Math.min(drop.t.length - 2, Math.max(0, Math.floor(tt / drop.dt))), u = Math.min(1, (tt - drop.t[i]) / drop.dt);
    return { pos: [state.x, 0, drop.z[i] + u * (drop.z[i + 1] - drop.z[i])], vel: [0, 0, drop.v[i] + u * (drop.v[i + 1] - drop.v[i])] };
  }
  if (state.motion === 'live') return { pos: [...live.pos], vel: [...live.vel] };
  return { pos: [state.x, 0, state.z], vel: [0, 0, 0] };
}
const deterministic = () => state.motion !== 'live';

function buildTimeline() {
  drop = state.motion === 'drop' ? simulateDrop(model, { x: state.x, z0: state.z, tEnd: 1.6 }) : null;
  if (state.motion === 'push') D = 0.2 + state.pushT + 0.5;
  else if (state.motion === 'drop') D = drop.t[drop.t.length - 1];
  else if (state.mode === 'probe' && state.f) D = 3 / state.f;
  else D = 2;
  if (!deterministic()) { timeline = null; return; }
  const n = 400, T = new Float64Array(n), phi = new Float64Array(n), emf = new Float64Array(n), iInd = new Float64Array(n);
  maxima = { emf: 1e-9, I: 1e-9, F: 1e-12, v: 1e-6, phi: 1e-15 };
  for (let i = 0; i < n; i++) {
    T[i] = D * i / (n - 1);
    const k = kinAt(T[i]), s = model.evaluate({ t: T[i], ...k });
    phi[i] = s.phi; emf[i] = s.emf; iInd[i] = s.iInd;
    maxima.emf = Math.max(maxima.emf, Math.abs(s.emf)); maxima.I = Math.max(maxima.I, Math.abs(s.iInd));
    maxima.F = Math.max(maxima.F, Math.hypot(...s.F)); maxima.v = Math.max(maxima.v, Math.hypot(...k.vel));
    maxima.phi = Math.max(maxima.phi, Math.abs(s.phi));
  }
  timeline = { t: T, phi, emf, iInd };
  if (t > D) t = 0;
}

// --------------------------------------------------------------------------------- per frame ----
const b3 = [0, 0, 0], e3 = [0, 0, 0];
let frameNo = 0, sliceDirty = true, arrowsDirty = true;

function fieldMag(kind, x, y, z) {
  const v = kind === 'E' ? model.efield(x, y, z, snap, e3) : model.field(x, y, z, snap, b3);
  return Math.hypot(v[0], v[1], v[2]);
}

// |B| colour range: the field-line percentiles, scaled by the drive amplitude for the (per-ampere) coil lines
function bRange() {
  const k = state.mode === 'probe' ? Math.max(Math.abs(state.I0), 1e-3) : 1;
  return [lineRange[0] * k, lineRange[1] * k];
}
function bRef() { return Math.sqrt(bRange()[0] * bRange()[1]); }
function eRef() {
  if (state.mode === 'probe') return Math.max(1e-9, 2 * Math.PI * (state.f || 0) * Math.abs(state.I0) * MU0 * state.N / Math.max(state.L, 2 * state.R) * state.R / 2);
  return Math.max(1e-9, (maxima.v || 0.5) * state.Br / 2 * model.p.rm);
}

function update(dt) {
  const k = kinAt(t);
  const s = model.evaluate({ t, ...k });
  const drive = model.drive(t);
  snap = { ...k, t, iCoil: s.iCoil, iProbe: s.iProbe, dI: state.mode === 'probe' ? drive.dI : 0, s };
  if (state.motion === 'live') {
    live.hist.push([t, s.phi, s.emf, s.iInd]);
    while (live.hist.length && live.hist[0][0] < t - 3) live.hist.shift();
    for (const [key, v] of [['emf', Math.abs(s.emf)], ['I', Math.abs(s.iInd)], ['F', Math.hypot(...s.F)], ['v', Math.hypot(...k.vel)], ['phi', Math.abs(s.phi)]])
      maxima[key] = Math.max(maxima[key] * 0.995, v, 1e-12);
  }
  const pos = k.pos;
  probe.position.set(...pos); magnet.position.set(...pos);
  if (state.mode === 'magnet') { lines.object.position.set(...pos); parts.object.position.set(...pos); }
  else { lines.object.position.set(0, 0, 0); parts.object.position.set(0, 0, 0); }

  // flow: particles ∝ |B| along the lines, direction = sign of the source current; carriers ∝ I
  const iSrc = state.mode === 'probe' ? drive.I / Math.max(Math.abs(state.I0), 1e-9) : 1;
  if (playing) {
    parts.advance(dt, 0.06 * iSrc, state.mode === 'probe' ? bRef() / Math.max(Math.abs(state.I0), 1e-9) : bRef());
    const iC = state.mode === 'probe' ? iSrc : s.iCoil / maxima.I;
    coilCarriers.u += dt * 0.25 * iC / Math.max(1, state.N);
    probeCarriers.u += dt * 0.25 * (s.iProbe / maxima.I);
  }
  lines.color('viridis', normB, state.mode === 'probe' ? Math.abs(drive.I) : 1);
  placeCarriers();

  // vectors
  const vmag = Math.hypot(...k.vel), fmag = Math.hypot(...s.F);
  fArrow.set([pos[0] + 0.03, pos[1], pos[2]], s.F, state.forces ? 0.12 * Math.sqrt(fmag / maxima.F) : 0);
  vArrow.set([pos[0] - 0.03, pos[1], pos[2]], k.vel, state.forces ? 0.12 * Math.sqrt(vmag / maxima.v) : 0);
  // Lenz: at the pickup centre, the flux change and the induced field it causes
  const pc = state.mode === 'probe' ? pos : [0, 0, 0];
  const dphi = -s.emf, rel = Math.abs(s.emf) / maxima.emf;
  const on = state.lenz && rel > 0.02;
  dphiArrow.set([pc[0] + 0.012, pc[1], pc[2]], [0, 0, Math.sign(dphi)], on ? 0.1 * Math.sqrt(rel) : 0);
  const iInd = state.mode === 'probe' ? s.iProbe : s.iCoil;
  bindArrow.set([pc[0] - 0.012, pc[1], pc[2]], [0, 0, Math.sign(iInd) || 1], on && iInd ? 0.1 * Math.sqrt(Math.abs(iInd) / maxima.I) : 0);

  // heavier layers, throttled while things move
  const moving = playing && (vmag > 0 || (state.mode === 'probe' && state.f));
  if (moving && frameNo % 3 === 0) { sliceDirty = true; arrowsDirty = true; }
  if (state.slice && sliceDirty) {
    slice.compute((x, y, z) => fieldMag(state.sliceField, x, y, z), state.sliceField === 'E' ? 'magma' : 'viridis', state.sliceField === 'E' ? normE : normB);
    sliceDirty = false;
  }
  if (state.arrows && arrowsDirty) { drawArrowGrid(); arrowsDirty = false; }
  if (frameNo % 2 === 0 || !playing) { drawPlots(); drawHud(s, k); }
  frameNo++;
}

let normB = logNorm(1e-6, 1), normE = logNorm(1e-6, 1);
function refreshLegend() {
  const [blo, bhi] = bRange();
  normB = logNorm(blo, bhi);
  normE = logNorm(eRef() / 1000, eRef() * 3);
  const showE = state.slice && state.sliceField === 'E';
  legend.set({
    title: showE ? '|E| slice' : '|B| lines and slice', map: showE ? 'magma' : 'viridis',
    lo: showE ? eRef() / 1000 : blo, hi: showE ? eRef() * 3 : bhi, unit: showE ? 'V/m' : 'T',
    swatches: [
      { color: '--c-I', label: 'charge carriers (speed ∝ I)' },
      ...(state.forces ? [{ color: '--c-F', label: 'force on object' }, { color: '--c-v', label: 'velocity' }] : []),
      ...(state.lenz ? [{ color: '--c-ref', label: 'dΦ/dt' }, { color: '--c-B', label: 'induced B (Lenz)' }] : []),
    ],
  });
}

function placeCarriers() {
  const { N } = state;
  const a = coilCarriers.pts.geometry.attributes.position, n = Math.min(coilCarriers.n, Math.max(23, Math.round(N * 6.37))), v = new THREE.Vector3();
  const off = Math.max(0.0005, Math.min(N > 1 ? 0.4 * state.L / N : 0.0025, 0.0025)) * 1.4;
  for (let i = 0; i < n; i++) {
    const u = (((i + 0.5) / n + coilCarriers.u) % 1 + 1) % 1;
    coilCurve.getPoint(u, v);
    const r = Math.hypot(v.x, v.y), f = (r + off) / r;
    a.setXYZ(i, v.x * f, v.y * f, v.z);
  }
  coilCarriers.pts.geometry.setDrawRange(0, n);
  a.needsUpdate = true;
  const p = probeCarriers.pts.geometry.attributes.position, ra = state.a + 0.003;
  for (let i = 0; i < probeCarriers.n; i++) {
    const th = 2 * Math.PI * ((i / probeCarriers.n + probeCarriers.u) % 1);
    p.setXYZ(i, ra * Math.cos(th), ra * Math.sin(th), 0);
  }
  p.needsUpdate = true;
}

function drawArrowGrid() {
  const items = [], E = state.arrowField === 'E';
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) for (let k = -4; k <= 4; k++) {
    const x = i * 0.045, y = j * 0.045, z = k * 0.08;
    const v = E ? model.efield(x, y, z, snap, [0, 0, 0]) : model.field(x, y, z, snap, [0, 0, 0]);
    items.push({ p: [x, y, z], v });
  }
  const norm = E ? normE : normB;
  arrows.set(items, { len: (m) => 0.008 + 0.03 * norm(m), width: 0.013, map: E ? 'magma' : 'viridis', norm });
}

function placeStatic() {
  const pr = state.mode === 'probe';
  probe.visible = pr; magnet.visible = !pr;
  probeMesh.geometry.dispose(); probeMesh.geometry = new THREE.TorusGeometry(state.a, 0.0018, 8, 72);
  probeHit.scale.set(state.a, 1, state.a);
  probeLabel.position.set(state.a + 0.02, 0, 0.012);
  const { rm, lm } = model.p, nUp = state.pol > 0;
  for (const [m, up] of [[magTop, true], [magBot, false]]) {
    m.scale.set(rm, lm / 2, rm); m.position.z = (up ? 1 : -1) * lm / 4;
    m.material = up === nUp ? mats.north : mats.south;
  }
  nLabel.position.set(0, 0, (nUp ? 1 : -1) * (lm / 2 + 0.012)); sLabel.position.set(0, 0, (nUp ? -1 : 1) * (lm / 2 + 0.012));
  lines.object.visible = state.lines; parts.object.visible = state.particles;
  arrows.mesh.visible = state.arrows; slice.mesh.visible = state.slice; sliceKnob.visible = state.slice;
  stage.grid.visible = state.grid;
  for (const o of [coilLabel, probeLabel, nLabel, sLabel]) o.visible = state.labels;
  stage.axes.visible = state.labels;
  slice.place(state.sliceOrient, slice.offset ?? 0);
  placeKnob();
  sliceDirty = arrowsDirty = true;
  applyHighlight();
}
function placeKnob() {
  if (slice.orientation === 'xz') sliceKnob.position.set(BOX.rho, slice.offset, BOX.z);
  else sliceKnob.position.set(BOX.rho, BOX.rho, slice.offset);
}

// ------------------------------------------------------------------------------------ plots ----
const plotAxis = createPlot($('#plot-axis'), { title: 'Bz on the axis', xLabel: 'z', xUnit: 'm', yLabel: 'Bz', yUnit: 'T' });
const plotFlux = createPlot($('#plot-flux'), { title: 'Flux Φ(t)', xLabel: 't', xUnit: 's', yUnit: 'Wb' });
const plotEmf = createPlot($('#plot-emf'), { title: 'EMF and induced current', xLabel: 't', xUnit: 's', yUnit: 'V', y2Unit: 'A' });

function drawPlots() {
  const n = 160, zs = new Float64Array(n), model1 = new Float64Array(n), ref = new Float64Array(n);
  const pr = state.mode === 'probe';
  for (let i = 0; i < n; i++) {
    const z = zs[i] = -BOX.z + 2 * BOX.z * i / (n - 1);
    if (pr) { b3[2] = 0; addStackField(model.coil, state.I0, 0, 0, 0, 0, 0, z, b3); model1[i] = b3[2]; ref[i] = model.solenoidAxis(z, state.I0); }
    else {
      b3[2] = 0; addStackField(model.magnet, model.magnetRingCurrent(), 0, 0, snap.pos[2], snap.pos[0], 0, z, b3); model1[i] = b3[2];
      const d = Math.abs(z - snap.pos[2]);
      ref[i] = d > model.p.lm && !snap.pos[0] ? MU0 * model.magnetMoment() / (2 * Math.PI * d ** 3) : NaN;
    }
  }
  plotAxis.draw({
    xlim: [-BOX.z, BOX.z], shade: [-state.L / 2, state.L / 2],
    series: [
      { x: zs, y: model1, color: '--c-B', label: pr ? 'model (peak I)' : 'magnet' },
      { x: zs, y: ref, color: '--ink', dash: [3, 4], width: 1.3, label: pr ? 'continuous formula' : 'dipole' },
    ],
    cursor: snap.pos[2],
  });
  let T, phi, emf, iInd, xlim;
  if (timeline) {
    ({ t: T, phi, emf, iInd } = timeline);
    xlim = [0, D];
  } else {
    const h = live.hist; T = h.map((r) => r[0]); phi = h.map((r) => r[1]); emf = h.map((r) => r[2]); iInd = h.map((r) => r[3]);
    xlim = [Math.max(0, t - 3), Math.max(3, t)];
  }
  plotFlux.draw({ xlim, series: [{ x: T, y: phi, color: '--c-B', label: pr ? 'through probe' : 'through coil' }], cursor: t });
  plotEmf.draw({ xlim, series: [{ x: T, y: emf, color: '--c-E', label: 'EMF' }, { x: T, y: iInd, color: '--c-I', dash: [5, 3], axis: 1, label: 'I ind' }], cursor: t });
}

// -------------------------------------------------------------------------------------- hud ----
const hud = createHud($('#hud'), [
  { id: 't', label: 't' }, { id: 'I', label: 'I coil' }, { id: 'B0', label: 'B at coil centre' },
  { id: 'phi', label: 'Φ' }, { id: 'emf', label: 'EMF' }, { id: 'iind', label: 'I induced' },
  { id: 'Fz', label: 'F_z on object' }, { id: 'vz', label: 'v_z' }, { id: 'pj', label: 'Joule power' }, 'sep',
  { id: 'faraday', label: 'EMF vs −ΔΦ/Δt' }, { id: 'energy', label: 'F·v + I²R' }, { id: 'div', label: '|∇·B| / |∂B|' },
]);
function drawHud(s, k) {
  hud.set('t', si(t, 's', 3));
  hud.set('I', si(s.iCoil, 'A'));
  model.field(0, 0, 0, snap, b3); hud.set('B0', si(b3[2], 'T'));
  hud.set('phi', si(s.phi, 'Wb')); hud.set('emf', si(s.emf, 'V')); hud.set('iind', si(s.iInd, 'A'));
  hud.set('Fz', si(s.F[2], 'N')); hud.set('vz', si(k.vel[2], 'm/s')); hud.set('pj', si(s.pJoule, 'W'));
  // Faraday check: EMF against a centred finite difference of Φ (deterministic) or of the last frames (live)
  let fd = NaN;
  if (deterministic()) {
    const h = 1e-5, a = model.evaluate({ t: t + h, ...kinAt(t + h) }).phi, b = model.evaluate({ t: t - h, ...kinAt(t - h) }).phi;
    fd = -(a - b) / (2 * h);
  } else if (live.hist.length > 2) {
    const [p, q] = live.hist.slice(-2); fd = -(q[1] - p[1]) / (q[0] - p[0] || 1);
  }
  const ok = Math.abs(fd - s.emf) <= 0.02 * Math.max(Math.abs(s.emf), maxima.emf * 1e-3);
  hud.set('faraday', `${si(fd, 'V')} ${ok ? '✓' : '≠'}`, ok ? 'good' : 'bad');
  hud.show('energy', state.mode === 'magnet');
  const res = s.pMech + s.pJoule;
  hud.set('energy', `${si(res, 'W', 2)} ✓`, Math.abs(res) <= 1e-9 * Math.max(s.pJoule, 1e-12) ? 'good' : 'bad');
  // ∇·B at a point beside the object
  const [x, y, z] = [k.pos[0] + 0.018, k.pos[1] + 0.011, k.pos[2] + 0.02], hh = 1e-3, B = (a, b, c) => model.field(a, b, c, snap, [0, 0, 0]);
  const d = [B(x + hh, y, z)[0] - B(x - hh, y, z)[0], B(x, y + hh, z)[1] - B(x, y - hh, z)[1], B(x, y, z + hh)[2] - B(x, y, z - hh)[2]];
  const rel = Math.abs(d[0] + d[1] + d[2]) / (Math.abs(d[0]) + Math.abs(d[1]) + Math.abs(d[2]) || 1);
  hud.set('div', `${(rel * 100).toFixed(2)} %`, rel < 0.03 ? 'good' : 'bad');
}

// ----------------------------------------------------------------------------------- panel ----
const show = { probe: (s) => s.mode === 'probe', magnet: (s) => s.mode === 'magnet' };
const panel = createPanel($('#panel'), {
  scenarios: Object.entries(SCENARIOS).map(([id, s]) => ({ id, label: s.label })),
  onScenario: (id) => loadScenario(id),
  params: [
    { id: 'mode', label: 'Object', type: 'select', options: [['probe', 'Probe ring (coil driven)'], ['magnet', 'Bar magnet (coil = pickup)']] },
    { id: 'motion', label: 'Motion', type: 'select', options: [['still', 'Held still'], ['push', 'Pushed in'], ['drop', 'Dropped'], ['live', 'Dragged (live)']] },
    { id: 'N', label: 'Turns N', unit: '', min: 1, max: 200, step: 1 },
    { id: 'R', label: 'Coil radius R', unit: 'cm', k: 100, min: 0.01, max: 0.08, step: 0.0005 },
    { id: 'L', label: 'Coil length L', unit: 'cm', k: 100, min: 0.002, max: 0.7, step: 0.001, log: true },
    { id: 'I0', label: 'Coil current I', unit: 'A', min: 0, max: 10, step: 0.1, show: show.probe },
    { id: 'f', label: 'Frequency f (0 = DC)', unit: 'Hz', min: 0, max: 100, step: 1, show: show.probe },
    { id: 'a', label: 'Probe radius a', unit: 'cm', k: 100, min: 0.005, max: 0.05, step: 0.0005, show: show.probe },
    { id: 'Rp', label: 'Probe resistance', unit: 'Ω', min: 0.001, max: 10, log: true, show: show.probe },
    { id: 'Br', label: 'Magnet remanence B_r', unit: 'T', min: 0.1, max: 1.4, step: 0.01, show: show.magnet },
    { id: 'pol', label: 'Magnet polarity', type: 'select', options: [[1, 'N pole up'], [-1, 'N pole down']], show: show.magnet },
    { id: 'Rc', label: 'Coil circuit resistance', unit: 'Ω', min: 0.01, max: 100, log: true, show: show.magnet },
    { id: 'open', label: 'Open circuit (no current)', type: 'check', show: show.magnet },
    { id: 'mass', label: 'Magnet mass', unit: 'kg', min: 0.01, max: 0.5, log: true, show: (s) => s.mode === 'magnet' && s.motion === 'drop' },
    { id: 'pushT', label: 'Push duration', unit: 's', min: 0.05, max: 3, log: true, show: (s) => s.motion === 'push' },
    { id: 'x', label: 'Object x (start)', unit: 'cm', k: 100, min: -0.2, max: 0.2, step: 0.001 },
    { id: 'z', label: 'Object z (start)', unit: 'cm', k: 100, min: -0.35, max: 0.35, step: 0.001 },
  ],
  layers: [
    { id: 'lines', label: 'Field lines', color: '--c-B' },
    { id: 'particles', label: 'Flowing particles' },
    { id: 'slice', label: 'Magnitude slice (drag the knob)' },
    { id: 'sliceField', label: 'Slice shows', options: [['B', '|B|'], ['E', '|E| (induced)']] },
    { id: 'sliceOrient', label: 'Slice plane', options: [['xz', 'Along the axis'], ['xy', 'Across the axis']] },
    { id: 'arrows', label: 'Arrow grid' },
    { id: 'arrowField', label: 'Arrows show', options: [['B', 'B'], ['E', 'E (induced)']] },
    { id: 'lenz', label: 'Lenz arrows (dΦ/dt, induced B)', color: '--c-ref' },
    { id: 'forces', label: 'Force and velocity', color: '--c-F' },
    { id: 'labels', label: 'Labels and axes' },
    { id: 'grid', label: 'Ground grid' },
  ],
}, state, onParam);

function onParam(id) {
  if (id === 'speed') return;
  if (['x', 'z'].includes(id) && state.motion === 'live') state.motion = 'still';
  if (id in LAYER_DEFAULTS) { placeStatic(); refreshLegend(); }
  else configure();
  if (id === 'motion' || id === 'mode') t = 0;
  panel.sync(); syncUrl(); stage.requestRender();
  if (!playing) update(0);
}

// time controls
const T = panel.time;
const speedU = (v) => Math.round(Math.log(v / 0.01) / Math.log(200) * 1000), speedV = (u) => Number((0.01 * Math.pow(200, u / 1000)).toPrecision(2));
function syncTime() {
  T.play.textContent = playing ? 'Pause' : 'Play';
  T.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  T.speed.value = String(speedU(state.speed)); T.speedOut.textContent = String(state.speed);
  T.scrub.disabled = !deterministic();
  T.scrub.value = String(Math.round(1000 * Math.min(1, t / D)));
  T.label.textContent = si(t, 's', 3);
}
function setPlaying(on) { playing = on; stage.setAnimating(on); syncTime(); }
T.play.addEventListener('click', () => setPlaying(!playing));
T.step.addEventListener('click', () => { setPlaying(false); t = Math.min(D, t + D / 200); update(1 / 60); syncTime(); stage.requestRender(); });
T.scrub.addEventListener('input', () => { t = D * Number(T.scrub.value) / 1000; update(0); syncTime(); stage.requestRender(); });
T.speed.addEventListener('input', () => { state.speed = speedV(Number(T.speed.value)); syncTime(); syncUrl(); });

stage.setOnFrame((dt) => {
  t += state.motion === 'live' ? dt : dt * state.speed;
  if (deterministic() && t > D) t %= D;
  if (state.motion === 'live') {
    const a = 1 - Math.exp(-dt / 0.06);
    const raw = live.prev ? live.pos.map((p, i) => (p - live.prev[i]) / Math.max(dt, 1e-3)) : [0, 0, 0];
    live.vel = live.vel.map((v, i) => v + a * (raw[i] - v));
    live.prev = [...live.pos];
  }
  update(dt);
  if (frameNo % 6 === 0) syncTime();
});

// ---------------------------------------------------------------------------------- handles ----
const dragObj = {
  axes: 'xz', hint: 'Drag to move it along or across the axis — the EMF follows your speed',
  get: () => [...(state.motion === 'live' ? live.pos : kinAt(t).pos)],
  set: (p) => {
    p[0] = Math.max(-0.2, Math.min(0.2, p[0])); p[2] = Math.max(-0.35, Math.min(0.35, p[2]));
    live.pos = [p[0], 0, p[2]];
    if (!playing) update(0);
    stage.requestRender();
  },
  onStart: () => {
    if (state.motion !== 'live') {
      live.pos = kinAt(t).pos; live.prev = [...live.pos]; live.vel = [0, 0, 0]; live.hist = [];
      state.motion = 'live'; t = 0; buildTimeline(); panel.sync();
      maxima = { emf: 1e-9, I: 1e-9, F: 1e-12, v: 1e-3, phi: 1e-15 };
    }
    setPlaying(true);
  },
  onEnd: () => { state.x = live.pos[0]; state.z = live.pos[2]; panel.sync(); syncUrl(); },
};
handles.add({ ...dragObj, object: probe });
handles.add({ ...dragObj, object: magnet });
handles.add({
  object: sliceKnob, hint: 'Drag to slide the slice plane',
  get axes() { return slice.orientation === 'xz' ? 'y' : 'z'; },
  get: () => [...sliceKnob.position.toArray()],
  set: (p) => {
    const i = slice.orientation === 'xz' ? 1 : 2, lim = i === 1 ? BOX.rho : BOX.z;
    slice.place(slice.orientation, Math.max(-lim, Math.min(lim, p[i])));
    placeKnob(); sliceDirty = arrowsDirty = true; update(0); stage.requestRender();
  },
});

// ---------------------------------------------------------------------------------- scenarios ----
function loadScenario(id, { keepParams = {} } = {}) {
  const sc = SCENARIOS[id] || SCENARIOS['magnet-push'];
  Object.assign(state, BASE, LAYER_DEFAULTS, sc.p, sc.layers || {}, { scenario: id, motion: sc.motion, speed: sc.speed ?? 1 }, keepParams);
  t = 0; live.hist = [];
  slice.offset = 0;
  configure(); panel.sync(); syncTime();
  stage.preset(sc.cam);
  update(0); stage.requestRender(); syncUrl();
}

function syncUrl() {
  const sc = SCENARIOS[state.scenario], ref = { ...BASE, ...LAYER_DEFAULTS, ...sc.p, ...(sc.layers || {}), motion: sc.motion, speed: sc.speed ?? 1 };
  const diff = {};
  for (const k of URL_KEYS) if (state[k] !== ref[k]) diff[k] = state[k];
  writeUrl(state.scenario, diff, tour.index >= 0 ? tour.index + 1 : null);
}

// ---------------------------------------------------------------------------- explain + tour ----
function applyHighlight() {
  const k = highlight;
  mats.copper.emissive.set(k === 'coil' ? 0x553311 : 0x000000);
  lines.object.material.linewidth = k === 'lines' ? 3.4 : 2.2;
  mats.probe.emissive.set(k === 'pickup' ? 0x334455 : 0x000000);
  for (const m of [mats.north, mats.south]) m.emissive.set(k === 'pickup' ? 0x222222 : 0x000000);
  $('#plot-emf').style.outline = k === 'emf' ? '2px solid var(--accent)' : '';
  $('#plot-flux').style.outline = k === 'pickup' ? '2px solid var(--accent)' : '';
  stage.requestRender();
}
const explain = initExplain($('#explain'), $('#b-explain'), (k) => {
  highlight = k;
  if (k === 'lenz' && !state.lenz) { state.lenz = true; placeStatic(); panel.sync(); }
  if (k === 'efield' && state.sliceField !== 'E') { state.sliceField = 'E'; state.slice = true; placeStatic(); refreshLegend(); panel.sync(); }
  applyHighlight();
  if (coilCurve) update(0); // the drawer initialises before the first scenario loads
});

const step = (title, text, id, extra = {}, after) => ({
  title, text, apply: () => { loadScenario(id, { keepParams: extra }); after?.(); setPlaying(!reduced); },
});
const tour = createTour($('#tour'), [
  step('One loop of current', 'Current in a single ring makes a field that threads the middle and curls back around the wire. Watch the particles: they flow faster where the field is stronger.', 'single-loop'),
  step('Stack the loops', 'Put 150 rings side by side. Inside, their fields add up to a nearly uniform B = μ0·n·I. Outside, they almost cancel. Compare the blue model curve with the dashed formula.', 'long-solenoid'),
  step('Push the magnet in', 'The magnet moves into the coil, the flux through the coil changes, and an EMF appears. The induced field (blue arrow) points against the change in flux (grey arrow): Lenz’s law.', 'magnet-push'),
  step('Ten times slower', 'Same push, ten times slower. The EMF peak is about ten times smaller but lasts ten times longer. The area under EMF(t) is the total change in flux, whatever the speed.', 'magnet-push', { pushT: 1.5, speed: 1 }),
  step('Hold it still', 'The magnet sits in the middle of the coil: the flux is at its maximum, yet the EMF is zero. Only a change in flux induces anything. Drag the magnet yourself to make one.', 'magnet-still'),
  step('Why the magnet is slowed down', 'Drop the magnet through a closed coil. The induced current pushes back on it, and its kinetic energy becomes heat in the coil (F·v + I²R stays at zero). Tick “Open circuit” and it falls freely.', 'drop'),
], { onStep: () => syncUrl() });

// ------------------------------------------------------------------------------------ header ----
for (const b of document.querySelectorAll('[data-cam]')) b.addEventListener('click', () => stage.preset(b.dataset.cam));
$('#b-ortho').addEventListener('click', (e) => e.currentTarget.setAttribute('aria-pressed', String(stage.toggleOrtho())));
$('#b-reset').addEventListener('click', () => loadScenario(state.scenario));
$('#b-tour').addEventListener('click', () => tour.toggle());
$('#b-link').addEventListener('click', async (e) => {
  const sc = SCENARIOS[state.scenario], ref = { ...BASE, ...LAYER_DEFAULTS, ...sc.p, ...(sc.layers || {}), motion: sc.motion, speed: sc.speed ?? 1 };
  const diff = {};
  for (const k of URL_KEYS) if (state[k] !== ref[k]) diff[k] = state[k];
  const url = location.href.split(/[?#]/)[0] + buildUrl(state.scenario, diff, tour.index >= 0 ? tour.index + 1 : null).replace(location.pathname, '');
  try { await navigator.clipboard.writeText(url); e.currentTarget.textContent = 'Copied'; } catch { prompt('Link to this view:', url); }
  setTimeout(() => { $('#b-link').textContent = 'Copy link'; }, 1500);
});
$('#b-panel').addEventListener('click', (e) => {
  const closed = $('#app').classList.toggle('panel-closed');
  e.currentTarget.setAttribute('aria-expanded', String(!closed));
});
if (matchMedia('(max-width: 760px)').matches) { $('#app').classList.add('panel-closed'); $('#b-panel').setAttribute('aria-expanded', 'false'); }

initTheme($('#b-theme'), () => {
  stage.setTheme();
  mats.copper.color.set(cssVar('--copper')); mats.probe.color.set(cssVar('--c-ref'));
  mats.north.color.set(cssVar('--c-north')); mats.south.color.set(cssVar('--c-south'));
  coilCarriers.pts.material.color.set(cssVar('--c-I')); probeCarriers.pts.material.color.set(cssVar('--c-I'));
  parts.material.color.set(cssVar('--ink')); parts.material.opacity = 0.7;
  sliceKnob.material.color.set(cssVar('--accent'));
  for (const a of [fArrow, vArrow, dphiArrow, bindArrow]) a.mat.color.set(cssVar(a.colorVar));
  plotAxis.redraw(); plotFlux.redraw(); plotEmf.redraw();
});

addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
  else if (e.key === 'r' || e.key === 'R') loadScenario(state.scenario);
  else if (e.key === 't' || e.key === 'T') tour.toggle();
  else if (e.key === 'Escape') { tour.close(); explain.close(); }
  else if ('1234'.includes(e.key) && e.key.length === 1) stage.preset(['front', 'side', 'top', 'iso'][Number(e.key) - 1]);
});

// ------------------------------------------------------------------------------------- start ----
window.__lab = { timings: {}, gif: { scenario: 'magnet-push' }, stage, state, scenarios: Object.keys(SCENARIOS), load: loadScenario, setPlaying, get t() { return t; }, set t(v) { t = v; update(0); stage.requestRender(); } };
{
  const u = readUrl();
  const keep = {};
  for (const [k, v] of Object.entries(u.params)) {
    if (!URL_KEYS.includes(k)) continue;
    keep[k] = v === 'true' ? true : v === 'false' ? false : Number.isFinite(Number(v)) ? Number(v) : v;
  }
  loadScenario(u.scenario && SCENARIOS[u.scenario] ? u.scenario : 'magnet-push', { keepParams: keep });
  stage.preset(SCENARIOS[state.scenario].cam, { instant: true });
  if (u.tour) tour.show(u.tour - 1);
  setPlaying(playing);
}
