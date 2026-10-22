// Pulses in the real world: a pulse flies out to the target and back (scene + receiver timeline),
// two targets and the resolution limit, a pulse train on a moving target (range–time intensity),
// and many pulses in flight at once (range ambiguity).
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createAircraft, createRadar } from '../../lib/viz/glyphs.js';
import { C0, packet, echoDelay, resolution, overlap, eclipsed, unambiguous, apparent, pulsesInFlight, rangeAt } from './model.js';

const km = 1e3, us = 1e-6, fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const PV = [-3.6, -2.35, 4.7, 4.7]; // plan view of the 'measure' case (square)

export default {
  id: 'pulses', title: 'Pulses', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 6,
  defaults: { R: 20 * km, tau: 2 * us, pri: 300 * us, dR: 500, R0: 10 * km, v: 300, tau2: 0.1 * us, pri2: 5e-3, N: 100, prf: 2000, T1: 58 * km, T2: 25 * km },
  cases: [
    { id: 'echo', label: 'Echo and range', set: {}, examples: [
      { id: 'far', label: 'Twice as far: twice the delay', controls: ['R'], set: { R: 40 * km } },
      { id: 'long', label: 'Longer pulse: longer echo', controls: ['tau'], set: { tau: 10 * us } },
      { id: 'blind', label: 'Too close: echo hidden by the pulse', controls: ['R', 'tau'], set: { R: 1 * km, tau: 10 * us } },
      { id: 'duty', label: 'High duty cycle', controls: ['tau', 'pri'], set: { tau: 30 * us, pri: 150 * us } },
    ] },
    { id: 'resolution', label: 'Two targets', set: { R: 20 * km, dR: 500, tau: 2 * us }, examples: [
      { id: 'merge', label: '200 m apart: one blob', controls: ['dR', 'tau'], set: { dR: 200 } },
      { id: 'edge', label: 'Exactly cτ/2 apart', controls: ['dR', 'tau'], set: { dR: 300 } },
      { id: 'short', label: 'Shorter pulse splits them', controls: ['dR', 'tau'], set: { dR: 200, tau: 0.5 * us } },
    ] },
    { id: 'train', label: 'Pulse train', set: {}, examples: [
      { id: 'still', label: 'A target at rest: a vertical line', controls: ['v'], set: { v: 0 } },
      { id: 'closing', label: 'Closing fast: tilts the other way', controls: ['v'], set: { v: -600 } },
      { id: 'coarse', label: 'Longer pulse: a fat track', controls: ['tau2'], set: { tau2: 1 * us } },
    ] },
    { id: 'measure', label: 'Pulses in flight', set: {}, examples: [
      { id: 'honest', label: 'Low PRF: one pulse in flight', controls: ['prf'], set: { prf: 1500 } },
      { id: 'folded', label: 'High PRF: T1 reported at 1.8 km', controls: ['prf'], set: { prf: 8000 } },
      { id: 'both', label: 'Two targets, both folded', controls: ['prf', 'T2'], set: { prf: 8000, T2: 30 * km } },
    ] },
  ],
  controls: [
    { title: 'Pulse', show: (s) => s.case === 'echo' || s.case === 'resolution', items: [
      { id: 'R', label: 'Target range', unit: 'km', k: 1e-3, min: 0.5 * km, max: 40 * km, step: 50 },
      { id: 'tau', label: 'Pulse width τ', unit: 'µs', k: 1e6, min: 0.2 * us, max: 40 * us, log: true },
      { id: 'pri', label: 'Pulse interval PRI', unit: 'µs', k: 1e6, min: 100 * us, max: 1000 * us, step: 5 * us, show: (s) => s.case === 'echo' },
      { id: 'dR', label: 'Second target behind by', unit: 'm', min: 20, max: 2000, step: 10, show: (s) => s.case === 'resolution' },
    ] },
    { title: 'Train', show: (s) => s.case === 'train', items: [
      { id: 'R0', label: 'Start range', unit: 'km', k: 1e-3, min: 2 * km, max: 30 * km, step: 100 },
      { id: 'v', label: 'Radial velocity (+ away)', unit: 'm/s', min: -800, max: 800, step: 10 },
      { id: 'tau2', label: 'Pulse width', unit: 'µs', k: 1e6, min: 0.05 * us, max: 2 * us, log: true },
      { id: 'N', label: 'Pulses', unit: '', min: 20, max: 200, step: 10 },
    ] },
    { title: 'Scene', show: (s) => s.case === 'measure', items: [
      { id: 'prf', label: 'PRF', unit: 'Hz', min: 500, max: 10000, step: 50 },
      { id: 'T1', label: 'Target T1 range', unit: 'km', k: 1e-3, min: 5 * km, max: 80 * km, step: 100 },
      { id: 'T2', label: 'Target T2 range', unit: 'km', k: 1e-3, min: 5 * km, max: 80 * km, step: 100 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const scene = createChart(ctx, { box: [-4.2, 0.6, 8.6, 2.0], y: [-1, 1], xTitle: 'range (km)', yTicks: false, grid: false });
    const line = createChart(ctx, { box: [-4.2, -2.35, 8.6, 2.0], y: [0, 1.25], xTitle: 'time (µs)', yTitle: 'receiver: transmit (grey), echoes (blue)' });
    const rti = createChart(ctx, { box: [-4.2, -2.35, 8.6, 2.2], xTitle: 'range offset (m)', yTitle: 'pulse number' });
    const right1 = createChart(ctx, { box: [1.6, 0.55, 2.9, 1.9], xTitle: 'time (µs)', yTitle: 'transmit and echoes' }), right2 = createChart(ctx, { box: [1.6, -2.3, 2.9, 1.9], y: [0, 1.2], xTitle: 'reported range (km)', yTitle: 'what the receiver reports' });
    const radar = createRadar(stage), ac = [createAircraft(stage), createAircraft(stage, '--c-E')], rings = createCurve(stage, { max: 3000, width: 2, color: '--c-v' });
    const ringsHi = createCurve(stage, { max: 600, width: 1, color: '--line' });
    const pvC = [PV[0] + PV[2] / 2, PV[1] + PV[3] / 2], pvR = PV[2] / 2, PVMAX = 80 * km;

    return {
      changed() {
        const c = state.case; for (const k of [scene, line, rti, right1, right2]) { k.show(false); }
        rings.object.visible = ringsHi.object.visible = false; ac[1].object.visible = false;
        if (c === 'echo' || c === 'resolution') { scene.show(true); line.show(true); }
        if (c === 'train') { scene.show(true); rti.show(true); }
        if (c === 'measure') {
          right1.show(true); right2.show(true); rings.object.visible = ringsHi.object.visible = true;
          const g = []; for (let k = 1; k <= 4; k++) for (let i = 0; i < 90; i++) { const a = 2 * Math.PI * i / 90, b = 2 * Math.PI * (i + 1) / 90, r = pvR * k / 4; g.push(pvC[0] + r * Math.cos(a), pvC[1] + r * Math.sin(a), -0.001, pvC[0] + r * Math.cos(b), pvC[1] + r * Math.sin(b), -0.001); }
          ringsHi.segments(g);
        }
        ctx.setClock(c === 'measure' ? 0 : c === 'train' ? 20 : 6, { ambient: true });
      },
      update() {
        const c = state.case, u = Math.min(1, time.t / 5.5);
        if (c === 'echo' || c === 'resolution') {
          const two = c === 'resolution', Rs = two ? [state.R, state.R + state.dR] : [state.R], tau = state.tau;
          const Rview = Math.max(...Rs) * 1.15, Tend = echoDelay(Math.max(...Rs)) + tau + 0.08 * echoDelay(Math.max(...Rs)), t = u * Tend;
          scene.range([0, Rview / km], [-1, 1]); radar.set(scene.mx(0) + 0.1, scene.my(0), 0, 0.32);
          Rs.forEach((R, i) => { ac[i].set(scene.mx(R / km), scene.my(0), Math.PI, 0.22); });
          // packets: outgoing on the upper lane, echoes on the lower lane (one per target)
          const p0 = packet(t, Math.max(...Rs), tau);
          if (p0.out) scene.line('out', [p0.out[0] / km, p0.out[1] / km], [0.45, 0.45], { color: '--c-I', width: 9 }); else scene.hide('out');
          Rs.forEach((R, i) => { const p = packet(t, R, tau); if (p.back) scene.line(`back${i}`, [p.back[0] / km, p.back[1] / km], [-0.45 - 0.25 * i, -0.45 - 0.25 * i], { color: i ? '--c-E' : '--c-B', width: 9 }); else scene.hide(`back${i}`); });
          scene.line('axis', [0, Rview / km], [0, 0], { color: '--line', width: 1 });
          // receiver timeline up to t
          const Tus = Tend / us, n = 1500, xs = [], tx = [], rx = [];
          for (let i = 0; i <= n; i++) {
            const tt = Tend * i / n; xs.push(tt / us); tx.push(tt <= tau ? 1 : 0);
            let e = 0; Rs.forEach((R, j) => { const d = tt - echoDelay(R); if (d >= 0 && d <= tau) e += (j ? 0.7 : 0.8) * Math.min(1, (state.R / R) ** 2); }); rx.push(tt <= t ? e : NaN);
          }
          line.range([0, Tus], [0, 1.6]); line.line('tx', xs, tx, { color: '--c-ref', width: 2 }); line.line('rx', xs, rx, { color: '--c-B', width: 2.4 }); line.stems('now', [t / us], [1.55], { color: '--accent', width: 1.4 });
          const dt = echoDelay(state.R), res = resolution(tau);
          if (!two) {
            hud.set('a', `echo delay Δt = 2R/c = ${fmt(dt / us)} µs → R = cΔt/2 = ${fmt(state.R / km)} km`);
            hud.set('b', `pulse ${fmt(tau / us)} µs is ${fmt(C0 * tau)} m long in space; duty cycle τ/PRI = ${fmt(100 * tau / state.pri)} %`);
            hud.set('c', eclipsed(state.R, tau) ? `blind: the echo returns while still transmitting (R < cτ/2 = ${fmt(res)} m)` : `listening window ${fmt((state.pri - tau) / us)} µs → max range ${fmt(unambiguous(state.pri) / km)} km`, eclipsed(state.R, tau) ? 'bad' : '');
          } else {
            const merged = overlap(state.dR, tau);
            hud.set('a', `targets ${state.dR} m apart → echoes ${fmt(2 * state.dR / C0 / us)} µs apart`); hud.set('b', `resolution cτ/2 = ${fmt(res)} m`);
            hud.set('c', merged ? 'echoes overlap: the radar sees one target ✗' : 'echoes separate: two targets ✓', merged ? 'bad' : 'good');
          }
          const ts = Array.from({ length: 100 }, (_, i) => 0.1 + 0.4 * i); plots.aux.draw({ xlim: [0, 40], cursor: tau / us, series: [{ x: ts, y: ts.map((v) => C0 * v * us / 2), color: '--c-B', label: 'range resolution cτ/2 (m) vs pulse width (µs)' }] });
        } else if (c === 'train') {
          // the first 4 pulses fly slowly (2 s each) so the round trip is visible, then the rest fill the RTI in 12 s
          const N = state.N, tt0 = time.t, kf = tt0 < 8 ? tt0 / 2 : Math.min(N - 1e-6, 4 + (tt0 - 8) / 12 * (N - 4)), k = Math.min(N - 1, Math.floor(kf)), res = resolution(state.tau2), W = Math.max(200, Math.abs(state.v) * N * state.pri2 * 1.4 + 6 * res);
          const Rk = rangeAt(state.R0, state.v, k, state.pri2);
          scene.range([0, state.R0 * 1.3 / km], [-1, 1]); radar.set(scene.mx(0) + 0.1, scene.my(0), 0, 0.32); ac[0].set(scene.mx(Rk / km), scene.my(0), state.v > 0 ? 0 : Math.PI, 0.22);
          scene.line('axis', [0, state.R0 * 1.3 / km], [0, 0], { color: '--line', width: 1 });
          // this pulse flies out and back: local phase within pulse k (the picture slows each flight down)
          const ph = kf - k, Td = echoDelay(Rk), tv = Math.max(state.tau2, 0.05 * Td), tt = ph * (Td + tv) * 1.05, pk = packet(tt, Rk, tv), back = ph > Td / ((Td + tv) * 1.05);
          if (pk.out) scene.line('out', [pk.out[0] / km, pk.out[1] / km], [0.45, 0.45], { color: '--c-I', width: 9 }); else scene.hide('out');
          if (pk.back) scene.line('back0', [pk.back[0] / km, pk.back[1] / km], [-0.45, -0.45], { color: '--c-B', width: 9 }); else scene.hide('back0');
          const nx = 160, img = new Float32Array(nx * N), x0 = -W / 2, rows = back && ph > 0.97 ? k + 1 : k;
          for (let j = 0; j < rows; j++) { const r = rangeAt(state.R0, state.v, j, state.pri2) - state.R0; for (let i = 0; i < nx; i++) { const x = x0 + W * (i + 0.5) / nx, d = Math.abs(x - r) / res; img[j * nx + i] = d < 1 ? 1 - d : 0; } }
          rti.line('row', [x0, -x0], [k + 0.5, k + 0.5], { color: '--accent', width: 1, dashed: true });
          rti.range([x0, -x0], [0, N]); rti.image('rti', img, nx, N, { map: 'magma' });
          const vel = state.v, slope = vel * state.pri2; // metres per pulse
          hud.set('a', `pulse ${k + 1} of ${N}: ${back ? 'echo coming back' : 'flying out'} — target at ${fmt(Rk / km, 6)} km; each echo writes one row of the RTI`); hud.set('b', `track slope ${fmt(slope)} m per pulse → v = slope / PRI = ${fmt(vel)} m/s`);
          hud.set('c', `range bin cτ/2 = ${fmt(res)} m; the target crosses ${fmt(Math.abs(vel) * N * state.pri2 / res)} bins`);
          plots.aux.draw({ xlim: [0, N], cursor: k, series: [{ x: Array.from({ length: N }, (_, j) => j), y: Array.from({ length: N }, (_, j) => rangeAt(state.R0, state.v, j, state.pri2) - state.R0), color: '--c-I', label: 'range change (m) vs pulse number' }] });
        } else {
          const pri = 1 / state.prf, Ru = unambiguous(pri), ts = time.t * 1e-4; // 100 µs of radar time per second
          // wavefronts in flight: pulses fired at n·PRI, now at radius c(t − n PRI)
          const seg = []; let air = 0;
          for (let n = Math.floor(ts / pri); n >= 0; n--) { const r = C0 * (ts - n * pri); if (r > PVMAX) break; air++; const rr = pvR * r / PVMAX; for (let i = 0; i < 72; i++) { const a = 2 * Math.PI * i / 72, b = 2 * Math.PI * (i + 1) / 72; seg.push(pvC[0] + rr * Math.cos(a), pvC[1] + rr * Math.sin(a), 0, pvC[0] + rr * Math.cos(b), pvC[1] + rr * Math.sin(b), 0); } }
          rings.segments(seg); radar.set(pvC[0], pvC[1], Math.PI / 2, 0.2);
          [[state.T1, 0.6], [state.T2, 2.4]].forEach(([R, b], i) => { ac[i].set(pvC[0] + pvR * R / PVMAX * Math.cos(b), pvC[1] + pvR * R / PVMAX * Math.sin(b), b + Math.PI, 0.17); });
          // timeline over three PRIs: transmits and echoes, coloured by their own pulse
          const T = 3 * pri, xs = [], tx = [], e1 = [], e2 = [], n = 1500, w = Math.min(0.03 * pri, 5e-6);
          for (let i = 0; i <= n; i++) { const tt = T * i / n; xs.push(tt / us); tx.push((tt % pri) < w ? 1 : 0); const m = (d) => ((d % pri) + pri) % pri < w; e1.push(m(tt - echoDelay(state.T1)) ? 0.7 : 0); e2.push(m(tt - echoDelay(state.T2)) ? 0.5 : 0); } // steady state: echoes of earlier pulses too
          right1.range([0, T / us], [0, 1.1]); right1.line('tx', xs, tx, { color: '--c-ref', width: 1.6 }); right1.line('e1', xs, e1, { color: '--c-I', width: 2 }); right1.line('e2', xs, e2, { color: '--c-E', width: 2 });
          right2.range([0, Ru / km], [0, 1.2]); right2.stems('a1', [apparent(state.T1, pri) / km], [0.9], { color: '--c-I' }); right2.stems('a2', [apparent(state.T2, pri) / km], [0.6], { color: '--c-E' });
          hud.set('a', `PRF ${state.prf} Hz → R_u = c/2PRF = ${fmt(Ru / km)} km; ${air} wavefront${air === 1 ? '' : 's'} in flight`);
          hud.set('b', `T1 at ${fmt(state.T1 / km)} km reported at ${fmt(apparent(state.T1, pri) / km)} km${pulsesInFlight(state.T1, pri) ? ` (${pulsesInFlight(state.T1, pri)} pulses late)` : ''}`, state.T1 > Ru ? 'bad' : 'good');
          hud.set('c', `T2 at ${fmt(state.T2 / km)} km reported at ${fmt(apparent(state.T2, pri) / km)} km`, state.T2 > Ru ? 'bad' : 'good');
          const ps = Array.from({ length: 96 }, (_, i) => 500 + 100 * i);
          plots.aux.draw({ xlim: [500, 10000], cursor: state.prf, series: [{ x: ps, y: ps.map((p) => unambiguous(1 / p) / km), color: '--c-v', label: 'unambiguous range (km) vs PRF (Hz)' }, { x: [500, 10000], y: [state.T1 / km, state.T1 / km], color: '--c-I', dash: [4, 3], label: 'T1' }] });
        }
      },
      theme() { for (const k of [scene, line, rti, right1, right2]) k.theme(); radar.theme(); ac.forEach((a) => a.theme()); rings.theme(); ringsHi.theme(); },
    };
  },
};
