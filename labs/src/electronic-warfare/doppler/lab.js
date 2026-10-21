// Doppler: wavefronts compressing off an approaching target, the pulse-Doppler dashboard (range profile and
// Doppler spectrum), a range–Doppler map with three targets, and range and velocity folding.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createAircraft, createRadar } from '../../lib/viz/glyphs.js';
import { dopplerSpectrum } from '../waveforms/model.js';
import { C0, dopplerShift, vUnamb, rUnamb, apparentVelocity, apparentRange, dv, fronts } from './model.js';

const km = 1e3, us = 1e-6, fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const sinc2 = (x) => (Math.abs(x) < 1e-9 ? 1 : (Math.sin(Math.PI * x) / (Math.PI * x)) ** 2);

export default {
  id: 'doppler', title: 'Doppler', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 12,
  defaults: { v: 300, f0: 10, R: 12 * km, prf: 10e3, N: 64, tau: 1 * us, R1: 8 * km, v1: 40, R2: 12 * km, v2: -20, R3: 5 * km, v3: 0, trueR: 20 * km, trueV: 100 },
  cases: [
    { id: 'wavefronts', label: 'Wavefronts', set: {}, examples: [
      { id: 'away', label: 'Moving away: stretched', controls: ['v'], set: { v: -300 } },
      { id: 'still', label: 'At rest: same spacing', controls: ['v'], set: { v: 0 } },
      { id: 'fast', label: 'Mach 3 closing', controls: ['v'], set: { v: 1000 } },
    ] },
    { id: 'dashboard', label: 'Range and velocity', set: { v: 40 }, examples: [
      { id: 'more', label: 'More pulses: sharper Doppler', controls: ['N'], set: { N: 256 } },
      { id: 'fold', label: 'Too fast: velocity wraps', controls: ['v', 'prf'], set: { v: 120 } },
      { id: 'band', label: 'S-band: half the Doppler', controls: ['f0'], set: { f0: 3 } },
    ] },
    { id: 'rdmap', label: 'Range–Doppler map', set: {}, examples: [
      { id: 'close', label: 'Two targets in one range cell', controls: ['R2', 'v2'], set: { R2: 8 * km, v2: 25 } },
      { id: 'far', label: 'A far target folds in range', controls: ['R3', 'prf'], set: { R3: 21 * km } },
      { id: 'lowprf', label: 'Low PRF: velocities wrap', controls: ['prf'], set: { prf: 3e3 } },
    ] },
    { id: 'ambiguity', label: 'Folding', set: {}, examples: [
      { id: 'inside', label: 'Inside both limits', set: { trueR: 10 * km, trueV: 40 } },
      { id: 'raise', label: 'Raise the PRF: range folds', controls: ['prf'], set: { prf: 20e3 } },
      { id: 'lower', label: 'Lower the PRF: velocity wraps', controls: ['prf'], set: { prf: 4e3, trueR: 10 * km } },
    ] },
  ],
  controls: [
    { title: 'Target', show: (s) => s.case === 'wavefronts' || s.case === 'dashboard', items: [
      { id: 'v', label: 'Closing speed', unit: 'm/s', min: -1000, max: 1000, step: 10 },
      { id: 'R', label: 'Range', unit: 'km', k: 1e-3, min: 1 * km, max: 40 * km, step: 100, show: (s) => s.case === 'dashboard' },
    ] },
    { title: 'Radar', items: [
      { id: 'f0', label: 'Carrier frequency', unit: 'GHz', min: 1, max: 35, step: 0.5 },
      { id: 'prf', label: 'PRF', unit: 'kHz', k: 1e-3, min: 1e3, max: 40e3, step: 100, show: (s) => s.case !== 'wavefronts' },
      { id: 'N', label: 'Pulses per look', unit: '', min: 8, max: 512, step: 8, show: (s) => s.case === 'dashboard' || s.case === 'rdmap' },
      { id: 'tau', label: 'Pulse width', unit: 'µs', k: 1e6, min: 0.1 * us, max: 5 * us, log: true, show: (s) => s.case === 'dashboard' || s.case === 'rdmap' },
    ] },
    { title: 'Targets', show: (s) => s.case === 'rdmap', items: [
      { id: 'R1', label: 'A range', unit: 'km', k: 1e-3, min: 0.5 * km, max: 40 * km, step: 100 }, { id: 'v1', label: 'A speed', unit: 'm/s', min: -200, max: 200, step: 1 },
      { id: 'R2', label: 'B range', unit: 'km', k: 1e-3, min: 0.5 * km, max: 40 * km, step: 100 }, { id: 'v2', label: 'B speed', unit: 'm/s', min: -200, max: 200, step: 1 },
      { id: 'R3', label: 'C range', unit: 'km', k: 1e-3, min: 0.5 * km, max: 40 * km, step: 100 }, { id: 'v3', label: 'C speed', unit: 'm/s', min: -200, max: 200, step: 1 },
    ] },
    { title: 'True target', show: (s) => s.case === 'ambiguity', items: [
      { id: 'trueR', label: 'True range', unit: 'km', k: 1e-3, min: 0.5 * km, max: 60 * km, step: 100 },
      { id: 'trueV', label: 'True speed', unit: 'm/s', min: -300, max: 300, step: 1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const wave = createChart(ctx, { box: [-4.2, -0.1, 8.6, 2.7], x: [0, 40], y: [-7, 7], yTicks: false, grid: false });
    const sig = createChart(ctx, { box: [-4.2, -2.4, 8.6, 1.7], y: [-1.3, 1.3], xTitle: 'time (visual)', yTitle: 'transmitted (grey) and received (blue)' });
    const P3 = [[-4.3, -2.3, 2.6, 4.6], [-1.3, -2.3, 2.6, 4.6], [1.7, -2.3, 2.6, 4.6]].map((b) => createChart(ctx, { box: b }));
    const rd = createChart(ctx, { box: [-4.3, -2.35, 5.4, 4.7], xTitle: 'apparent range (km)', yTitle: 'radial velocity (m/s)' });
    const top = createChart(ctx, { box: [1.75, -2.35, 2.7, 4.7], x: [-1, 1], xTitle: '', yTitle: 'range (km)', grid: false });
    const amb = [createChart(ctx, { box: [-4.3, -2.3, 4.0, 4.5], xTitle: 'true range (km)', yTitle: 'reported range (km)' }), createChart(ctx, { box: [0.55, -2.3, 4.0, 4.5], xTitle: 'true speed (m/s)', yTitle: 'reported speed (m/s)' })];
    const radar = createRadar(stage), acs = [createAircraft(stage), createAircraft(stage, '--c-E'), createAircraft(stage, '--c-v')];
    const out = createCurve(stage, { max: 4000, width: 1.6, color: '--c-I' }), back = createCurve(stage, { max: 4000, width: 1.6, color: '--c-B' }), vec = createCurve(stage, { max: 6, width: 2.4, color: '--c-F' });
    const all = [wave, sig, ...P3, rd, top, ...amb];

    const arcs = (cx, r, a0, a1) => { const s = []; for (let i = 0; i < 16; i++) { const a = a0 + (a1 - a0) * i / 16, b = a0 + (a1 - a0) * (i + 1) / 16; s.push(wave.mx(cx + r * Math.cos(a)), wave.my(r * Math.sin(a)), 0.003, wave.mx(cx + r * Math.cos(b)), wave.my(r * Math.sin(b)), 0.003); } return s; };
    return {
      changed() {
        for (const k of all) k.show(false); for (const a of acs) a.object.visible = false; radar.object.visible = true;
        out.object.visible = back.object.visible = vec.object.visible = false;
        const c = state.case;
        if (c === 'wavefronts') { wave.show(true); sig.show(true); out.object.visible = back.object.visible = true; }
        if (c === 'dashboard') for (const k of P3) k.show(true);
        if (c === 'rdmap') { rd.show(true); top.show(true); }
        if (c === 'ambiguity') { for (const k of amb) k.show(true); radar.object.visible = false; }
        ctx.setDuration(c === 'wavefronts' ? 12 : 0);
      },
      update() {
        const c = state.case, f0 = state.f0 * 1e9, lam = C0 / f0;
        if (c === 'wavefronts') {
          // visual units: wave speed 4 per second, a front every 0.5 s; the target speed is exaggerated so it shows
          const cv = 4, T = 0.5, u = 1.3 * state.v / 1000, X0 = 22, t = time.t;
          const F = fronts(t, { c: cv, T, X0, u }), so = [], sb = [];
          for (const r of F.out) if (r < 40) so.push(...arcs(0, r, -0.45, 0.45));
          for (const f of F.back) if (f.r < 40) sb.push(...arcs(f.x, f.r, Math.PI - 0.45, Math.PI + 0.45));
          out.segments(so); back.segments(sb);
          radar.set(wave.mx(0.7), wave.my(0), 0, 0.3); acs[0].set(wave.mx(Math.max(2, F.X)), wave.my(0), state.v >= 0 ? Math.PI : 0, 0.28);
          const ts = Array.from({ length: 600 }, (_, i) => 6 * i / 599), ratio = (cv + u) / (cv - u);
          sig.range([0, 6], [-1.3, 1.3]); sig.line('tx', ts, ts.map((x) => Math.sin(2 * Math.PI * x / T)), { color: '--c-ref', width: 1.6 }); sig.line('rx', ts, ts.map((x) => 0.8 * Math.sin(2 * Math.PI * ratio * x / T)), { color: '--c-B' });
          const fd = dopplerShift(state.v, f0);
          hud.set('a', `v = ${state.v} m/s ${state.v > 0 ? 'closing' : state.v < 0 ? 'opening' : ''} at ${state.f0} GHz`); hud.set('b', `Doppler shift f_d = 2v f₀/c = ${fmt(fd)} Hz (${fmt(fd / f0 * 1e6)} ppm of the carrier)`);
          hud.set('c', 'picture: speed exaggerated about a million times so the squeeze is visible');
          const vs = Array.from({ length: 101 }, (_, i) => -1000 + 20 * i); plots.aux.draw({ xlim: [-1000, 1000], cursor: state.v, series: [{ x: vs, y: vs.map((v) => dopplerShift(v, f0) / 1e3), color: '--c-B', label: `Doppler (kHz) vs closing speed (m/s) at ${state.f0} GHz` }] });
        } else if (c === 'dashboard') {
          const [sc, rp, ds] = P3, vu = vUnamb(state.prf, f0), dR = C0 * state.tau / 2, dV = dv(state.prf, state.N, f0), va = apparentVelocity(state.v, state.prf, f0);
          sc.range([-1, 1], [0, 45]); sc.titles('', 'scene: range (km)'); radar.set(sc.mx(0), sc.my(1.5), Math.PI / 2, 0.25); acs[0].set(sc.mx(0), sc.my(state.R / km), state.v > 0 ? -Math.PI / 2 : Math.PI / 2, 0.2);
          vec.object.visible = true; vec.segments([sc.mx(0.25), sc.my(state.R / km), 0.01, sc.mx(0.25), sc.my(state.R / km - state.v / 60), 0.01]);
          const xs = Array.from({ length: 400 }, (_, i) => state.R / km - 1.5 + 3 * i / 399), pr = xs.map((x) => Math.max(0, 1 - Math.abs(x * km - state.R) / dR));
          rp.range([state.R / km - 1.5, state.R / km + 1.5], [0, 1.1]); rp.titles('range (km)', `range profile: ΔR = cτ/2 = ${fmt(dR)} m`); rp.line('p', xs, pr, { color: '--c-E' });
          const D = dopplerSpectrum([dopplerShift(state.v, f0)], state.N, state.prf, 512), vs = D.f.map((f) => f * lam / 2);
          ds.range([-vu, vu], [0, 1.1]); ds.titles('radial velocity (m/s)', `Doppler: Δv = ${fmt(dV)} m/s, ±${fmt(vu)} m/s`); ds.line('D', vs, D.A, { color: '--c-B' });
          hud.set('a', `range ${fmt(state.R / km)} km from the delay; velocity from ${state.N} pulses (FFT over slow time)`);
          hud.set('b', `velocity resolution λ·PRF/2N = ${fmt(dV)} m/s; unambiguous ±λ·PRF/4 = ±${fmt(vu)} m/s`);
          hud.set('c', Math.abs(state.v) > vu ? `true ${state.v} m/s appears at ${fmt(va)} m/s ✗` : `measured ${fmt(va)} m/s ✓`, Math.abs(state.v) > vu ? 'bad' : 'good');
          const Ns = Array.from({ length: 64 }, (_, i) => 8 * (i + 1)); plots.aux.draw({ xlim: [8, 512], cursor: state.N, series: [{ x: Ns, y: Ns.map((n) => dv(state.prf, n, f0)), color: '--c-B', label: 'velocity resolution (m/s) vs pulses N' }] });
        } else if (c === 'rdmap') {
          const Ru = rUnamb(state.prf), vu = vUnamb(state.prf, f0), dR = C0 * state.tau / 2, dV = dv(state.prf, state.N, f0), nx = 200, ny = 128;
          const tg = [[state.R1, state.v1], [state.R2, state.v2], [state.R3, state.v3]].map(([R, v]) => [apparentRange(R, state.prf), apparentVelocity(v, state.prf, f0)]);
          const img = new Float32Array(nx * ny);
          for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
            const R = Ru * (i + 0.5) / nx, v = -vu + 2 * vu * (j + 0.5) / ny;
            let p = 1e-3 * (0.6 + 0.4 * Math.sin(i * 12.9898 + j * 78.233) ** 2); for (const [r, w] of tg) p += sinc2((R - r) / dR) * sinc2((v - w) / dV);
            img[j * nx + i] = 10 * Math.log10(p);
          }
          rd.range([0, Ru / km], [-vu, vu]); rd.image('rd', img, nx, ny, { map: 'magma', norm: (d) => (d + 30) / 30 });
          top.range([-1, 1], [0, 42]); radar.set(top.mx(0), top.my(1.2), Math.PI / 2, 0.22);
          [[state.R1, state.v1], [state.R2, state.v2], [state.R3, state.v3]].forEach(([R, v], i) => acs[i].set(top.mx(-0.4 + 0.4 * i), top.my(R / km), v > 0 ? -Math.PI / 2 : Math.PI / 2, 0.17));
          hud.set('a', `PRF ${fmt(state.prf / 1e3)} kHz at ${state.f0} GHz: R_u = ${fmt(Ru / km)} km, v_u = ±${fmt(vu)} m/s`);
          hud.set('b', `cells: ${fmt(dR)} m × ${fmt(dV)} m/s`); hud.set('c', tg.map(([r, w], i) => `${'ABC'[i]} at ${fmt(r / km)} km, ${fmt(w)} m/s`).join(' · '));
          plots.aux.draw({ xlim: [1, 40], cursor: state.prf / 1e3, series: [{ x: Array.from({ length: 40 }, (_, i) => i + 1), y: Array.from({ length: 40 }, (_, i) => rUnamb((i + 1) * 1e3) / km), color: '--c-B', label: 'R_u (km)' }, { x: Array.from({ length: 40 }, (_, i) => i + 1), y: Array.from({ length: 40 }, (_, i) => vUnamb((i + 1) * 1e3, f0)), color: '--c-E', label: 'v_u (m/s) vs PRF (kHz)' }] });
        } else {
          const Ru = rUnamb(state.prf), vu = vUnamb(state.prf, f0), [ar, av] = amb;
          const rs = Array.from({ length: 600 }, (_, i) => 60 * i / 599), vs = Array.from({ length: 601 }, (_, i) => -300 + i);
          ar.range([0, 60], [0, Math.max(Ru / km, 1) * 1.1]); ar.line('ap', rs, rs.map((r) => apparentRange(r * km, state.prf) / km), { color: '--c-B' }); ar.line('id', [0, Ru / km], [0, Ru / km], { color: '--c-v', width: 4 });
          ar.dots('now', [state.trueR / km], [apparentRange(state.trueR, state.prf) / km], { color: '--accent', size: 12 });
          av.range([-300, 300], [-vu * 1.1, vu * 1.1]); av.line('ap', vs, vs.map((v) => apparentVelocity(v, state.prf, f0)), { color: '--c-E' }); av.line('id', [-vu, vu], [-vu, vu], { color: '--c-v', width: 4 });
          av.dots('now', [state.trueV], [apparentVelocity(state.trueV, state.prf, f0)], { color: '--accent', size: 12 });
          hud.set('a', `PRF ${fmt(state.prf / 1e3)} kHz: honest up to ${fmt(Ru / km)} km and ±${fmt(vu)} m/s (green)`);
          hud.set('b', `target at ${fmt(state.trueR / km)} km reported at ${fmt(apparentRange(state.trueR, state.prf) / km)} km`, state.trueR > Ru ? 'bad' : 'good');
          hud.set('c', `at ${state.trueV} m/s reported at ${fmt(apparentVelocity(state.trueV, state.prf, f0))} m/s`, Math.abs(state.trueV) > vu ? 'bad' : 'good');
          const ps = Array.from({ length: 40 }, (_, i) => i + 1); plots.aux.draw({ xlim: [1, 40], cursor: state.prf / 1e3, series: [{ x: ps, y: ps.map((p) => rUnamb(p * 1e3) / km), color: '--c-B', label: 'R_u (km)' }, { x: ps, y: ps.map((p) => vUnamb(p * 1e3, f0)), color: '--c-E', label: 'v_u (m/s): one goes up as the other goes down' }] });
        }
      },
      theme() { for (const k of all) k.theme(); radar.theme(); acs.forEach((a) => a.theme()); out.theme(); back.theme(); vec.theme(); },
    };
  },
};
