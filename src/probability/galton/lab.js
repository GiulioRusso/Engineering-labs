// Probability: balls falling through a Galton board pile up into the binomial, then the normal curve;
// sums of dice do the same (central limit theorem).
import * as THREE from 'three';
import { createCurve } from '../../lib/viz/curve.js';
import { binomialPmf, normalPdf, galton, dicePmf, diceSums } from './model.js';

const TOP = 2.6, ROW_T = 0.07, RELEASE = 10, HMAX = 1.9, FLOOR = -1.9; // board top, s per row, s to release all, bar height
const MAXB = 1000;

export default {
  id: 'probability', title: 'Probability', size: 2.6, plain: true, cam: 'front', loop: false,
  cameras: { front: { pos: [0, -9, 0.4], target: [0, 0, 0.4] }, side: { pos: [9, 0, 0.4], target: [0, 0, 0.4] }, top: { pos: [0, -0.01, 9], target: [0, 0, 0] }, iso: { pos: [4.5, -7.5, 3], target: [0, 0, 0.4] } },
  defaults: { kind: 'galton', n: 10, p: 0.5, M: 500, k: 2, normal: true },
  cases: [
    { id: 'galton', label: 'Galton board', set: {}, examples: [
      { id: 'few', label: '4 rows: a coarse binomial', set: { n: 4 } },
      { id: 'biased', label: 'Biased pegs: p = 0.7', set: { p: 0.7 } },
      { id: 'many', label: '24 rows: the normal curve', set: { n: 24, M: 1000 } },
      { id: 'fewballs', label: 'Only 50 balls: noisy', set: { M: 50 } },
    ] },
    { id: 'dice', label: 'Sum of dice', set: { kind: 'dice', M: 1000 }, examples: [
      { id: 'one', label: 'One die: flat', set: { k: 1 } },
      { id: 'three', label: 'Three dice: already a bell', set: { k: 3 } },
      { id: 'ten', label: 'Ten dice: normal', set: { k: 10 } },
    ] },
  ],
  controls: [
    { title: 'Experiment', items: [
      { id: 'n', label: 'Rows of pegs', unit: '', min: 1, max: 30, step: 1, show: (s) => s.kind === 'galton' },
      { id: 'p', label: 'P(bounce right)', unit: '', min: 0.05, max: 0.95, step: 0.01, show: (s) => s.kind === 'galton' },
      { id: 'k', label: 'Dice', unit: '', min: 1, max: 12, step: 1, show: (s) => s.kind === 'dice' },
      { id: 'M', label: 'Trials', unit: '', min: 10, max: MAXB, step: 1, log: true },
    ] },
  ],
  display: [{ title: 'Show', items: [{ id: 'normal', label: 'Normal curve', type: 'check', color: '--c-E' }] }],
  plots: [{ id: 'hist', title: 'Frequency against probability', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'done', label: 'trials so far' }, { id: 'mean', label: 'mean' }, { id: 'sd', label: 'std deviation' }, 'sep', { id: 'chk', label: '' }],

  setup(ctx) {
    const { scene, state, time, hud, plots } = ctx;
    const mat = (c) => new THREE.MeshStandardMaterial({ roughness: 0.5, color: c });
    const pegs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), mat(), 500); scene.add(pegs);
    const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 10), mat(), MAXB); balls.frustumCulled = false; scene.add(balls);
    const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat(), 80); scene.add(bars);
    const curve = createCurve(ctx.stage, { max: 300, width: 2.4, color: '--c-E' });
    const floor = createCurve(ctx.stage, { max: 1, width: 1.4, color: '--ink-dim' });
    const labels = []; for (let i = 0; i < 14; i++) { const l = ctx.label('', 'tick'); scene.add(l); labels.push(l); }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    let B = null, K = [], P = [], lo = 0, s = 0.3, dz = 0.2, D = 1, hk = 1;

    function configure() {
      const g = state.kind === 'galton';
      if (g) {
        B = galton(state.n, state.p, state.M); K = B.map((b) => b.reduce((a, c) => a + c, 0)); P = binomialPmf(state.n, state.p); lo = 0;
        s = Math.min(0.34, 7 / (state.n + 1)); dz = Math.min(0.2, (TOP - 0.3) / state.n);
      } else { K = diceSums(state.k, state.M); P = dicePmf(state.k); lo = state.k; s = Math.min(0.34, 7.5 / P.length); }
      hk = HMAX / (Math.max(...P) * state.M); // bar height per ball: the expected peak reaches HMAX
      // pegs
      let c = 0;
      if (g) for (let j = 0; j < state.n; j++) for (let i = 0; i <= j; i++) { m4.compose(v.set((i - j / 2) * s, 0, TOP - j * dz), q, sc.setScalar(Math.min(0.05, s * 0.15))); pegs.setMatrixAt(c++, m4); }
      pegs.count = c; pegs.instanceMatrix.needsUpdate = true;
      floor.segments([-(P.length / 2 + 0.5) * s, 0, FLOOR, (P.length / 2 + 0.5) * s, 0, FLOOR]);
      const every = Math.max(1, Math.ceil(P.length / 12));
      labels.forEach((l, i) => { const j = i * every; l.visible = j < P.length; if (l.visible) { l.element.textContent = String(lo + j); l.position.set(X(j), 0, FLOOR - 0.18); } });
      // normal curve with the same mean and spread, scaled like the bars
      const mu = g ? state.n * state.p : 3.5 * state.k, sd = g ? Math.sqrt(state.n * state.p * (1 - state.p)) : Math.sqrt(state.k * 35 / 12), pts = [];
      for (let i = 0; i <= 200; i++) { const x = lo - 0.5 + (P.length) * i / 200; pts.push(X(x - lo), -0.2, FLOOR + normalPdf(x, mu, sd) * state.M * hk); }
      curve.set(pts);
      D = (g ? RELEASE + state.n * ROW_T + 0.4 : RELEASE) + 0.5; ctx.setDuration(D);
    }
    const X = (j) => (j - (P.length - 1) / 2) * s;

    return {
      changed() { configure(); },
      update() {
        const t = time.t, g = state.kind === 'galton', dt0 = RELEASE / state.M, r = Math.min(0.06, s * 0.22);
        const counts = new Array(P.length).fill(0); let flying = 0, landed = 0;
        for (let i = 0; i < state.M; i++) {
          const age = t - i * dt0;
          if (age < 0) break;
          const fall = g ? age / ROW_T : Infinity;
          if (fall >= (g ? state.n + 1 : 0)) { counts[K[i] - lo]++; landed++; continue; }
          // in flight on the board: row j, then a short drop to the bins
          const j = Math.floor(fall), u = fall - j, ks = B[i].slice(0, Math.min(j, state.n)).reduce((a, c) => a + c, 0);
          let x, z;
          if (j < state.n) { const x0 = (ks - j / 2) * s, x1 = x0 + (B[i][j] - 0.5) * s; x = x0 + (x1 - x0) * u; z = TOP - j * dz + 0.08 - dz * u + 0.08 * Math.sin(Math.PI * u); }
          else { x = (ks - state.n / 2) * s; z = TOP - state.n * dz - (TOP - state.n * dz - FLOOR) * u; }
          m4.compose(v.set(x, -0.05, z), q, sc.setScalar(r)); balls.setMatrixAt(flying++, m4);
        }
        balls.count = flying; balls.instanceMatrix.needsUpdate = true;
        counts.forEach((c, j) => { const h = Math.max(0.001, c * hk); m4.compose(v.set(X(j), 0, FLOOR + h / 2), q, sc.set(s * 0.82, 0.25, h)); bars.setMatrixAt(j, m4); });
        bars.count = P.length; bars.instanceMatrix.needsUpdate = true;
        curve.object.visible = state.normal;
        const done = K.slice(0, landed), mean = done.reduce((a, b) => a + b, 0) / (done.length || 1), sd = Math.sqrt(done.reduce((a, b) => a + (b - mean) ** 2, 0) / (done.length || 1));
        const mu = g ? state.n * state.p : 3.5 * state.k, sdx = g ? Math.sqrt(state.n * state.p * (1 - state.p)) : Math.sqrt(state.k * 35 / 12);
        hud.set('done', `${landed} / ${state.M}`); hud.set('mean', `${mean.toFixed(3)} (theory ${mu.toFixed(3)})`); hud.set('sd', `${sd.toFixed(3)} (theory ${sdx.toFixed(3)})`);
        const se = sdx / Math.sqrt(landed || 1), ok = landed > 0 && Math.abs(mean - mu) < 3 * se;
        hud.set('chk', landed ? `|mean − theory| = ${Math.abs(mean - mu).toFixed(3)} ${ok ? '< 3σ/√N ✓' : ''}` : '', ok ? 'good' : '');
        const xs = P.map((_, j) => lo + j);
        plots.hist.draw({ xlim: [lo - 0.5, lo + P.length - 0.5], series: [{ x: xs, y: counts.map((c) => c / (landed || 1)), color: '--c-B', label: 'frequency' }, { x: xs, y: P, color: '--c-E', dash: [4, 3], label: g ? 'binomial' : 'exact' }] });
      },
      theme() {
        pegs.material.color.set(ctx.cssVar('--c-ref')); balls.material.color.set(ctx.cssVar('--c-I')); bars.material.color.set(ctx.cssVar('--c-B'));
        curve.theme(); floor.theme();
      },
    };
  },
};
