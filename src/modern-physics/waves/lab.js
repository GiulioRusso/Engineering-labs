// Matter waves: electrons arriving one by one on a screen behind two slits (the fringes build up dot by
// dot, and vanish with a which-slit detector), a wave packet and its momentum spread (Δx·Δp ≥ ħ/2),
// tunnelling through a barrier with the wavefunction drawn across it, and Compton scattering.
import { createChart } from '../../lib/viz/chart.js';
import { lambdaE, twoSlit, hits, packet, barrier, transmission, compton, LC } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-300 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], NE = 3000, D = 12;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));

export default {
  id: 'waves', title: 'Matter waves', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { eV: 50, d: 200, a: 50, detector: false, sigma: 1, k0: 4, chirp: 0, E: 2, V0: 5, w: 0.5, theta: 90, lam: 10 },
  cases: [
    { id: 'slits', label: 'Electrons through two slits', set: {}, examples: [
      { id: 'detector', label: 'Watch which slit: no fringes', controls: ['detector'], set: { detector: true } },
      { id: 'fast', label: 'Faster electrons: finer fringes', controls: ['eV'], set: { eV: 500 } },
    ] },
    { id: 'uncertainty', label: 'Uncertainty', set: {}, examples: [
      { id: 'narrow', label: 'Squeeze the packet: momentum spreads', controls: ['sigma'], set: { sigma: 0.3 } },
      { id: 'chirp', label: 'A chirp: more than the minimum', controls: ['chirp'], set: { chirp: 0.4 } },
    ] },
    { id: 'tunnel', label: 'Tunnelling', set: {}, examples: [
      { id: 'thick', label: 'Twice as thick: far less gets through', controls: ['w'], set: { w: 1 } },
      { id: 'above', label: 'Above the barrier: still some reflection', controls: ['E'], set: { E: 6 } },
    ] },
    { id: 'compton', label: 'Compton scattering', set: {}, examples: [
      { id: 'back', label: 'Backscatter: Δλ = 2λc', controls: ['theta'], set: { theta: 180 } },
      { id: 'light', label: 'Visible light: no visible shift', controls: ['lam'], set: { lam: 500000 } },
    ] },
  ],
  controls: [
    { title: 'Electrons and slits', show: (s) => s.case === 'slits', items: [
      { id: 'eV', label: 'Electron energy', unit: 'eV', min: 5, max: 5000, log: true }, { id: 'd', label: 'Slit separation d', unit: 'nm', min: 50, max: 1000, log: true },
      { id: 'a', label: 'Slit width', unit: 'nm', min: 10, max: 200, step: 1 }, { id: 'detector', label: 'Detect which slit each electron passes', type: 'check', color: '--c-north' },
    ] },
    { title: 'ψ = e^(−x²/4σ²) e^(ik₀x + icx²)', show: (s) => s.case === 'uncertainty', items: [
      { id: 'sigma', label: 'Width σ', unit: '', min: 0.2, max: 4, step: 0.02 }, { id: 'k0', label: 'Mean wavenumber k₀', unit: '', min: 0, max: 8, step: 0.1 }, { id: 'chirp', label: 'Chirp c', unit: '', min: 0, max: 1, step: 0.01 },
    ] },
    { title: 'Electron on a barrier', show: (s) => s.case === 'tunnel', items: [
      { id: 'E', label: 'Electron energy E', unit: 'eV', min: 0.1, max: 12, step: 0.05 }, { id: 'V0', label: 'Barrier height V₀', unit: 'eV', min: 0.5, max: 10, step: 0.05 },
      { id: 'w', label: 'Barrier width', unit: 'nm', min: 0.05, max: 2, step: 0.01 },
    ] },
    { title: 'Photon on an electron', show: (s) => s.case === 'compton', items: [
      { id: 'theta', label: 'Scattering angle θ', unit: '°', min: 0, max: 180, step: 1 }, { id: 'lam', label: 'Incoming wavelength', unit: 'pm', min: 1, max: 1e6, log: true },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), all = [sq, tr, br];
    let HIT = { key: '' };

    function slits() {
      const lam = lambdaE(state.eV), d = state.d * 1e-9, a = state.a * 1e-9, tm = 4 * lam / d, key = `${state.eV},${state.d},${state.a},${state.detector}`;
      if (HIT.key !== key) { const h = hits(NE, lam, d, a, state.detector, tm); let s = 5; HIT = { key, h, y: h.map(() => { s = (s * 16807) % 2147483647; return s / 2147483647; }) }; }
      const n = Math.max(1, Math.round(NE * Math.min(1, time.t / (D - 1)) ** 1.6)), mr = tm * 1e3;
      sq.range([-mr, mr], [0, 1]); sq.titles('angle on the screen (mrad)', `the screen: ${n} electrons so far, each one a dot`);
      sq.dots('h', HIT.h.slice(0, n).map((t) => t * 1e3), HIT.y.slice(0, n), { color: state.detector ? '--c-north' : '--c-v', size: n > 1500 ? 3 : 4 });
      const nb = 80, cnt = new Array(nb).fill(0); for (const t of HIT.h.slice(0, n)) { const i = Math.floor((t + tm) / (2 * tm) * nb); if (i >= 0 && i < nb) cnt[i]++; }
      const th = lin(-tm, tm, 600), I = th.map((t) => twoSlit(t, lam, d, a, state.detector)), area = I.reduce((s, v) => s + v, 0) * (2 * tm / 600), scale = n * (2 * tm / nb) / area;
      tr.range([-mr, mr], [0, Math.max(5, ...cnt) * 1.15]); tr.titles('angle (mrad)', 'counts per bin (bars) against the wave prediction');
      tr.stems('c', cnt.map((_, i) => (-tm + (i + 0.5) * 2 * tm / nb) * 1e3), cnt, { color: '--c-B', width: 4 }); tr.line('p', th.map((t) => t * 1e3), I.map((v) => v * scale), { color: '--c-I', width: 1.6 });
      const es = lin(0, 4, 100).map((l) => 10 ** l); br.range([0, 4], [-3, 0.5]); br.titles('log₁₀ energy (eV)', 'log₁₀ λ (nm): λ = h / √(2mE)');
      br.line('l', es.map(Math.log10), es.map((e) => Math.log10(lambdaE(e) * 1e9)), { color: '--c-v' }); br.dots('c', [Math.log10(state.eV)], [Math.log10(lam * 1e9)], { color: '--accent', size: 10 });
      plots.aux.draw({ xlim: [-mr, mr], series: [{ x: th.map((t) => t * 1e3), y: th.map((t) => twoSlit(t, lam, d, a, false)), color: '--c-v', label: 'both slits open, not watched' }, { x: th.map((t) => t * 1e3), y: th.map((t) => twoSlit(t, lam, d, a, true)), color: '--c-north', label: 'with a which-slit detector' }], xlabel: 'angle (mrad)' });
      hud.set('a', `${state.eV} eV electrons: λ = h/√(2mE) = ${fmt(lam * 1e12)} pm; fringes λ/d = ${fmt(lam / d * 1e3)} mrad apart`);
      hud.set('b', state.detector ? 'knowing which slit each electron took destroys the interference: two plain humps' : 'each electron lands at one point, yet the points pile up into a two-slit interference pattern', state.detector ? 'bad' : 'good');
      hud.set('c', 'the wave says where electrons are likely to land; each one still arrives as a particle');
    }

    function uncertainty() {
      const P = packet(state.sigma, state.k0, state.chirp), win = (arr, xs, lo, hi) => arr.filter((_, i) => xs[i] >= lo && xs[i] <= hi);
      const X = Math.max(4, 4 * state.sigma), xs = P.x;
      sq.range([-X, X], [-1.1, 1.1]); sq.titles('x', 'ψ(x): real part (blue), |ψ|² (green); width Δx');
      sq.line('re', win(xs, xs, -X, X), win(P.re, xs, -X, X), { color: '--c-B', width: 1.6, max: 3000 }); sq.line('p2', win(xs, xs, -X, X), win(P.p2, xs, -X, X), { color: '--c-v', width: 2.4, max: 3000 });
      sq.line('dx', [-P.dX, P.dX], [-1, -1], { color: '--c-I', width: 4 });
      const K = Math.max(3, 4 * P.dK) + state.k0, mq = Math.max(...P.q2);
      tr.range([state.k0 - K, state.k0 + K], [0, 1.1]); tr.titles('wavenumber k (momentum p = ħk)', '|φ(k)|²: width Δk');
      tr.line('q', win(P.k, P.k, state.k0 - K, state.k0 + K), win(P.q2.map((v) => v / mq), P.k, state.k0 - K, state.k0 + K), { color: '--c-I', width: 2.2, max: 3000 }); tr.line('dk', [state.k0 - P.dK, state.k0 + P.dK], [0.05, 0.05], { color: '--c-v', width: 4 });
      const ss = lin(0.2, 4, 60); br.range([0.2, 4], [0, 2]); br.titles('σ', 'Δx · Δk: minimum ½ (dashed)');
      br.line('pr', ss, ss.map((s) => 0.5 * Math.sqrt(1 + 16 * state.chirp ** 2 * s ** 4)), { color: '--c-B' }); br.line('h', [0.2, 4], [0.5, 0.5], { color: '--c-north', width: 1.2, dashed: true }); br.dots('c', [state.sigma], [P.product], { color: '--accent', size: 10 });
      plots.aux.draw({ xlim: [0.2, 4], cursor: state.sigma, series: [{ x: ss, y: ss.map((s) => s), color: '--c-v', label: 'Δx' }, { x: ss, y: ss.map((s) => 0.5 * Math.sqrt(1 + 16 * state.chirp ** 2 * s ** 4) / s), color: '--c-I', label: 'Δk' }], xlabel: 'σ' });
      hud.set('a', `Δx = ${fmt(P.dX)}, Δk = ${fmt(P.dK)}: Δx·Δk = ${fmt(P.product, 4)}  (Δx·Δp = ${fmt(P.product, 4)} ħ)`);
      hud.set('b', state.chirp ? 'a chirp adds spread in k without narrowing x: the product rises above the minimum' : 'a Gaussian is the narrowest packet possible: Δx·Δp = ħ/2 exactly', state.chirp ? '' : 'good');
      hud.set('c', 'squeezing a wave in space needs many wavelengths to build it: Δx·Δp ≥ ħ/2 is a property of waves, not of clumsy measurements');
    }

    function tunnel() {
      const a = state.w * 1e-9, Bb = barrier(state.E, state.V0, a), Tf = transmission(state.E, state.V0, a), lo = -1.5e-9, hi = a + 1.5e-9, xs = lin(lo, hi, 900), ph = -2 * Math.PI * time.t / 2;
      const P = xs.map((x) => Bb.psi(x)), re = P.map((z) => z[0] * Math.cos(ph) - z[1] * Math.sin(ph)), m2 = P.map((z) => z[0] * z[0] + z[1] * z[1]), top = Math.max(2.2, ...m2) * 1.05;
      sq.range([lo * 1e9, hi * 1e9], [-top, top * 1.2]); sq.titles('x (nm)', 'ψ: real part (blue, turning in time) and |ψ|² (green); the barrier in grey');
      const vh = top * 1.1 * Math.min(1, state.V0 / Math.max(state.E, state.V0)); sq.line('bar', [0, 0, a * 1e9, a * 1e9], [-top, vh, vh, -top], { color: '--ink-dim', width: 2 }); sq.line('E', [lo * 1e9, hi * 1e9], [top * 1.1 * state.E / Math.max(state.E, state.V0), top * 1.1 * state.E / Math.max(state.E, state.V0)], { color: '--c-I', width: 1, dashed: true });
      sq.line('re', xs.map((x) => x * 1e9), re, { color: '--c-B', width: 1.6, max: 2000 }); sq.line('m2', xs.map((x) => x * 1e9), m2, { color: '--c-v', width: 2.2, max: 2000 });
      const er = lin(0.05, 3, 200); tr.range([0.05, 3], [-8, 0.2]); tr.titles('E / V₀', 'log₁₀ transmission');
      tr.line('t', er, er.map((r) => Math.log10(transmission(r * state.V0, state.V0, a))), { color: '--c-v' }); tr.line('one', [1, 1], [-8, 0.2], { color: '--ink-dim', width: 1, dashed: true }); tr.dots('c', [state.E / state.V0], [Math.log10(Tf)], { color: '--accent', size: 10 });
      const ws = lin(0.05, 2, 100); br.range([0.05, 2], [-12, 0.2]); br.titles('barrier width (nm)', 'log₁₀ transmission: a straight line = exponential');
      br.line('w', ws, ws.map((w) => Math.log10(transmission(state.E, state.V0, w * 1e-9))), { color: '--c-B' }); br.dots('c', [state.w], [Math.log10(Tf)], { color: '--accent', size: 10 });
      plots.aux.draw({ xlim: [lo * 1e9, hi * 1e9], series: [{ x: xs.map((x) => x * 1e9), y: m2, color: '--c-v', label: '|ψ|² (incoming wave has |ψ|² = 1)' }], xlabel: 'x (nm)' });
      hud.set('a', `E = ${state.E} eV on V₀ = ${state.V0} eV, ${state.w} nm wide: T = ${fmt(Tf, 3)}, R = ${fmt(Bb.R, 3)}`);
      hud.set('b', state.E < state.V0 ? `inside, ψ decays as e^(−κx) with 1/κ = ${fmt(1e9 / Bb.kappa)} nm: T ≈ e^(−2κa) = ${fmt(Math.exp(-2 * Bb.kappa * a), 3)}` : 'above the barrier the wave still partly reflects: classically it would all pass', Tf > 0.01 ? 'good' : '');
      hud.set('c', 'a classical particle with E < V₀ always bounces back; a wave leaks through, exponentially less with every extra width — scanning tunnelling microscopes, flash memory and alpha decay rely on it');
    }

    function comptonCase() {
      const lam = state.lam * 1e-12, th = state.theta * Math.PI / 180, R = compton(lam, th), ar = SQ[2] / SQ[3];
      sq.range([-2.2 * ar, 2.2 * ar], [-2.2, 2.2]); sq.titles('', ': a photon (orange) hits an electron at rest; the scattered photon (blue) has a longer wavelength');
      const wave = (key, ang, len, wl, off, color) => { const s = lin(0, len, 400), amp = 0.12, k = 2 * Math.PI / wl; sq.line(key, s.map((u) => off[0] + u * Math.cos(ang) - amp * Math.sin(k * u) * Math.sin(ang)), s.map((u) => off[1] + u * Math.sin(ang) + amp * Math.sin(k * u) * Math.cos(ang)), { color, width: 2 }); };
      const wl = 0.35, wl2 = wl * Math.min(4, R.lam2 / lam); wave('in', 0, 2.6, wl, [-2.8, 0], '--c-I'); wave('out', th, 2.4, wl2, [0, 0], '--c-B');
      sq.dots('e', [0], [0], { color: '--c-v', size: 14 }); const pe = 1.6; sq.line('el', [0, pe * Math.cos(-R.phi)], [0, pe * Math.sin(-R.phi)], { color: '--c-v', width: 3 });
      const ts = lin(0, 180, 181); tr.range([0, 180], [0, 5.2]); tr.titles('θ (°)', 'Δλ (pm) = λc (1 − cos θ)');
      tr.line('d', ts, ts.map((t) => LC * (1 - Math.cos(t * Math.PI / 180)) * 1e12), { color: '--c-B' }); tr.dots('c', [state.theta], [R.dl * 1e12], { color: '--accent', size: 10 });
      br.range([0, 180], [0, 1.05]); br.titles('θ (°)', 'energy kept by the photon, E′/E, at this wavelength');
      br.line('k', ts, ts.map((t) => { const q = compton(lam, t * Math.PI / 180); return q.E2 / q.E1; }), { color: '--c-I' }); br.dots('c', [state.theta], [R.E2 / R.E1], { color: '--accent', size: 10 });
      plots.aux.draw({ xlim: [0, 180], cursor: state.theta, series: [{ x: ts, y: ts.map((t) => compton(lam, t * Math.PI / 180).phi * 180 / Math.PI), color: '--c-v', label: 'electron recoil angle (°)' }], xlabel: 'photon scattering angle θ (°)' });
      hud.set('a', `λ = ${fmt(state.lam)} pm → λ′ = ${fmt(R.lam2 * 1e12, 5)} pm: Δλ = ${fmt(R.dl * 1e12)} pm (λc = h/mₑc = 2.43 pm)`);
      hud.set('b', `photon ${fmt(R.E1 / 1e3, 4)} keV → ${fmt(R.E2 / 1e3, 4)} keV; the electron recoils with ${fmt(R.Ke / 1e3, 3)} keV at ${fmt(R.phi * 180 / Math.PI)}°`);
      hud.set('c', 'the shift does not depend on the wavelength: obvious for X-rays (pm), invisible for light (500 000 pm). Photons carry momentum p = h/λ and collide like billiard balls');
    }

    return {
      changed() { all.forEach((k) => k.show(true)); ctx.setClock(state.case === 'slits' ? D : state.case === 'tunnel' ? 8 : 0); },
      update() { all.forEach((k) => k.clear()); ({ slits, uncertainty, tunnel, compton: comptonCase })[state.case](); },
      theme() { all.forEach((k) => k.theme()); },
    };
  },
};
