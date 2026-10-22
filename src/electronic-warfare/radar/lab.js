// Radar detection and electronic attack: the range equation as a dB ledger, detection in noise on an
// A-scope, MTI clutter cancellation, the PPI scope, and jamming with its burn-through range.
import * as THREE from 'three';
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { rng } from '../../lib/random.js';
import { C0, db, lin, snr, pd, thresholdFor, signalPower, jammerPower, burnThrough, mtiGain, blindSpeed, ledger } from './model.js';

const km = 1e3, deg = Math.PI / 180, fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');

export default {
  id: 'radar', title: 'Radar', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 12,
  defaults: {
    Pt: 100, G: 35, f0: 10, rcs: 1, R: 40 * km, Bw: 1, F: 3, mode: 'radar', pfa: 1e-6, n: 1,
    order: 2, mprf: 1000, vt: 22, clut: 30,
    rpm: 12, persist: 3, rain: false, fast: false, D: 2,
    Pj: 1, Gj: 10, Bj: 10, need: 10, standoff: false, Rj: 100 * km, sl: -30,
  },
  cases: [
    { id: 'budget', label: 'Link budget', set: {}, examples: [
      { id: 'double', label: 'Twice as far: −12 dB', controls: ['R'], set: { R: 80 * km } },
      { id: 'link', label: 'One-way link: only −6 dB per doubling', controls: ['mode', 'R'], set: { mode: 'link' } },
      { id: 'power', label: '16× the power: only 2× the range', controls: ['Pt'], set: { Pt: 1600 } },
      { id: 'antenna', label: 'Bigger antenna: counts twice', controls: ['G'], set: { G: 38 } },
    ] },
    { id: 'detect', label: 'Detection', set: {}, examples: [
      { id: 'far', label: 'Twice as far: −12 dB', controls: ['R'], set: { R: 80 * km } },
      { id: 'integrate', label: 'Integrate 16 pulses', controls: ['n', 'R'], set: { R: 80 * km, n: 16 } },
      { id: 'pfa', label: 'Lower threshold: false alarms', controls: ['pfa'], set: { pfa: 1e-2 } },
      { id: 'stealth', label: 'Small target: 0.01 m²', controls: ['rcs', 'R'], set: { rcs: 0.01 } },
    ] },
    { id: 'mti', label: 'MTI', set: {}, examples: [
      { id: 'two', label: 'Two-pulse canceller', controls: ['order'], set: { order: 1 } },
      { id: 'blind', label: 'A blind speed: the target vanishes', controls: ['vt', 'mprf'], set: { vt: 15 } },
      { id: 'prf', label: 'Change the PRF: it comes back', controls: ['vt', 'mprf'], set: { vt: 15, mprf: 1400 } },
    ] },
    { id: 'ppi', label: 'PPI scope', set: {}, examples: [
      { id: 'jet', label: 'A fast jet', controls: ['fast'], set: { fast: true } },
      { id: 'rain', label: 'Rain clutter', controls: ['rain'], set: { rain: true } },
      { id: 'small', label: 'Small antenna: smeared blips', controls: ['D'], set: { D: 0.5 } },
      { id: 'slow', label: 'Slow scan: fewer updates', controls: ['rpm'], set: { rpm: 4 } },
    ] },
    { id: 'jam', label: 'Jamming', set: { rcs: 10 }, examples: [
      { id: 'power', label: 'Stronger jammer: burn-through closer', controls: ['Pj'], set: { Pj: 10 } },
      { id: 'spot', label: 'Spot jamming: narrow band', controls: ['Bj'], set: { Bj: 1 } },
      { id: 'standoff', label: 'Stand-off jammer in the sidelobes', controls: ['Rj', 'sl'], set: { standoff: true } },
    ] },
  ],
  controls: [
    { title: 'Radar', show: (s) => ['budget', 'detect', 'jam'].includes(s.case), items: [
      { id: 'mode', label: 'Path', type: 'segmented', options: [['radar', 'Radar (two-way)'], ['link', 'Link (one-way)']], show: (s) => s.case === 'budget' },
      { id: 'Pt', label: 'Peak power', unit: 'kW', min: 0.1, max: 2000, log: true },
      { id: 'G', label: 'Antenna gain', unit: 'dBi', min: 10, max: 45, step: 0.5 },
      { id: 'f0', label: 'Frequency', unit: 'GHz', min: 1, max: 35, step: 0.5, show: (s) => s.case === 'budget' },
      { id: 'rcs', label: 'Target RCS', unit: 'm²', min: 0.001, max: 100, log: true },
      { id: 'R', label: 'Range', unit: 'km', k: 1e-3, min: 5 * km, max: 300 * km, log: true, show: (s) => s.case !== 'jam' },
      { id: 'Bw', label: 'Receiver bandwidth', unit: 'MHz', min: 0.1, max: 50, log: true, show: (s) => s.case !== 'jam' },
      { id: 'F', label: 'Noise figure', unit: 'dB', min: 0, max: 15, step: 0.5, show: (s) => s.case !== 'jam' },
      { id: 'pfa', label: 'False-alarm probability', unit: '', min: 1e-10, max: 1e-1, log: true, show: (s) => s.case === 'detect' },
      { id: 'n', label: 'Pulses integrated', unit: '', min: 1, max: 64, step: 1, show: (s) => s.case === 'detect' },
    ] },
    { title: 'Canceller', show: (s) => s.case === 'mti', items: [
      { id: 'order', label: 'Canceller', type: 'segmented', options: [[1, 'Two-pulse'], [2, 'Three-pulse'], [3, 'Four-pulse']] },
      { id: 'mprf', label: 'PRF', unit: 'Hz', min: 300, max: 3000, step: 10 },
      { id: 'vt', label: 'Target speed', unit: 'm/s', min: 0, max: 100, step: 0.5 },
      { id: 'clut', label: 'Clutter above target', unit: 'dB', min: 0, max: 50, step: 1 },
    ] },
    { title: 'Scope', show: (s) => s.case === 'ppi', items: [
      { id: 'rpm', label: 'Antenna rotation', unit: 'rpm', min: 2, max: 30, step: 1 },
      { id: 'D', label: 'Antenna width', unit: 'm', min: 0.3, max: 8, step: 0.1 },
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
    const led = createChart(ctx, { box: [-4.2, -2.0, 5.6, 4.4], x: [-0.5, 10.5], xTicks: false }), side = createChart(ctx, { box: [2.1, -2.0, 2.4, 4.4] });
    const SHORT = { 'transmit power': 'Pt', 'transmit gain': 'Gt', 'receive gain': 'Gr', 'target σ': 'σ', 'received S': 'S', 'noise kT₀BF': 'N' };
    const ledL = []; for (let i = 0; i < 12; i++) { const l = ctx.label('', 'tick'); scene.add(l); ledL.push(l); }
    const PR = 2.35, rings = createCurve(stage, { max: 400, width: 1, color: '--c-v' }), sweep = createCurve(stage, { max: 1, width: 2.4, color: '--c-v' });
    const rr = []; for (let k = 1; k <= 4; k++) for (let i = 0; i < 90; i++) { const a = 2 * Math.PI * i / 90, b = 2 * Math.PI * (i + 1) / 90, r = PR * k / 4; rr.push(r * Math.cos(a), r * Math.sin(a), 0, r * Math.cos(b), r * Math.sin(b), 0); }
    for (let i = 0; i < 12; i++) { const a = Math.PI * i / 6; rr.push(0, 0, 0, PR * Math.cos(a), PR * Math.sin(a), 0); } rings.segments(rr);
    const blips = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial(), 900); blips.frustumCulled = false; scene.add(blips);
    const ringL = [25, 50, 75, 100].map((v, k) => { const l = ctx.label(`${v} km`, 'tick'); l.position.set(0.05, PR * (k + 1) / 4 + 0.08, 0); scene.add(l); return l; });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1), col = new THREE.Color(), r0 = rng(21);
    const rain = Array.from({ length: 300 }, () => [30 + 25 * r0(), 0.6 + 0.9 * r0()]), clutterPts = Array.from({ length: 200 }, (_, i) => [3 + 6 * r0(), 2 * Math.PI * i / 200]);
    const ppiObj = [rings.object, sweep.object, blips, ...ringL];

    return {
      changed() {
        const c = state.case;
        for (const k of [top, bot, big, led, side]) k.show(false); for (const o of ppiObj) o.visible = c === 'ppi'; ledL.forEach((l) => { l.visible = c === 'budget'; });
        if (c === 'detect' || c === 'mti') { top.show(true); bot.show(true); }
        if (c === 'jam') big.show(true);
        if (c === 'budget') { led.show(true); side.show(true); }
      },
      update() {
        const c = state.case, t = time.t;
        if (c === 'budget') {
          const lam = C0 / (state.f0 * 1e9), L = ledger({ PtW: state.Pt * 1e3, Gdb: state.G, lam, rcs: state.rcs, R: state.R, B: state.Bw * 1e6, Fdb: state.F, mode: state.mode });
          const terms = [...L.terms, ['received S', null], ['noise kT₀BF', null], ['SNR', null]], seg = [];
          let run = 0, lo = Infinity, hi = -Infinity; const pts = [];
          L.terms.forEach(([, v]) => { const a = run; run += v; pts.push([a, run]); lo = Math.min(lo, a, run); hi = Math.max(hi, a, run); });
          lo = Math.min(lo, L.N, L.S) - 10; hi = Math.max(hi, 0) + 10;
          led.range([-0.5, terms.length - 0.5], [lo, hi]); led.titles('', 'dB (W): each term adds or subtracts');
          pts.forEach(([a, b], i) => led.line(`b${i}`, [i, i], [a, b], { color: b >= a ? '--c-v' : '--c-north', width: 14 }));
          led.line('S', [L.terms.length, L.terms.length], [lo + 5, L.S], { color: '--c-B', width: 14 }); led.line('N', [L.terms.length + 1, L.terms.length + 1], [lo + 5, L.N], { color: '--c-ref', width: 14 });
          led.line('snr', [L.terms.length + 2, L.terms.length + 2], [L.N, L.S], { color: L.snr > 13 ? '--c-v' : '--c-north', width: 14 });
          ledL.forEach((l, i) => { l.visible = i < terms.length; if (i < terms.length) { const v = i < L.terms.length ? L.terms[i][1] : i === L.terms.length ? L.S : i === L.terms.length + 1 ? L.N : L.snr; l.element.textContent = `${SHORT[terms[i][0]] || terms[i][0]}\n${v >= 0 && i < L.terms.length ? '+' : ''}${fmt(v, 3)}`; l.element.style.whiteSpace = 'pre'; l.element.style.textAlign = 'center'; l.position.set(led.mx(i), led.my(lo) - 0.35, 0); } });
          const Rs = Array.from({ length: 200 }, (_, i) => 10 ** (3.7 + 1.8 * i / 199)), sn = Rs.map((R) => ledger({ PtW: state.Pt * 1e3, Gdb: state.G, lam, rcs: state.rcs, R, B: state.Bw * 1e6, Fdb: state.F, mode: state.mode }).snr);
          side.range([3.7, 5.5], [Math.min(-30, Math.floor(sn[sn.length - 1] / 10) * 10), Math.max(60, Math.ceil(sn[0] / 10) * 10)]); side.titles('log₁₀ range (m)', 'SNR (dB), 13 dB needed'); side.line('s', Rs.map(Math.log10), sn, { color: '--c-B' }); side.line('th', [3.7, 5.5], [13, 13], { color: '--c-north', dashed: true, width: 1.4 }); side.dots('now', [Math.log10(state.R)], [L.snr], { color: '--accent', size: 11 });
          let Rd = null; for (let i = 0; i < Rs.length; i++) if (sn[i] >= 13) Rd = Rs[i];
          hud.set('a', `S = ${fmt(L.S)} dBW, N = kT₀BF = ${fmt(L.N)} dBW → SNR ${fmt(L.snr)} dB`, L.snr > 13 ? 'good' : 'bad');
          hud.set('b', state.mode === 'radar' ? 'two-way: R⁴, so 16× the power buys only 2× the range' : 'one-way: R², what a warning receiver or jammer pays');
          hud.set('c', Rd ? `detection range (SNR 13 dB) ≈ ${fmt(Rd / km)} km` : 'no detection in range');
          plots.aux.draw({ xlim: [0, 2000], cursor: state.Pt, series: [{ x: Array.from({ length: 200 }, (_, i) => 10 * (i + 1)), y: Array.from({ length: 200 }, (_, i) => (10 * (i + 1) / state.Pt) ** 0.25), color: '--c-B', label: 'detection range factor vs peak power (kW): P^(1/4)' }] });
        } else if (c === 'detect') {
          const p = { Pt: state.Pt * 1e3, G: lin(state.G), lam: 0.03, rcs: state.rcs, R: state.R, B: state.Bw * 1e6, F: lin(state.F), n: state.n };
          const S = snr(p), T = thresholdFor(state.pfa), Rmax = 1.6 * state.R, rn = rng(7 + Math.floor(t * 6)), n = 600, xs = [], ys = [];
          let fa = 0;
          for (let i = 0; i < n; i++) { const R = Rmax * i / n, a = Math.abs(R - state.R) < Rmax / n * 1.5 ? Math.sqrt(2 * S) : 0, g1 = Math.sqrt(-2 * Math.log(1 - rn())) * Math.cos(2 * Math.PI * rn()), g2 = Math.sqrt(-2 * Math.log(1 - rn())) * Math.cos(2 * Math.PI * rn()), v = Math.hypot(a + g1, g2); xs.push(R / km); ys.push(v); if (!a && v > T) fa++; }
          top.range([0, Rmax / km], [0, Math.max(T * 1.5, Math.sqrt(2 * S) * 1.3, 6)]); top.titles('range (km)', 'output / noise rms: A-scope');
          top.line('y', xs, ys, { color: '--c-v', width: 1.2 }); top.line('T', [0, Rmax / km], [T, T], { color: '--c-north', dashed: true, width: 1.6 });
          const Rs = Array.from({ length: 200 }, (_, i) => 5 * km + (300 - 5) * km * i / 199), P = Rs.map((R) => pd(snr({ ...p, R }), state.pfa));
          bot.range([0, 300], [0, 1.05]); bot.titles('range (km)', 'probability of detection P_d'); bot.line('pd', Rs.map((r) => r / km), P, { color: '--c-B' }); bot.dots('now', [state.R / km], [pd(S, state.pfa)], { color: '--accent', size: 11 });
          hud.set('a', `SNR = ${fmt(db(S))} dB at ${fmt(state.R / km)} km${state.n > 1 ? ` (${state.n} pulses integrated)` : ''}`);
          hud.set('b', `threshold ${fmt(T)} × noise for Pfa = ${state.pfa.toExponential(0)}; ${fa} false alarm${fa === 1 ? '' : 's'} on this trace`); hud.set('c', `Pd = ${fmt(100 * pd(S, state.pfa))} %`, pd(S, state.pfa) > 0.9 ? 'good' : pd(S, state.pfa) < 0.5 ? 'bad' : '');
          plots.aux.draw({ xlim: [0, 25], series: [1e-2, 1e-4, 1e-6, 1e-8].map((f, j) => ({ x: Array.from({ length: 101 }, (_, i) => i / 4), y: Array.from({ length: 101 }, (_, i) => pd(lin(i / 4), f)), color: ['--c-B', '--c-E', '--c-I', '--c-F'][j], label: `Pd vs SNR (dB), Pfa ${f.toExponential(0)}` })) });
        } else if (c === 'mti') {
          const lam = 0.03, prf = state.mprf, ord = state.order, fd = 2 * state.vt / lam, fs = Array.from({ length: 600 }, (_, i) => 3 * prf * i / 599);
          top.range([0, 3 * prf / 2 * lam], [-60, 10]); top.titles('target speed (m/s)', 'canceller response (dB)');
          top.line('H', fs.map((f) => f * lam / 2), fs.map((f) => Math.max(-60, 20 * Math.log10(mtiGain(f, prf, ord) / 2 ** ord))), { color: '--c-E' }); top.dots('v', [state.vt], [Math.max(-60, 20 * Math.log10(mtiGain(fd, prf, ord) / 2 ** ord))], { color: '--accent', size: 11 });
          // range profile: clutter everywhere at zero Doppler, one moving target at 20 km
          const rn = rng(17), xs = Array.from({ length: 400 }, (_, i) => 40 * i / 399), cl = xs.map(() => lin(state.clut) * (0.3 + 0.7 * rn())), tgt = xs.map((x) => (Math.abs(x - 20) < 0.25 ? 1 : 0));
          const before = xs.map((_, i) => db(cl[i] + tgt[i] + 0.01)), after = xs.map((_, i) => db(cl[i] * 1e-5 + tgt[i] * mtiGain(fd, prf, ord) ** 2 / 4 ** ord + 0.01));
          bot.range([0, 40], [-25, state.clut + 10]); bot.titles('range (km)', 'before (grey) and after (blue) the canceller (dB)'); bot.line('b', xs, before, { color: '--c-ref', width: 1.2 }); bot.line('a', xs, after, { color: '--c-B' });
          const gT = 20 * Math.log10(mtiGain(fd, prf, ord) / 2 ** ord);
          hud.set('a', `${ord + 1}-pulse canceller (1 − z⁻¹)${ord > 1 ? `^${ord}` : ''}: clutter at 0 m/s removed`); hud.set('b', `target at ${state.vt} m/s: f_d = ${fmt(fd)} Hz, ${gT < -60 ? 'cancelled (blind speed)' : `kept at ${fmt(gT)} dB`}`, gT > -10 ? 'good' : 'bad');
          hud.set('c', `blind speeds every ${fmt(blindSpeed(1, prf, lam))} m/s at PRF ${prf} Hz`);
          plots.aux.draw({ xlim: [300, 3000], cursor: prf, series: [{ x: Array.from({ length: 271 }, (_, i) => 300 + 10 * i), y: Array.from({ length: 271 }, (_, i) => blindSpeed(1, 300 + 10 * i, lam)), color: '--c-E', label: 'first blind speed (m/s) vs PRF (Hz)' }] });
        } else if (c === 'ppi') {
          const w = 2 * Math.PI * state.rpm / 60, phi = (w * t) % (2 * Math.PI), Rmax = 100, bw = 0.886 * 0.03 / state.D, objs = [];
          sweep.segments([0, 0, 0.002, PR * Math.cos(Math.PI / 2 - phi), PR * Math.sin(Math.PI / 2 - phi), 0.002]);
          const tracks = [[60, 0.3, -0.12, 0.05], [80, 2.5, 0.08, -0.06], [40, 4.2, 0.05, 0.1], [60, 0.317, -0.12, 0.05]]; if (state.fast) tracks.push([90, 5.5, -0.9, 0.2]);
          for (const [R, b, vx, vy] of tracks) objs.push([R * Math.sin(b) + vx * t * 10, R * Math.cos(b) + vy * t * 10, 1]);
          for (const [R, a] of clutterPts) objs.push([R * Math.sin(a), R * Math.cos(a), 0.6]);
          if (state.rain) for (const [R, b] of rain) objs.push([R * Math.sin(b), R * Math.cos(b), 0.5]);
          let n = 0;
          for (const [x, y, s] of objs) {
            const R = Math.hypot(x, y); if (R > Rmax || n >= 900) continue;
            const brg = (Math.atan2(x, y) + 2 * Math.PI) % (2 * Math.PI), age = (((phi - brg) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / w, br = Math.exp(-age / state.persist) * s;
            if (br < 0.02) continue;
            const across = Math.max(0.04, R / Rmax * PR * bw); // a blip is as wide as the beam at that range
            q.setFromAxisAngle(Z, -brg); m4.compose(pos.set(x / Rmax * PR, y / Rmax * PR, 0.004), q, sc.set(across, 0.06, 1)); blips.setMatrixAt(n, m4); blips.setColorAt(n, col.set(ctx.cssVar('--c-v')).multiplyScalar(br)); n++;
          }
          blips.count = n; blips.instanceMatrix.needsUpdate = true; if (blips.instanceColor) blips.instanceColor.needsUpdate = true;
          hud.set('a', `antenna ${state.D} m wide → beam 0.886 λ/D = ${fmt(bw / deg)}°: ${fmt(bw * 60e3)} m across at 60 km`);
          hud.set('b', `${state.rpm} rpm: each target refreshed every ${fmt(60 / state.rpm)} s`); hud.set('c', bw * 60e3 > 1000 ? 'the two aircraft near 60 km merge into one wide blip ✗' : 'the two aircraft near 60 km are separate ✓', bw * 60e3 > 1000 ? 'bad' : 'good');
          plots.aux.draw({ xlim: [0.3, 8], cursor: state.D, series: [{ x: Array.from({ length: 78 }, (_, i) => 0.3 + 0.1 * i), y: Array.from({ length: 78 }, (_, i) => 0.886 * 0.03 / (0.3 + 0.1 * i) / deg), color: '--c-v', label: 'beam width (°) vs antenna width (m) at 3 cm' }] });
        } else {
          const p = { Pt: state.Pt * 1e3, G: lin(state.G), lam: 0.03, rcs: state.rcs, Pj: state.Pj, Gj: lin(state.Gj), Br: 1e6, Bj: state.Bj * 1e6 };
          const ls = Array.from({ length: 300 }, (_, i) => 3 + 2.6 * i / 299), Rs = ls.map((l) => 10 ** l);
          const S = Rs.map((R) => db(signalPower({ ...p, R })) + 30), J = Rs.map((R) => db(jammerPower({ ...p, Rj: state.standoff ? state.Rj : R, sidelobe: state.standoff ? lin(state.sl) : 1 })) + 30);
          big.range([3, 5.6], [-150, -20]); big.titles('log₁₀ range (m)', 'echo S (blue) and jamming J (red) at the radar (dBm)');
          big.line('S', ls, S, { color: '--c-B' }); big.line('J', ls, J, { color: '--c-north' });
          let Rb = null; for (let i = Rs.length - 1; i >= 0; i--) if (S[i] - J[i] >= state.need) { Rb = Rs[i]; break; }
          if (Rb) big.line('bt', [Math.log10(Rb), Math.log10(Rb)], [-150, -20], { color: '--c-E', dashed: true, width: 1.6 }); else big.hide('bt');
          hud.set('a', state.standoff ? `stand-off jammer at ${fmt(state.Rj / km)} km, entering ${state.sl} dB sidelobes` : 'self-screening jammer on the target');
          hud.set('b', Rb ? `burn-through at ${fmt(Rb / km)} km (S/J ≥ ${state.need} dB)` : 'no burn-through in range ✗', Rb ? '' : 'bad');
          hud.set('c', state.standoff ? 'J is constant, S grows as 1/R⁴' : `formula: ${fmt(burnThrough(p, state.need) / km)} km; S ∝ 1/R⁴, J ∝ 1/R²`);
          plots.aux.draw({ xlim: [3, 5.6], series: [{ x: ls, y: S.map((s, i) => s - J[i]), color: '--c-E', label: 'S/J (dB) vs log₁₀ range' }, { x: [3, 5.6], y: [state.need, state.need], color: '--c-ref', dash: [4, 3], label: 'required' }] });
        }
      },
      theme() { for (const k of [top, bot, big, led, side]) k.theme(); rings.theme(); sweep.theme(); },
    };
  },
};
