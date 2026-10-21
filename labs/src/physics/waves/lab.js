// Waves: travelling waves on a string, superposition, standing modes, and the Doppler effect.
import * as THREE from 'three';
import { createCurve } from '../../lib/viz/curve.js';
import { si } from '../../lib/ui/format.js';
import { travelling, mode, emissionTime, dopplerAhead, dopplerBehind } from './model.js';

const XL = 4, L = 2 * XL, C = 1.5, OBS = 4.2, D = 12, X0 = -3.5; // string half-length; Doppler wave speed (m/s); observer; loop (s); source start
const PROBE = 0.5;
const dopD = (s) => (s.vs > 0 ? Math.min(D, 7.5 / (s.vs * C) + 3) : D);

export default {
  id: 'waves', title: 'Waves', size: 2.6, plain: true, cam: 'front', duration: D,
  cameras: { front: { pos: [0, -9, 0.2] }, side: { pos: [9, 0, 0.2] }, top: { pos: [0, -0.01, 9.5] }, iso: { pos: [5, -7, 3.5] } },
  defaults: { kind: 'travel', shape: 'sine', A: 0.6, lam: 2, v: 1.5, A2: 1, lam2: 2, dir2: -1, n: 1, vstr: 4, mix: false, vs: 0.5, f: 1.2, parts: true },
  cases: [
    { id: 'travel', label: 'Travelling', set: {}, examples: [
      { id: 'short', label: 'Half the wavelength: double f', set: { lam: 1 } },
      { id: 'fast', label: 'Faster wave: same λ, higher f', set: { v: 3 } },
      { id: 'pulse', label: 'A single pulse', set: { shape: 'pulse' } },
    ] },
    { id: 'super', label: 'Superposition', set: { kind: 'super', shape: 'pulse' }, examples: [
      { id: 'cancel', label: 'Opposite pulses cancel', set: { A2: -1 } },
      { id: 'standing', label: 'Two opposite sines: standing', set: { shape: 'sine' } },
      { id: 'beats', label: 'Close wavelengths: beats', controls: ['lam2'], set: { shape: 'sine', dir2: 1, lam: 1, lam2: 1.12, A: 0.35 } },
    ] },
    { id: 'standing', label: 'String modes', set: { kind: 'standing' }, examples: [
      { id: 'n2', label: 'Second harmonic', set: { n: 2 } },
      { id: 'n3', label: 'Third harmonic', set: { n: 3 } },
      { id: 'mix', label: 'Modes 1 and 3 together', set: { mix: true } },
    ] },
    { id: 'doppler', label: 'Doppler', cam: 'top', set: { kind: 'doppler' }, examples: [
      { id: 'rest', label: 'Source at rest', set: { vs: 0 } },
      { id: 'barrier', label: 'At the wave speed', set: { vs: 1 } },
      { id: 'mach', label: 'Faster than the waves: a cone', set: { vs: 1.6 } },
    ] },
  ],
  controls: [
    { title: 'Wave', show: (s) => s.kind === 'travel' || s.kind === 'super', items: [
      { id: 'shape', label: 'Shape', type: 'segmented', options: [['sine', 'Sine'], ['pulse', 'Pulse']] },
      { id: 'A', label: 'Amplitude', unit: 'm', min: 0.05, max: 1, step: 0.01 },
      { id: 'lam', label: 'Wavelength λ', unit: 'm', min: 0.5, max: 6, step: 0.05 },
      { id: 'v', label: 'Speed v', unit: 'm/s', min: 0.3, max: 4, step: 0.05 },
    ] },
    { title: 'Second wave', show: (s) => s.kind === 'super', items: [
      { id: 'A2', label: 'Amplitude (× first)', unit: '', min: -1, max: 1, step: 0.05 },
      { id: 'lam2', label: 'Wavelength', unit: 'm', min: 0.5, max: 6, step: 0.01 },
      { id: 'dir2', label: 'Moving', type: 'segmented', options: [[-1, 'Left'], [1, 'Right']] },
    ] },
    { title: 'String', show: (s) => s.kind === 'standing', items: [
      { id: 'n', label: 'Mode n', unit: '', min: 1, max: 8, step: 1 },
      { id: 'vstr', label: 'Wave speed', unit: 'm/s', min: 1, max: 12, step: 0.1 },
      { id: 'mix', label: 'Add mode 3n', type: 'check' },
    ] },
    { title: 'Source', show: (s) => s.kind === 'doppler', items: [
      { id: 'vs', label: 'Source speed / wave speed', unit: '', min: 0, max: 2, step: 0.01 },
      { id: 'f', label: 'Frequency', unit: 'Hz', min: 0.5, max: 3, step: 0.05 },
    ] },
  ],
  display: [{ title: 'Show', items: [{ id: 'parts', label: 'The two separate waves', type: 'check', color: '--c-ref', show: (s) => s.kind === 'super' || (s.kind === 'standing' && s.mix) }] }],
  plots: [{ id: 'sig', title: '', xLabel: 't', xUnit: 's', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }, 'sep', { id: 'chk', label: '' }],

  setup(ctx) {
    const { scene, state, time, hud, plots, stage } = ctx;
    stage.grid.visible = false;
    const str = createCurve(stage, { max: 600, width: 3.4, color: '--c-B' });
    const p1 = createCurve(stage, { max: 600, width: 1.4, color: '--c-ref', dashed: true }), p2 = createCurve(stage, { max: 600, width: 1.4, color: '--c-E', dashed: true });
    const axis = createCurve(stage, { max: 1, width: 1, color: '--line' });
    const fronts = createCurve(stage, { max: 9000, width: 1.6, color: '--c-B' });
    const mat = (c) => new THREE.MeshStandardMaterial({ roughness: 0.4, color: c });
    const ends = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 1.6), mat()); scene.add(m); return m; });
    const probe = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), mat()); scene.add(probe);
    const src = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), mat()); scene.add(src);
    const obs = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 16), mat()); m.rotation.x = Math.PI / 2; scene.add(m); return m; });
    const obsL = [ctx.label(''), ctx.label('')]; obsL.forEach((l, i) => { obs[i].add(l); l.position.set(0, 0.3, 0); });

    const waves = () => {
      const w1 = travelling({ A: state.A, lam: state.lam, v: state.v, dir: 1, kind: state.shape, phase: state.shape === 'pulse' ? 2 * Math.PI * 2.4 / state.lam : 0 });
      if (state.kind !== 'super') return [w1];
      const w2 = travelling({ A: state.A * state.A2, lam: state.lam2, v: state.v, dir: state.dir2, kind: state.shape, phase: state.shape === 'pulse' ? 2 * Math.PI * 2.4 / state.lam2 * state.dir2 : 0 });
      return [w1, w2];
    };
    const pulseT = () => 4.8 / state.v; // two pulses meet at t = 2.4/v

    return {
      changed() {
        const dop = state.kind === 'doppler';
        ctx.setDuration(dop ? dopD(state) : state.kind === 'standing' ? 2 / mode(state.n, L, state.vstr, 1).f : state.shape === 'pulse' ? pulseT() + 1 : D);
      },
      update() {
        const t = time.t, k = state.kind, dop = k === 'doppler';
        str.object.visible = probe.visible = axis.object.visible = !dop;
        fronts.object.visible = src.visible = obs[0].visible = obs[1].visible = dop;
        for (const e of ends) e.visible = k === 'standing';
        p1.object.visible = p2.object.visible = false;
        const T = [], S1 = [], S2 = [];
        if (!dop) {
          axis.segments([-XL, 0, 0, XL, 0, 0]);
          let f;
          if (k === 'standing') {
            const m1 = mode(state.n, L, state.vstr, 0.7), m3 = mode(3 * state.n, L, state.vstr, 0.35), y1 = (x, tt) => m1.y(x + XL, tt), y3 = (x, tt) => m3.y(x + XL, tt);
            f = state.mix ? (x, tt) => y1(x, tt) + y3(x, tt) : y1;
            ends[0].position.set(-XL - 0.05, 0, 0); ends[1].position.set(XL + 0.05, 0, 0);
            if (state.mix && state.parts) { p1.object.visible = p2.object.visible = true; const a = [], b = []; for (let i = 0; i <= 400; i++) { const x = -XL + L * i / 400; a.push(x, 0.01, y1(x, t)); b.push(x, 0.01, y3(x, t)); } p1.set(a); p2.set(b); }
            hud.set('a', `mode n = ${state.n}: ${state.n - 1} node${state.n === 2 ? '' : 's'} inside`); hud.set('b', `f = n·v/2L = ${si(m1.f, 'Hz')}`); hud.set('c', `λ = 2L/n = ${si(2 * L / state.n, 'm')}`);
            hud.set('chk', state.mix ? `also f₃ₙ = ${si(m3.f, 'Hz')}` : 'ends fixed: y = 0 ✓', state.mix ? '' : 'good');
          } else {
            const W = waves(); f = (x, tt) => W.reduce((a, w) => a + w(x, tt), 0);
            if (k === 'super' && state.parts) { p1.object.visible = p2.object.visible = true; const a = [], b = []; for (let i = 0; i <= 500; i++) { const x = -XL + L * i / 500; a.push(x, 0.01, W[0](x, t)); b.push(x, 0.01, W[1](x, t)); } p1.set(a); p2.set(b); }
            const fr = state.v / state.lam;
            hud.set('a', `v = ${si(state.v, 'm/s')}, λ = ${si(state.lam, 'm')}`); hud.set('b', `f = v/λ = ${si(fr, 'Hz')}, T = ${si(1 / fr, 's')}`);
            hud.set('c', k === 'super' && state.dir2 === 1 && state.shape === 'sine' ? `beat frequency |f₁ − f₂| = ${si(Math.abs(fr - state.v / state.lam2), 'Hz')}` : k === 'super' ? 'the waves pass through each other' : 'v = f·λ');
            hud.set('chk', '');
          }
          const pts = []; for (let i = 0; i <= 500; i++) { const x = -XL + L * i / 500; pts.push(x, 0, f(x, t)); } str.set(pts);
          probe.position.set(PROBE, 0, f(PROBE, t));
          const Dp = time.D || D; for (let i = 0; i <= 300; i++) { const tt = Dp * i / 300; T.push(tt); S1.push(f(PROBE, tt)); }
          plots.sig.draw({ xlim: [0, Dp], cursor: t, series: [{ x: T, y: S1, color: '--c-B', label: `displacement at x = ${PROBE} m [m]` }] });
        } else {
          const c = C, vs = state.vs * c, P = { x0: X0, vs, c, t0: 0 }, xs = (tt) => P.x0 + vs * tt, per = 1 / state.f, seg = [], Dd = dopD(state);
          for (let te = 0; te <= t; te += per) {
            const r = c * (t - te), cx = xs(te); if (r > 9) continue;
            for (let j = 0; j < 64; j++) { const a = 2 * Math.PI * j / 64, b = 2 * Math.PI * (j + 1) / 64; seg.push(cx + r * Math.cos(a), r * Math.sin(a), 0, cx + r * Math.cos(b), r * Math.sin(b), 0); }
          }
          fronts.segments(seg.slice(0, 9000 * 6 - 6));
          src.position.set(xs(t), 0, 0.05); obs[0].position.set(OBS, 0, 0.1); obs[1].position.set(-OBS, 0, 0.1);
          const fa = vs < c ? dopplerAhead(state.f, c, vs) : Infinity, fb = dopplerBehind(state.f, c, vs);
          obsL[0].element.textContent = vs < c ? `ahead ${si(fa, 'Hz')}` : 'ahead: boom'; obsL[1].element.textContent = `behind ${si(fb, 'Hz')}`;
          hud.set('a', `source ${si(state.f, 'Hz')} at ${(state.vs).toFixed(2)} × wave speed`); hud.set('b', vs < c ? `ahead f·c/(c − v) = ${si(fa, 'Hz')}` : `Mach ${state.vs.toFixed(2)}: cone half-angle ${(Math.asin(1 / state.vs) * 180 / Math.PI).toFixed(1)}°`);
          hud.set('c', `behind f·c/(c + v) = ${si(fb, 'Hz')}`); hud.set('chk', '');
          const sig = (px, tt) => { const te = emissionTime(tt, px, 0, P); return te == null ? 0 : Math.sin(2 * Math.PI * state.f * te); };
          for (let i = 0; i <= 600; i++) { const tt = Dd * i / 600; T.push(tt); S1.push(sig(OBS, tt)); S2.push(sig(-OBS, tt) - 2.5); }
          plots.sig.draw({ xlim: [0, Dd], cursor: t, series: [{ x: T, y: S1, color: '--c-I', label: 'heard ahead' }, { x: T, y: S2, color: '--c-v', label: 'heard behind (shifted down)' }] });
        }
      },
      theme() {
        for (const c of [str, p1, p2, axis, fronts]) c.theme();
        for (const e of ends) e.material.color.set(ctx.cssVar('--c-ref'));
        probe.material.color.set(ctx.cssVar('--accent')); src.material.color.set(ctx.cssVar('--c-E'));
        obs[0].material.color.set(ctx.cssVar('--c-I')); obs[1].material.color.set(ctx.cssVar('--c-v'));
      },
    };
  },
};
