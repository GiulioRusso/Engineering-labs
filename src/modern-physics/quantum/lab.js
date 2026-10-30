// Early quantum physics: photoelectric effect (K_max against frequency for four metals), a particle in
// a box (stationary states and a sloshing superposition), and the hydrogen levels and spectral lines.
import { createChart } from '../../lib/viz/chart.js';
import { METALS, photonEnergy, kmax, threshold, boxEnergy, psi, density, level, line, HC_EV_NM } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -1.25, 3.5, 0.8], PLAY = 8;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const MCOL = { cs: '--c-v', na: '--c-E', zn: '--c-B', cu: '--c-I' }, SERIES = { lyman: [1, 'Lyman (ultraviolet)'], balmer: [2, 'Balmer (visible)'], paschen: [3, 'Paschen (infrared)'] };
function spectral(l, out) { // approximate colour of a wavelength (nm); dim outside the visible
  let r = 0, g = 0, b = 0;
  if (l < 380) { r = 0.25; b = 0.4; } else if (l < 440) { r = (440 - l) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; } else if (l < 510) { g = 1; b = (510 - l) / 20; }
  else if (l < 580) { r = (l - 510) / 70; g = 1; } else if (l < 645) { r = 1; g = (645 - l) / 65; } else if (l <= 750) r = 1; else r = 0.35;
  out[0] = r; out[1] = g; out[2] = b; return out;
}

