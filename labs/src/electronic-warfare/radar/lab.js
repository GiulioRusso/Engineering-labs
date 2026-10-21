// Radar and electronic warfare: pulses and the matched filter, the range–Doppler map, detection in noise,
// the PPI scope, and jamming with its burn-through range. 2D throughout.
import * as THREE from 'three';
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createSurface } from '../../lib/viz/surface.js';
import { rng } from '../../maths/probability/model.js';
import { C0, db, lin, unambiguousRange, rangeResolution, unambiguousVelocity, apparentRange, foldVelocity, matched, snr, pd, thresholdFor, signalPower, jammerPower, burnThrough } from './model.js';

const LAM = 0.03, fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞'), km = 1e3;
const TGT = [[8, 40, 10], [12, -20, 3]]; // range-Doppler targets: range (km), velocity (m/s), rcs (m²)

export default {
  id: 'radar', title: 'Radar', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 12,
  defaults: {
    prf: 1000, tau: 1e-6, B: 0, R1: 40 * km, dR: 300, R2on: true,
    dprf: 10e3, Np: 32, v1: 40, r1: 8, clutter: true,
    Pt: 100, G: 30, rcs: 1, R: 60 * km, F: 3, Bw: 1, pfa: 1e-6, n: 1,
    rpm: 12, persist: 3, rain: false, fast: false,
    Pj: 10, Gj: 10, Bj: 10, need: 10, standoff: false, Rj: 100 * km, sl: -30,
  },
  cases: [
    { id: 'pulses', label: 'Pulses', set: {}, examples: [
      { id: 'resolve', label: 'Shorter pulse: two targets apart', set: { tau: 0.5e-6, dR: 120 } },
      { id: 'chirp', label: 'Long chirp, compressed', set: { tau: 10e-6, B: 5e6, dR: 60 } },
      { id: 'ambig', label: 'Beyond R_u: second-time-around', controls: ['R1', 'prf'], set: { R1: 200 * km, R2on: false } },
      { id: 'lowprf', label: 'Lower PRF: unambiguous again', controls: ['R1', 'prf'], set: { R1: 200 * km, R2on: false, prf: 500 } },
    ] },
    { id: 'doppler', label: 'Range–Doppler', set: {}, examples: [
      { id: 'fast', label: 'Fast target: velocity folds', controls: ['v1', 'dprf'], set: { v1: 100 } },
      { id: 'far', label: 'Far target: range folds', controls: ['r1', 'dprf'], set: { r1: 20 } },
      { id: 'pulses', label: 'More pulses: finer velocity', controls: ['Np'], set: { Np: 128 } },
      { id: 'mti', label: 'Clutter off: moving targets only', controls: ['clutter'], set: { clutter: false } },
    ] },
    { id: 'detect', label: 'Detection', set: { G: 35, R: 40 * km }, examples: [
      { id: 'far', label: 'Twice as far: −12 dB', controls: ['R'], set: { R: 80 * km } },
      { id: 'integrate', label: 'Integrate 16 pulses', controls: ['n', 'R'], set: { R: 80 * km, n: 16 } },
      { id: 'pfa', label: 'Lower threshold: false alarms', controls: ['pfa'], set: { pfa: 1e-2 } },
      { id: 'stealth', label: 'Small target: 0.01 m²', controls: ['rcs', 'R'], set: { rcs: 0.01 } },
    ] },
    { id: 'ppi', label: 'PPI scope', set: {}, examples: [
      { id: 'jet', label: 'A fast jet', set: { fast: true } },
      { id: 'rain', label: 'Rain clutter', set: { rain: true } },
      { id: 'slow', label: 'Slow scan: fewer updates', controls: ['rpm'], set: { rpm: 4 } },
    ] },
    { id: 'jam', label: 'Jamming', set: { G: 35, rcs: 10, Pj: 1 }, examples: [
      { id: 'power', label: 'Stronger jammer: burn-through closer', controls: ['Pj'], set: { Pj: 10 } },
      { id: 'spot', label: 'Spot jamming: narrow band', controls: ['Bj'], set: { Bj: 1 } },
      { id: 'standoff', label: 'Stand-off jammer in the sidelobes', controls: ['Rj', 'sl'], set: { standoff: true } },
    ] },
  ],
  controls: [
    { title: 'Pulse', show: (s) => s.case === 'pulses', items: [
      { id: 'prf', label: 'PRF', unit: 'Hz', min: 200, max: 5000, step: 10 },
      { id: 'tau', label: 'Pulse length', unit: 'µs', k: 1e6, min: 0.1e-6, max: 20e-6, log: true },
      { id: 'B', label: 'Chirp bandwidth (0 = none)', unit: 'MHz', k: 1e-6, min: 0, max: 10e6, step: 0.1e6 },
      { id: 'R1', label: 'Target range', unit: 'km', k: 1e-3, min: 5 * km, max: 300 * km, step: 100 },
      { id: 'R2on', label: 'Second target behind it', type: 'check' },
      { id: 'dR', label: 'Separation', unit: 'm', min: 10, max: 1000, step: 5, show: (s) => s.R2on },
    ] },
    { title: 'Doppler', show: (s) => s.case === 'doppler', items: [
      { id: 'dprf', label: 'PRF', unit: 'kHz', k: 1e-3, min: 2e3, max: 30e3, step: 100 },
      { id: 'Np', label: 'Pulses per look', unit: '', min: 8, max: 256, step: 8 },
      { id: 'r1', label: 'Target A range', unit: 'km', min: 1, max: 40, step: 0.1 },
      { id: 'v1', label: 'Target A velocity', unit: 'm/s', min: -200, max: 200, step: 1 },
      { id: 'clutter', label: 'Ground clutter', type: 'check' },
    ] },
    { title: 'Radar', show: (s) => s.case === 'detect' || s.case === 'jam', items: [
      { id: 'Pt', label: 'Peak power', unit: 'kW', min: 1, max: 1000, log: true },
      { id: 'G', label: 'Antenna gain', unit: 'dBi', min: 10, max: 45, step: 0.5 },
      { id: 'rcs', label: 'Target RCS', unit: 'm²', min: 0.001, max: 100, log: true },
      { id: 'R', label: 'Range', unit: 'km', k: 1e-3, min: 5 * km, max: 300 * km, log: true, show: (s) => s.case === 'detect' },
      { id: 'F', label: 'Noise figure', unit: 'dB', min: 0, max: 15, step: 0.5, show: (s) => s.case === 'detect' },
      { id: 'pfa', label: 'False-alarm probability', unit: '', min: 1e-10, max: 1e-1, log: true, show: (s) => s.case === 'detect' },
      { id: 'n', label: 'Pulses integrated', unit: '', min: 1, max: 64, step: 1, show: (s) => s.case === 'detect' },
    ] },
    { title: 'Scope', show: (s) => s.case === 'ppi', items: [
      { id: 'rpm', label: 'Antenna rotation', unit: 'rpm', min: 2, max: 30, step: 1 },
      { id: 'persist', label: 'Persistence', unit: 's', min: 0.5, max: 8, step: 0.1 },
      { id: 'rain', label: 'Rain clutter', type: 'check' }, { id: 'fast', label: 'Fast jet', type: 'check' },
    ] },
    { title: 'Jammer', show: (s) => s.case === 'jam', items: [
      { id: 'Pj', label: 'Jammer power', unit: 'W', min: 0.1, max: 1000, log: true },
      { id: 'Gj', label: 'Jammer antenna gain', unit: 'dBi', min: 0, max: 20, step: 0.5 },
      { id: 'Bj', label: 'Jamming bandwidth', unit: 'MHz', min: 1, max: 500, log: true },
      { id: 'need', label: 'Required S/J', unit: 'dB', min: 0, max: 20, step: 0.5 },
      { id: 'standoff', label: 'Stand-off (not on the target)', type: 'check' },
      { id: 'Rj', label: 'Jammer range', unit: 'km', k: 1e-3, min: 20 * km, max: 300 * km, step: 1000, show: (s) => s.standoff },
      { id: 'sl', label: 'Radar sidelobe level', unit: 'dB', min: -50, max: -10, step: 1, show: (s) => s.standoff },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { scene, state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const top = createChart(ctx, { box: [-4.2, 0.55, 8.6, 2.1] }), bot = createChart(ctx, { box: [-4.2, -2.35, 8.6, 2.1] }), big = createChart(ctx, { box: [-4.2, -2.4, 8.6, 4.8] });
    const HM = [-4.2, -2.4, 8.6, 4.8], heat = createSurface(scene, { nx: 172, ny: 96, x: [HM[0], HM[0] + HM[2]], y: [HM[1], HM[1] + HM[3]], opacity: 1 });
    heat.mesh.position.z = -0.01;
    // PPI scope: rings, sweep, blips
    const PR = 2.35, rings = createCurve(stage, { max: 400, width: 1, color: '--c-v' }), sweep = createCurve(stage, { max: 1, width: 2.4, color: '--c-v' });
    const rr = []; for (let k = 1; k <= 4; k++) for (let i = 0; i < 90; i++) { const a = 2 * Math.PI * i / 90, b = 2 * Math.PI * (i + 1) / 90, r = PR * k / 4; rr.push(r * Math.cos(a), r * Math.sin(a), 0, r * Math.cos(b), r * Math.sin(b), 0); }
    for (let i = 0; i < 12; i++) { const a = Math.PI * i / 6; rr.push(0, 0, 0, PR * Math.cos(a), PR * Math.sin(a), 0); } rings.segments(rr);
    const blips = new THREE.InstancedMesh(new THREE.CircleGeometry(0.05, 12), new THREE.MeshBasicMaterial({ transparent: true }), 900); blips.frustumCulled = false; scene.add(blips);
    const ringL = [25, 50, 75, 100].map((v, k) => { const l = ctx.label(`${v} km`, 'tick'); l.position.set(0.05, PR * (k + 1) / 4 + 0.08, 0); scene.add(l); return l; });
    const m4 = new THREE.Matrix4(), col = new THREE.Color(), r0 = rng(21), rain = Array.from({ length: 300 }, () => [30 + 25 * r0(), 0.6 + 0.9 * r0()]); // km, bearing (rad)
    const ppiObj = [rings.object, sweep.object, blips, ...ringL];

    return {
      changed() {
        const c = state.case;
        for (const k of [top, bot, big]) { k.show(false); }
        heat.mesh.visible = c === 'doppler'; for (const o of ppiObj) o.visible = c === 'ppi';
        if (c === 'pulses' || c === 'detect') { top.show(true); bot.show(true); }
        if (c === 'doppler' || c === 'jam') big.show(true);
        ctx.setDuration(0); // the scope and the noise run live; the other views are static
      },
      update() {
        const c = state.case, t = time.t;
        if (c === 'pulses') {
          const Ru = unambiguousRange(state.prf), PRI = 1 / state.prf, tg = [[state.R1, 1]]; if (state.R2on) tg.push([state.R1 + state.dR, 0.7]);
          const ts = [], tx = [], rx = [], n = 3000;
          for (let i = 0; i <= n; i++) {
            const tt = 2.2 * PRI * i / n; ts.push(tt * 1e6);
            tx.push((tt % PRI) < state.tau ? 1 : 0);
            let e = 0; for (const [R, a] of tg) { const d = tt - 2 * R / C0; if (d >= 0 && d % PRI < state.tau) e += a * 0.6; } // echoes of every pulse sent so far
            rx.push(Math.min(1, e));
          }
          top.range([0, 2.2 * PRI * 1e6], [0, 1.15]); top.titles('time (µs)', 'transmitted (grey) and echoes (blue)');
          top.line('tx', ts, tx, { color: '--c-ref', width: 1.4 }); top.line('rx', ts, rx, { color: '--c-B', width: 1.8 });
          // matched-filter output against apparent range, zoomed around the (first) target
          const Ra = apparentRange(state.R1, state.prf), half = Math.max(400, 3 * rangeResolution(state.tau, state.B), state.dR * 2);
          const xs = Array.from({ length: 1200 }, (_, i) => Ra - half + 2 * half * i / 1199), ys = xs.map((r) => tg.reduce((s, [R, a]) => s + a * matched(2 * (r - apparentRange(R, state.prf)) / C0, state.tau, state.B), 0));
          bot.range([(Ra - half) / km, (Ra + half) / km], [0, 1.8]); bot.titles('apparent range (km)', 'matched-filter output');
          bot.line('mf', xs.map((r) => r / km), ys, { color: '--c-E' });
          const res = rangeResolution(state.tau, state.B);
          hud.set('a', `R_u = c/2·PRF = ${fmt(Ru / km)} km, resolution ${fmt(res)} m${state.B ? ` (chirp ${fmt(state.B / 1e6)} MHz)` : ' (cτ/2)'}`);
          hud.set('b', state.R1 > Ru ? `target at ${fmt(state.R1 / km)} km appears at ${fmt(Ra / km)} km ✗` : `echo after ${fmt(2 * state.R1 / C0 * 1e6)} µs → ${fmt(state.R1 / km)} km`, state.R1 > Ru ? 'bad' : '');
          hud.set('c', state.R2on ? (state.dR > res ? `${state.dR} m apart > resolution: two peaks ✓` : `${state.dR} m apart < resolution: one blob ✗`) : '', state.R2on && state.dR > res ? 'good' : '');
          plots.aux.draw({ xlim: [0, 5000], cursor: state.prf, series: [{ x: Array.from({ length: 100 }, (_, i) => 50 + 50 * i), y: Array.from({ length: 100 }, (_, i) => unambiguousRange(50 + 50 * i) / km), color: '--c-B', label: 'unambiguous range (km) vs PRF (Hz)' }] });
        } else if (c === 'doppler') {
          const Ru = unambiguousRange(state.dprf) / km, vu = unambiguousVelocity(state.dprf, LAM), dR = rangeResolution(1e-6, 0) / km, dv = LAM * state.dprf / (2 * state.Np);
          const tg = [[state.r1, state.v1, 10], [TGT[1][0], TGT[1][1], 3]].map(([R, v, s]) => [R % Ru, foldVelocity(v, state.dprf, LAM), s]);
          const sinc2 = (x) => (Math.abs(x) < 1e-9 ? 1 : (Math.sin(Math.PI * x) / (Math.PI * x)) ** 2), hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
          heat.set((x, y) => {
            const R = (x - HM[0]) / HM[2] * Ru, v = -vu + 2 * vu * (y - HM[1]) / HM[3];
            let p = 1e-3 * (0.5 + hash(x, y)); /* noise floor */ for (const [r, w, s] of tg) p += s * sinc2((R - r) / dR) * sinc2((v - w) / dv);
            if (state.clutter) p += 30 * sinc2(v / dv) * Math.exp(-R / (0.5 * Ru)) * (0.5 + 0.5 * Math.abs(Math.sin(R * 3)));
            return db(p);
          }, { map: 'magma', norm: (d) => Math.max(0, Math.min(1, (d + 30) / 45)) });
          big.range([0, Ru], [-vu, vu]); big.titles('apparent range (km)', 'radial velocity (m/s)');
          hud.set('a', `PRF ${fmt(state.dprf / 1e3)} kHz: R_u ${fmt(Ru)} km, v_u ±${fmt(vu)} m/s`);
          hud.set('b', `target A at ${fmt(state.r1)} km, ${state.v1} m/s → shown at ${fmt(tg[0][0])} km, ${fmt(tg[0][1])} m/s`, Math.abs(state.v1) > vu || state.r1 > Ru ? 'bad' : '');
          hud.set('c', `velocity resolution λ·PRF/2N = ${fmt(dv)} m/s (${state.Np} pulses)`);
          const ps = Array.from({ length: 100 }, (_, i) => 1e3 + 300 * i);
          plots.aux.draw({ xlim: [1, 31], cursor: state.dprf / 1e3, series: [{ x: ps.map((p) => p / 1e3), y: ps.map((p) => unambiguousRange(p) / km), color: '--c-B', label: 'R_u (km)' }, { x: ps.map((p) => p / 1e3), y: ps.map((p) => unambiguousVelocity(p, LAM)), color: '--c-E', label: 'v_u (m/s) vs PRF (kHz)' }] });
        } else if (c === 'detect') {
          const p = { Pt: state.Pt * 1e3, G: lin(state.G), lam: LAM, rcs: state.rcs, R: state.R, B: state.Bw * 1e6, F: lin(state.F), n: state.n };
          const S = snr(p), T = thresholdFor(state.pfa), Rmax = 1.6 * state.R, rn = rng(7 + Math.floor(t * 6)), n = 600, xs = [], ys = [];
          for (let i = 0; i < n; i++) { const R = Rmax * i / n, a = Math.abs(R - state.R) < Rmax / n * 1.5 ? Math.sqrt(2 * S) : 0, g1 = Math.sqrt(-2 * Math.log(1 - rn())) * Math.cos(2 * Math.PI * rn()), g2 = Math.sqrt(-2 * Math.log(1 - rn())) * Math.cos(2 * Math.PI * rn()); xs.push(R / km); ys.push(Math.hypot(a + g1, g2)); }
          top.range([0, Rmax / km], [0, Math.max(T * 1.5, Math.sqrt(2 * S) * 1.3, 6)]); top.titles('range (km)', 'A-scope: receiver output / noise rms');
          top.line('y', xs, ys, { color: '--c-v', width: 1.2 }); top.line('T', [0, Rmax / km], [T, T], { color: '--c-north', dashed: true, width: 1.6 });
          const Rs = Array.from({ length: 200 }, (_, i) => 5 * km + (300 - 5) * km * i / 199), P = Rs.map((R) => pd(snr({ ...p, R }), state.pfa));
          bot.range([0, 300], [0, 1.05]); bot.titles('range (km)', 'probability of detection'); bot.line('pd', Rs.map((r) => r / km), P, { color: '--c-B' }); bot.dots('now', [state.R / km], [pd(S, state.pfa)], { color: '--accent', size: 11 });
          hud.set('a', `SNR = ${fmt(db(S))} dB at ${fmt(state.R / km)} km${state.n > 1 ? ` (${state.n} pulses integrated)` : ''}`);
          hud.set('b', `threshold ${fmt(T)} × noise for Pfa = ${state.pfa.toExponential(0)}`); hud.set('c', `Pd = ${fmt(100 * pd(S, state.pfa))} %`, pd(S, state.pfa) > 0.9 ? 'good' : pd(S, state.pfa) < 0.5 ? 'bad' : '');
          plots.aux.draw({ xlim: [0, 25], series: [1e-2, 1e-4, 1e-6, 1e-8].map((f, j) => ({ x: Array.from({ length: 101 }, (_, i) => i / 4), y: Array.from({ length: 101 }, (_, i) => pd(lin(i / 4), f)), color: ['--c-B', '--c-E', '--c-I', '--c-F'][j], label: `Pfa ${f.toExponential(0)}` })) });
        } else if (c === 'ppi') {
          const w = 2 * Math.PI * state.rpm / 60, phi = (w * t) % (2 * Math.PI), Rmax = 100, objs = [];
          sweep.segments([0, 0, 0.002, PR * Math.cos(Math.PI / 2 - phi), PR * Math.sin(Math.PI / 2 - phi), 0.002]);
          const tracks = [[60, 0.3, -0.12, 0.05], [80, 2.5, 0.08, -0.06], [40, 4.2, 0.05, 0.1]]; if (state.fast) tracks.push([90, 5.5, -0.9, 0.2]);
          for (const [R, b, vx, vy] of tracks) { const x = R * Math.sin(b) + vx * t * 10, y = R * Math.cos(b) + vy * t * 10; objs.push([x, y, 1]); }
          for (let i = 0; i < 200; i++) { const a = 2 * Math.PI * i / 200, R = 3 + 6 * r0(); if (i % 2) objs.push([R * Math.sin(a), R * Math.cos(a), 0.6]); }
          if (state.rain) for (const [R, b] of rain) objs.push([R * Math.sin(b), R * Math.cos(b), 0.5]);
          let n = 0;
          for (const [x, y, s] of objs) {
            const R = Math.hypot(x, y); if (R > Rmax || n >= 900) continue;
            const brg = (Math.atan2(x, y) + 2 * Math.PI) % (2 * Math.PI), age = (((phi - brg) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / w, br = Math.exp(-age / state.persist) * s;
            if (br < 0.02) continue;
            m4.makeTranslation(x / Rmax * PR, y / Rmax * PR, 0.004); blips.setMatrixAt(n, m4); blips.setColorAt(n, col.set(ctx.cssVar('--c-v')).multiplyScalar(br)); n++;
          }
          blips.count = n; blips.instanceMatrix.needsUpdate = true; if (blips.instanceColor) blips.instanceColor.needsUpdate = true;
          hud.set('a', `antenna ${state.rpm} rpm: each target refreshed every ${fmt(60 / state.rpm)} s`); hud.set('b', `${tracks.length} aircraft; ground clutter near the centre${state.rain ? '; rain to the north-east' : ''}`);
          hud.set('c', state.fast ? 'the jet jumps between sweeps: track-while-scan must predict it' : 'range rings every 25 km');
          plots.aux.draw({ xlim: [0, 30], cursor: state.rpm, series: [{ x: Array.from({ length: 29 }, (_, i) => i + 2), y: Array.from({ length: 29 }, (_, i) => 60 / (i + 2)), color: '--c-v', label: 'revisit time (s) vs rotation (rpm)' }] });
        } else {
          const p = { Pt: state.Pt * 1e3, G: lin(state.G), lam: LAM, rcs: state.rcs, Pj: state.Pj, Gj: lin(state.Gj), Br: 1e6, Bj: state.Bj * 1e6 };
          const ls = Array.from({ length: 300 }, (_, i) => 3 + 2.6 * i / 299), Rs = ls.map((l) => 10 ** l); // 1 km … 400 km
          const S = Rs.map((R) => db(signalPower({ ...p, R })) + 30), J = Rs.map((R) => db(jammerPower({ ...p, Rj: state.standoff ? state.Rj : R, sidelobe: state.standoff ? lin(state.sl) : 1 })) + 30);
          big.range([3, 5.6], [-150, -20]); big.titles('range (log₁₀ m)', 'power at the radar (dBm)');
          big.line('S', ls, S, { color: '--c-B' }); big.line('J', ls, J, { color: '--c-north' });
          let Rb = null; for (let i = Rs.length - 1; i >= 0; i--) if (S[i] - J[i] >= state.need) { Rb = Rs[i]; break; }
          if (Rb) big.line('bt', [Math.log10(Rb), Math.log10(Rb)], [-150, -20], { color: '--c-E', dashed: true, width: 1.6 }); else big.hide('bt');
          hud.set('a', state.standoff ? `stand-off jammer at ${fmt(state.Rj / km)} km, entering ${state.sl} dB sidelobes` : 'self-screening jammer on the target');
          hud.set('b', Rb ? `burn-through at ${fmt(Rb / km)} km (S/J ≥ ${state.need} dB)` : 'no burn-through in range ✗', Rb ? '' : 'bad');
          hud.set('c', state.standoff ? 'J is constant, S grows as 1/R⁴' : `formula: ${fmt(burnThrough(p, state.need) / km)} km; S ∝ 1/R⁴, J ∝ 1/R²`);
          plots.aux.draw({ xlim: [3, 5.6], series: [{ x: ls, y: S.map((s, i) => s - J[i]), color: '--c-E', label: 'S/J (dB) vs log₁₀ range' }, { x: [3, 5.6], y: [state.need, state.need], color: '--c-ref', dash: [4, 3], label: 'required' }] });
        }
      },
      theme() { for (const k of [top, bot, big]) k.theme(); rings.theme(); sweep.theme(); },
    };
  },
};
