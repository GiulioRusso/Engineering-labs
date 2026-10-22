// Time response from the poles: drag a pole over the 3D |G(s)| surface; the step response follows.
import { createKnob } from '../../lib/viz/knob.js';
import { createSPlane, SX, SY, height, VIEW3D, camOf } from '../splane.js';
import { fromRoots, roots, step, simulate, stepInfo, evalTF, cabs } from '../tf.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '—');
const cpx = ([x, y]) => (Math.abs(y) < 1e-9 ? fmt(x) : `${fmt(x)} ${y < 0 ? '−' : '+'} ${fmt(Math.abs(y))}j`);

// the transfer function of each case, normalised to DC gain K when the system has one
function system(s) {
  if (s.kind === 'first') return { num: [s.K], den: [s.tau, 1] };
  if (s.kind === 'second') return { num: [s.K * s.wn * s.wn], den: [1, 2 * s.zeta * s.wn, s.wn * s.wn] };
  const ps = [[s.ps, s.pw], [s.ps, -s.pw]]; if (s.p3on) ps.push([s.p3, 0]);
  const den = fromRoots(ps), c = den[den.length - 1];
  return { num: [s.K * (Math.abs(c) > 1e-9 ? c : 1)], den };
}

export default {
  id: 'response', title: 'Time response', size: 3.4, timeless: true, plain: true, camOf,
  cameras: { front: { pos: [-1.7, -8, 2.2], target: [-1.7, 0, 0.6] }, side: { pos: [5, 0, 2.5], target: [-1.7, 0, 0.6] }, top: { pos: [-1.7, -0.01, 9], target: [-1.7, 0, 0] }, iso: { pos: [2.6, -6.4, 5], target: [-1.7, 0, 0.4] } },
  defaults: { kind: 'first', K: 1, tau: 1, zeta: 0.3, wn: 2, ps: -0.5, pw: 2, p3on: false, p3: -4, view3d: false },
  cases: [
    { id: 'first', label: 'First order', set: {}, examples: [
      { id: 'fast', label: 'Small τ: fast', set: { tau: 0.3 } },
      { id: 'slow', label: 'Large τ: slow', set: { tau: 3 } },
      { id: 'gain', label: 'Gain K = 2', set: { K: 2 } },
    ] },
    { id: 'second', label: 'Second order', set: { kind: 'second' }, examples: [
      { id: 'z0', label: 'ζ = 0: never settles', set: { zeta: 0 } },
      { id: 'z07', label: 'ζ = 0.7: about 5 % overshoot', set: { zeta: 0.7 } },
      { id: 'z1', label: 'ζ = 1: critical', set: { zeta: 1 } },
      { id: 'z2', label: 'ζ = 2: overdamped', set: { zeta: 2 } },
      { id: 'wn', label: 'Double ωₙ: same shape, faster', set: { wn: 4 } },
    ] },
    { id: 'poles', label: 'Poles', set: { kind: 'poles' }, examples: [
      { id: 'axis', label: 'On the jω axis: oscillates forever', set: { ps: 0 } },
      { id: 'rhp', label: 'Right half plane: unstable', set: { ps: 0.3 } },
      { id: 'real', label: 'Two real poles: no oscillation', set: { ps: -1, pw: 0 } },
      { id: 'far', label: 'A far pole hardly matters', set: { p3on: true, p3: -4 } },
      { id: 'near', label: 'A near pole dominates', set: { p3on: true, p3: -0.2 } },
    ] },
  ],
  controls: [
    { title: 'System', items: [
      { type: 'readout', label: 'G(s)', value: (s) => (s.kind === 'first' ? 'K / (τs + 1)' : s.kind === 'second' ? 'K ωₙ² / (s² + 2ζωₙ s + ωₙ²)' : 'poles you place') },
      { id: 'K', label: 'Gain K', unit: '', min: 0.1, max: 5, step: 0.05 },
      { id: 'tau', label: 'Time constant τ', unit: 's', min: 0.1, max: 5, log: true, show: (s) => s.kind === 'first' },
      { id: 'zeta', label: 'Damping ratio ζ', unit: '', min: 0, max: 2.5, step: 0.01, show: (s) => s.kind === 'second' },
      { id: 'wn', label: 'Natural frequency ωₙ', unit: 'rad/s', min: 0.3, max: 3.4, step: 0.01, show: (s) => s.kind === 'second' },
      { id: 'ps', label: 'Pole pair: real part σ', unit: '1/s', min: -4.5, max: 1, step: 0.01, show: (s) => s.kind === 'poles' },
      { id: 'pw', label: 'Pole pair: imaginary part ω', unit: 'rad/s', min: 0, max: 3.4, step: 0.01, show: (s) => s.kind === 'poles' },
      { id: 'p3on', label: 'Third pole (real)', type: 'check', show: (s) => s.kind === 'poles' },
      { id: 'p3', label: 'Third pole at', unit: '1/s', min: -4.5, max: -0.05, step: 0.01, show: (s) => s.kind === 'poles' && s.p3on },
    ] },
  ],
  display: [{ title: 'Show', items: [VIEW3D] }],
  plots: [{ id: 'y', title: '', xLabel: 't', xUnit: 's', yUnit: '' }],
  hud: [{ id: 'p', label: 'poles' }, { id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }, 'sep', { id: 'chk', label: '' }],

  setup(ctx) {
    const { scene, state, hud, plots, handles } = ctx;
    const sp = createSPlane(ctx), knob = createKnob(scene, '--accent', 0.11);
    const knobPos = () => (state.kind === 'first' ? [-1 / state.tau, 0] : state.kind === 'second' ? [-state.zeta * state.wn, state.wn * Math.sqrt(Math.max(0, 1 - state.zeta ** 2))] : [state.ps, state.pw]);
    handles.add({ object: knob.group, axes: 'xy', hint: 'Drag the pole', get: () => knob.get(), set: ([x, y]) => {
      x = Math.max(SX[0] + 0.1, Math.min(SX[1] - 0.1, x)); y = Math.max(0, Math.min(SY[1] - 0.1, y));
      if (state.kind === 'first') state.tau = Math.min(5, Math.max(0.1, -1 / Math.min(-0.2, x)));
      else if (state.kind === 'second') { const r = Math.hypot(x, y); const xx = Math.min(-0.01, x); state.wn = Math.max(0.3, Math.min(3.4, Math.hypot(xx, y))); state.zeta = Math.min(1, Math.max(0, -xx / Math.max(1e-6, r))); }
      else { state.ps = x; state.pw = y; }
      ctx.requestUpdate(); ctx.panelSync();
    } });

    return {
      changed(id) { sp.view(state.view3d); if (id === 'view3d') ctx.stage.preset(camOf(state)); },
      update() {
        const G = system(state), P = roots(G.den), slow = Math.min(...P.map((p) => Math.abs(p[0]) || 1e9));
        sp.setTF(G); sp.marks(P);
        const [kx, ky] = knobPos(); knob.set([kx, ky, state.view3d ? height(cabs(evalTF(G, [kx, ky + 1e-3]))) + 0.12 : 0.05]);
        const unstable = P.some((p) => p[0] > 1e-9), marginal = !unstable && P.some((p) => Math.abs(p[0]) < 1e-9);
        const grow = Math.max(...P.map((p) => p[0])), T = unstable ? Math.min(15, Math.max(3, 3 / grow)) : marginal ? 15 : Math.min(30, Math.max(3, 6 / slow)), imp = state.kind === 'poles';
        const r = imp ? simulate({ num: [...G.num, 0], den: G.den }, () => 1, T, 4e-3) : step(G, T, 4e-3);
        const t = Array.from(r.t), y = Array.from(r.y).map((v) => Math.max(-1e3, Math.min(1e3, v)));
        const series = [{ x: t, y, color: '--c-B', label: imp ? 'impulse response' : 'step response' }];
        if (!imp) series.push({ x: [0, T], y: [state.K, state.K], color: '--c-ref', dash: [4, 3], label: 'final value K' });
        hud.set('p', P.map(cpx).join(', '));
        if (state.kind === 'first') {
          hud.set('a', `τ = ${fmt(state.tau)} s, pole at −1/τ = ${fmt(-1 / state.tau)}`); hud.set('b', `y(τ) = ${fmt(r.y[Math.round(state.tau / 4e-3)] / state.K)} K (1 − 1/e = 0.632)`);
          hud.set('c', `2 % settling ≈ 4τ = ${fmt(4 * state.tau)} s`); hud.set('chk', `measured ${fmt(stepInfo(r, state.K).settling)} s`, 'good');
          series.push({ x: [state.tau, state.tau], y: [0, state.K * 0.632], color: '--c-E', dash: [2, 3], label: 't = τ' });
        } else if (state.kind === 'second') {
          const z = state.zeta, info = stepInfo(r, state.K), os = z < 1 ? 100 * Math.exp(-Math.PI * z / Math.sqrt(1 - z * z)) : 0;
          hud.set('a', `ζ = ${fmt(z)}, ωₙ = ${fmt(state.wn)} rad/s`); hud.set('b', `overshoot ${fmt(info.overshoot)} % (formula ${fmt(os)} %)`);
          hud.set('c', z > 0 ? `settling ${fmt(info.settling)} s (≈ 4/ζωₙ = ${fmt(4 / (z * state.wn))} s)` : 'never settles');
          hud.set('chk', Math.abs(info.overshoot - os) < 0.5 ? 'overshoot matches e^(−πζ/√(1−ζ²)) ✓' : '', 'good');
        } else {
          hud.set('a', unstable ? 'a pole in the right half plane: unstable' : marginal ? 'poles on the jω axis: marginally stable' : 'all poles in the left half plane: stable');
          hud.set('b', state.pw > 0 ? `oscillates at ω = ${fmt(state.pw)} rad/s` : 'no oscillation'); hud.set('c', `envelope e^(σt), σ = ${fmt(state.ps)}`);
          hud.set('chk', unstable ? 'grows ✗' : marginal ? 'neither grows nor decays' : 'decays ✓', unstable ? 'bad' : 'good');
        }
        plots.y.draw({ xlim: [0, T], series });
      },
      theme() { sp.theme(); knob.theme(); },
    };
  },
};