export default {
  id: 'quantum', title: 'Quanta: photons, a box, hydrogen', size: 4.4, ortho: true, plain: true, cam: 'top', duration: PLAY, loop: true,
  defaults: { metal: 'na', lam: 400, L: 1, a: 1, b: 2, series: 'balmer', up: 3 },
  cases: [
    { id: 'photo', label: 'Photoelectric effect', controls: ['lam', 'metal'], set: { metal: 'na', lam: 400 }, examples: [
      { id: 'red', label: 'Red light on sodium: nothing', set: { lam: 650 } },
      { id: 'uv', label: 'Ultraviolet on zinc', set: { metal: 'zn', lam: 250 } },
    ] },
    { id: 'box', label: 'Particle in a box', controls: ['a', 'b', 'L'], set: { L: 1, a: 1, b: 2 }, examples: [
      { id: 'ground', label: 'Ground state: nothing moves', set: { b: 1 } },
      { id: 'one-three', label: 'States 1 and 3: faster', set: { b: 3 } },
      { id: 'wide', label: 'Twice as wide: 4 × lower energies', set: { L: 2 } },
    ] },
    { id: 'bohr', label: 'Hydrogen spectrum', controls: ['series', 'up'], set: { series: 'balmer', up: 3 }, examples: [
      { id: 'lyman', label: 'Lyman: down to n = 1', set: { series: 'lyman', up: 2 } },
      { id: 'paschen', label: 'Paschen: down to n = 3', set: { series: 'paschen', up: 4 } },
    ] },
  ],
  controls: [
    { title: 'Light', show: (s) => s.case === 'photo', items: [
      { id: 'lam', label: 'Wavelength λ', unit: 'nm', min: 150, max: 800, step: 1 },
      { id: 'metal', label: 'Metal', type: 'select', options: Object.entries(METALS).map(([k, v]) => [k, `${v.label} (φ = ${v.phi} eV)`]) },
    ] },
    { title: 'Box', show: (s) => s.case === 'box', items: [
      { id: 'a', label: 'State a', unit: '', min: 1, max: 5, step: 1 },
      { id: 'b', label: 'State b', unit: '', min: 1, max: 5, step: 1 },
      { id: 'L', label: 'Width L', unit: 'nm', min: 0.5, max: 3, step: 0.05 },
    ] },
    { title: 'Hydrogen', show: (s) => s.case === 'bohr', items: [
      { id: 'series', label: 'Series', type: 'segmented', options: [['lyman', 'Lyman'], ['balmer', 'Balmer'], ['paschen', 'Paschen']] },
      { id: 'up', label: 'From level n', unit: '', min: 2, max: 7, step: 1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR, yTicks: false, grid: false }), charts = [sq, tr, br];
    const pool = Array.from({ length: 10 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; }); let nl = 0;
    const text = (t, ch, x, y) => { if (nl >= pool.length) return; const l = pool[nl++]; l.element.textContent = t; l.position.set(ch ? ch.mx(x) : x, ch ? ch.my(y) : y, 0.02); l.visible = true; }; // ch = null: world units
    const rgb = [0, 0, 0];
    return {
      changed() {
        charts.forEach((c) => { c.clear(); c.show(false); c.show(true); });
        ctx.setClock(state.case === 'box' && Math.round(state.a) !== Math.round(state.b) ? PLAY : 0);
      },
      update() {
        nl = 0; pool.forEach((l) => { l.visible = false; });
        const c = state.case;
        if (c === 'photo') {
          const m = METALS[state.metal], f = (lam) => 299792458 / (lam * 1e-9) / 1e14, E = photonEnergy(state.lam), K = kmax(state.lam, m.phi), fs = lin(2, 20, 200);
          sq.range([2, 20], [0, 6.5]); sq.titles('frequency f (10¹⁴ Hz)', 'K_max (eV) = stopping voltage (V): one line per metal, all with slope h');
          for (const [k, M] of Object.entries(METALS)) { const on = k === state.metal; sq.hide(`${k}${!on}`); sq.line(`${k}${on}`, fs, fs.map((q) => Math.max(0, HC_EV_NM / (299792458 / (q * 1e14) * 1e9) - M.phi)), { color: MCOL[k], width: on ? 3 : 1.4 }); text(M.label, sq, Math.min(19, f(threshold(M.phi)) + 0.4), 0.15 + 0.3 * Object.keys(METALS).indexOf(k)); }
          sq.dots('q', [f(state.lam)], [K], { color: '--accent', size: 12 });
          tr.range([0.4, 3.6], [0, Math.max(E, m.phi) * 1.2]); tr.titles('', `energy (eV): photon hf = work function φ + K_max`);
          tr.stems('E', [1], [E], { color: '--c-E', width: 14 }); tr.stems('phi', [2], [m.phi], { color: '--c-ref', width: 14 }); tr.stems('K', [3], [K], { color: '--c-v', width: 14 });
          text('photon hf', tr, 1, Math.max(E, m.phi) * 1.12); text('φ', tr, 2, Math.max(E, m.phi) * 1.12); text('K_max', tr, 3, Math.max(E, m.phi) * 1.12);
          br.range([150, 800], [0, 1]); br.titles('wavelength (nm)', '');
          br.image('spec', null, 650, 1, { rgb: (k, out) => { const l = 150 + k; spectral(l, out); const on = Math.abs(l - state.lam) < 3 ? 1 : Object.values(METALS).some((M) => Math.abs(l - threshold(M.phi)) < 1.5) ? 0.9 : 0.35; out[0] *= on; out[1] *= on; out[2] *= on; } });
          text('▼ your light', null, br.mx(state.lam), BR[1] + BR[3] + 0.15);
          const ls = lin(150, 800, 300);
          plots.aux.draw({ xlim: [150, 800], cursor: state.lam, series: [{ x: ls, y: ls.map((l) => kmax(l, m.phi)), color: MCOL[state.metal], label: `${m.label}: K_max (eV) vs wavelength (nm): zero beyond ${fmt(threshold(m.phi))} nm` }] });
          hud.set('a', `λ = ${fmt(state.lam)} nm: each photon carries hc/λ = ${fmt(E)} eV`);
          hud.set('b', `${m.label}: φ = ${m.phi} eV, so K_max = ${fmt(K)} eV${K ? ` — electrons stopped by ${fmt(K)} V` : ' — no electrons, however bright the light'}`, K ? 'good' : 'bad');
          hud.set('c', `threshold: λ₀ = hc/φ = ${fmt(threshold(m.phi))} nm; brighter light means more photons, not more energy per electron`);
        } else if (c === 'box') {
          const L = state.L * 1e-9, a = Math.round(state.a), b = Math.round(state.b), Ea = boxEnergy(a, L), Eb = boxEnergy(b, L), Tsl = a === b ? Infinity : 4.135667696e-15 / Math.abs(Eb - Ea);
          const tt = a === b ? 0 : time.t / PLAY * 3 * Tsl, xs = lin(0, L, 241), D = xs.map((x) => density(a, b, x, L, tt) * L), dmax = 4.2;
          sq.range([-0.15, 1.15], [-0.3, dmax]); sq.titles('position x/L', 'probability density |Ψ|² (× L)');
          sq.line('wl', [0, 0], [-0.3, dmax], { color: '--ink', width: 4 }); sq.line('wr', [1, 1], [-0.3, dmax], { color: '--ink', width: 4 });
          sq.line('d', xs.map((x) => x / L), D, { color: '--c-B', width: 2.6 });
          const n5 = [1, 2, 3, 4, 5], Emax = boxEnergy(5, L);
          tr.range([0, 1], [0, Emax * 1.1]); tr.titles('', `energy levels Eₙ = n²h²/8mL² (eV), electron in ${fmt(state.L)} nm`);
          n5.forEach((n) => { const on = n === a || n === b; tr.line(`lv${n}${on}`, [0.1, 0.9], [boxEnergy(n, L), boxEnergy(n, L)], { color: on ? '--accent' : '--ink-dim', width: on ? 3 : 1.4 }); tr.hide(`lv${n}${!on}`); text(`n = ${n}: ${fmt(boxEnergy(n, L))} eV`, tr, 0.5, boxEnergy(n, L) + Emax * 0.05); });
          br.range([0, 1], [-1.6, 1.6]); br.titles('x/L', '');
          br.line('pa', xs.map((x) => x / L), xs.map((x) => psi(a, x, L) * Math.sqrt(L)), { color: '--c-v', width: 1.6 }); br.line('pb', xs.map((x) => x / L), xs.map((x) => psi(b, x, L) * Math.sqrt(L)), { color: '--c-I', width: 1.6 });
          const tsx = lin(0, 3 * (Number.isFinite(Tsl) ? Tsl : 1e-15), 200), mean = (t) => { let s = 0, w = 0; for (const x of xs) { const p = density(a, b, x, L, t); s += p * x; w += p; } return s / w / L; };
          plots.aux.draw({ xlim: [0, tsx.at(-1) * 1e15], cursor: tt * 1e15, ylim: [0, 1], series: [{ x: tsx.map((t) => t * 1e15), y: tsx.map(mean), color: '--c-B', label: 'average position ⟨x⟩/L vs time (fs)' }] });
          hud.set('a', `states ${a} and ${b}: E = ${fmt(Ea)} and ${fmt(Eb)} eV; ψ (bottom): ${a} and ${b} humps, green and orange`);
          hud.set('b', a === b ? 'a single stationary state: |ψ|² never changes, nothing moves' : `the two states beat: |Ψ|² sloshes with period h/ΔE = ${fmt(Tsl * 1e15)} fs (t = ${fmt(tt * 1e15)} fs)`);
          hud.set('c', `a jump ${Math.max(a, b)} → ${Math.min(a, b)} would emit a photon of ${fmt(Math.abs(Eb - Ea))} eV, λ = ${a === b ? '—' : fmt(HC_EV_NM / Math.abs(Eb - Ea))} nm`);
        } else {
          const [n1, name] = SERIES[state.series], up = Math.max(n1 + 1, Math.round(state.up)), lam = line(n1, up);
          sq.range([0, 1], [-14.5, 0.8]); sq.titles('', 'energy (eV): hydrogen levels Eₙ = −13.6 eV / n²');
          for (let n = 1; n <= 7; n++) { sq.line(`n${n}`, [0.1, 0.9], [level(n), level(n)], { color: '--ink-dim', width: 1.6 }); if (n <= 3) text(`n = ${n}: ${fmt(level(n))} eV`, sq, 0.75, level(n) + 0.35); }
          sq.line('ion', [0.1, 0.9], [0, 0], { color: '--c-ref', dashed: true, width: 1 }); text('n → ∞: 0 (ionised)', sq, 0.75, 0.4);
          for (let n = n1 + 1; n <= 7; n++) { const x = 0.15 + 0.07 * (n - n1); sq.line(`t${n}${n === up}`, [x, x], [level(n), level(n1)], { color: n === up ? '--accent' : '--c-E', width: n === up ? 3 : 1.4 }); sq.hide(`t${n}${n !== up}`); }
          for (let n = 2; n <= 7; n++) if (n <= n1) { sq.hide(`t${n}true`); sq.hide(`t${n}false`); }
          const lines = Array.from({ length: 7 - n1 }, (_, i) => line(n1, n1 + 1 + i)), lo = Math.min(...lines) * 0.92, hi = line(n1, n1 + 1) * 1.05;
          tr.range([lo, hi], [0, 1.1]); tr.titles('wavelength (nm)', `${name}: lines down to n = ${n1}, crowding towards the limit`);
          tr.stems('all', lines, lines.map(() => 1), { color: '--c-E', width: 2 }); tr.stems('sel', [lam], [1], { color: '--accent', width: 4 });
          br.range([380, 750], [0, 1]); br.titles('wavelength (nm)', '');
          br.image('spec', null, 370, 1, { rgb: (k, out) => { const l = 380 + k, on = [3, 4, 5, 6, 7].some((n) => Math.abs(l - line(2, n)) < 1.2); spectral(l, out); const s = on ? 1 : 0.06; out[0] *= s; out[1] *= s; out[2] *= s; } });
          text('visible: the Balmer lines of hydrogen', null, br.mx(565), BR[1] + BR[3] + 0.15);
          const ns = lin(n1 + 1, 12, 12 - n1);
          plots.aux.draw({ xlim: [n1 + 1, 12], cursor: up, series: [{ x: ns, y: ns.map((n) => line(n1, n)), color: '--c-E', label: `${name}: wavelength (nm) vs upper level n` }] });
          hud.set('a', `n = ${up} → ${n1}: photon energy ${fmt(level(up) - level(n1))} eV, λ = ${fmt(lam, 5)} nm (vacuum)`);
          hud.set('b', `1/λ = R_H (1/${n1}² − 1/${up}²), R_H = 1.0968·10⁷ /m; series limit (n → ∞) at ${fmt(1e9 * n1 * n1 / 10967758)} nm`);
          hud.set('c', state.series === 'balmer' ? 'the only series in the visible: red Hα 656, cyan Hβ 486, violet Hγ 434, Hδ 410 nm' : state.series === 'lyman' ? 'all in the ultraviolet: the jumps to the ground state are the biggest' : 'all in the infrared: small jumps, long wavelengths');
        }
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
