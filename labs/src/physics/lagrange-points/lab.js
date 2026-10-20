// Lagrange points: the rotating-frame potential as a surface, five equilibria, test-body trajectories.
import * as THREE from 'three';
import { createSurface } from '../../lib/viz/surface.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createDots } from '../../lib/viz/graph2d.js';
import { si } from '../../lib/ui/format.js';
import { omega, lagrangePoints, integrate, jacobi, ROUTH, SYSTEMS } from './model.js';

const R = 1.6, ZS = 0.35, CAP = 2.2;

export default {
  id: 'lagrange-points', title: 'Lagrange points', size: 1.6,
  cameras: { front: { pos: [0, -4.5, 1.6] }, side: { pos: [4.5, 0, 1.6] }, top: { pos: [0, -0.01, 4.6] }, iso: { pos: [2.6, -3.4, 2.6] } },
  defaults: { system: 'earth-moon', mu: 0.012150585, start: 'L4', dx: 0.01, dy: 0, surface: true, contours: true },
  scenarios: [
    { id: 'l4', label: 'Earth–Moon L4', hint: 'A nudged body circles L4: stable.', set: {} },
    { id: 'l1', label: 'Earth–Moon L1', hint: 'A saddle: the body drifts away.', set: { start: 'L1', dx: 0.002 } },
    { id: 'trojan', label: 'Jupiter Trojans', hint: 'Asteroids trapped at the Sun–Jupiter L4.', set: { system: 'sun-jupiter', mu: 9.5388e-4, dx: 0.02 } },
    { id: 'routh', label: 'Too heavy: μ = 0.06', hint: 'Beyond the Routh limit L4 is unstable.', set: { system: 'custom', mu: 0.06, dx: 0.005 } },
  ],
  controls: [
    { title: 'Two bodies', items: [
      { id: 'system', label: 'System', type: 'select', options: [...Object.entries(SYSTEMS).map(([k, v]) => [k, v.label]), ['custom', 'Custom mass ratio']] },
      { id: 'mu', label: 'Mass ratio μ = m₂/(m₁ + m₂)', unit: '', min: 1e-6, max: 0.5, log: true, show: (s) => s.system === 'custom', hint: 'L4 stays stable below 0.0385.' },
    ] },
    { title: 'Test body', items: [
      { id: 'start', label: 'Start near', type: 'segmented', options: ['L1', 'L2', 'L3', 'L4', 'L5'].map((k) => [k, k]) },
      { id: 'dx', label: 'Nudge in x', unit: 'a', min: -0.05, max: 0.05, step: 0.0005, hint: 'In units of the separation a.' },
      { id: 'dy', label: 'Nudge in y', unit: 'a', min: -0.05, max: 0.05, step: 0.0005 },
    ] },
  ],
  display: [{ title: 'Show', items: [
    { id: 'surface', label: 'Potential surface', type: 'check' },
    { id: 'contours', label: 'Contours', type: 'check' },
  ] }],
  plots: [{ id: 'dist', title: 'Distance from the starting point', xLabel: 't', xUnit: 'orbits', yUnit: '' }, { id: 'jac', title: 'Jacobi constant drift', xLabel: 't', xUnit: 'orbits', yUnit: '' }],
  hud: [{ id: 'mu', label: 'μ' }, { id: 'L', label: 'L-point (x, y)' }, { id: 'phys', label: 'distance' }, 'sep', { id: 'stab', label: 'linear stability' }, { id: 'C', label: 'Jacobi ΔC' }],

  setup(ctx) {
    const { scene, state, time, hud, plots, stage } = ctx;
    stage.grid.visible = false; stage.axes.visible = false;
    const surf = createSurface(scene, { nx: 150, ny: 150, x: [-R, R], y: [-R, R], opacity: 0.88 });
    const cont = createCurve(stage, { max: 12000, width: 1.1, color: '--ink', opacity: 0.45 });
    const trail = createCurve(stage, { max: 30001, width: 2.4, color: '--c-I' });
    const bodies = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ roughness: 0.5 })); const l = ctx.label(''); m.add(l); l.position.set(0, 0, 2.5); scene.add(m); return { m, l }; });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), new THREE.MeshStandardMaterial({ roughness: 0.4 })); scene.add(ball);
    const dots = createDots(scene, 5, { r: 0.025, color: '--accent' });
    let mu = 0.012, L = null, run = null, key = '';
    const height = (x, y) => -Math.min(omega(mu, x, y).W, CAP); // −Ω: hills at L4/L5, wells at the bodies
    const zOf = (x, y) => (height(x, y) + 1.6) * ZS;

    function rebuild() {
      mu = state.system === 'custom' ? state.mu : SYSTEMS[state.system].mu;
      L = lagrangePoints(mu);
      const k = `${mu}`;
      if (k !== key) {
        key = k;
        surf.set((x, y) => (height(x, y) + 1.6) * ZS, { map: 'viridis' });
        const lv = []; for (let i = 0; i < 26; i++) lv.push((-CAP + 1.6 + (CAP - 1.4) * i / 25) * ZS);
        cont.segments(surf.contours(lv, { lift: 0.003 }));
      }
      const p = L[state.start];
      run = integrate(mu, [p[0] + state.dx, p[1] + state.dy, 0, 0], { tEnd: 12 * Math.PI * 2 });
      ctx.setDuration(run.t[run.t.length - 1]);
      time.scale = 2 * Math.PI / 6; // one orbit of the primaries every 6 s
    }

    return {
      changed() { rebuild(); },
      update() {
        surf.mesh.visible = state.surface; cont.object.visible = state.contours && state.surface;
        const i = Math.min(run.t.length - 1, Math.round(time.t / 2e-3)), s = run.s[i];
        const pts = []; for (let j = 0; j <= i; j += 4) { const q = run.s[j]; pts.push(q[0], q[1], zOf(q[0], q[1]) + 0.012); }
        trail.set(pts); ball.position.set(s[0], s[1], zOf(s[0], s[1]) + 0.025);
        const sys = SYSTEMS[state.system] || { names: ['m₁', 'm₂'], a: 1 };
        // the two bodies sit at the bottom of their (capped) wells
        [[-mu, 0], [1 - mu, 0]].forEach(([x, y], k) => { const b = bodies[k]; b.m.position.set(x, y, (1.6 - CAP) * ZS); b.m.scale.setScalar(k ? 0.03 + 0.05 * Math.cbrt(mu) : 0.07); b.l.element.textContent = sys.names[k]; });
        dots.set(Object.entries(L).map(([k, [x, y]]) => ({ p: [x, y, zOf(x, y) + 0.03], text: k })));
        const p = L[state.start], d0 = run.s.map((q) => Math.hypot(q[0] - p[0], q[1] - p[1])), C0 = jacobi(mu, run.s[0]);
        hud.set('mu', mu.toPrecision(4)); hud.set('L', `${state.start} (${p[0].toFixed(4)}, ${p[1].toFixed(4)})`);
        hud.set('phys', state.system === 'custom' ? '—' : `${si(Math.hypot(p[0] - 1 + mu, p[1]) * sys.a, 'm')} from ${sys.names[1]}`);
        const st = state.start === 'L4' || state.start === 'L5' ? (mu < ROUTH ? 'stable (μ < 0.0385)' : 'unstable (μ > 0.0385)') : 'unstable saddle';
        hud.set('stab', st, st.startsWith('stable') ? 'good' : 'bad');
        hud.set('C', (jacobi(mu, s) - C0).toExponential(1), 'good');
        const T = [], D = [], J = []; for (let j = 0; j < run.t.length; j += 20) { T.push(run.t[j] / (2 * Math.PI)); D.push(d0[j]); J.push(jacobi(mu, run.s[j]) - C0); }
        plots.dist.draw({ xlim: [0, T[T.length - 1] || 1], cursor: time.t / (2 * Math.PI), series: [{ x: T, y: D, color: '--c-I', label: 'distance [a]' }] });
        plots.jac.draw({ xlim: [0, T[T.length - 1] || 1], cursor: time.t / (2 * Math.PI), series: [{ x: T, y: J, color: '--c-v', label: 'C − C₀ (RK4 error)' }] });
      },
      theme() { cont.theme(); trail.theme(); dots.theme(); bodies[0].m.material.color.set(ctx.cssVar('--c-E')); bodies[1].m.material.color.set(ctx.cssVar('--c-ref')); ball.material.color.set(ctx.cssVar('--c-I')); },
    };
  },
};
