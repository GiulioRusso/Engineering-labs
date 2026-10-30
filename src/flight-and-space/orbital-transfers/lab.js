// Orbital transfers: Hohmann and bi-elliptic missions flown in time, Δv budgets, the rocket equation.
import * as THREE from 'three';
import { createCurve } from '../../lib/viz/curve.js';
import { createVector } from '../../lib/viz/vector.js';
import { si } from '../../lib/ui/format.js';
import { solveKepler, MU, RE } from '../orbits/model.js';
import { hohmann, bielliptic, propellant } from './model.js';

const km = 1e3;

// Position on an ellipse (periapsis rp along +x rotated by phase, apoapsis ra) at time τ since periapsis.
function onEllipse(rp, ra, tau, phase = 0) {
  const a = (rp + ra) / 2, e = (ra - rp) / (ra + rp), n = Math.sqrt(MU / a ** 3), E = solveKepler(((n * tau) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI), e);
  const x = a * (Math.cos(E) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(E), c = Math.cos(phase), s = Math.sin(phase);
  return [c * x - s * y, s * x + c * y];
}

export default {
  id: 'orbital-transfers', title: 'Orbital transfers and staging', size: 2.4, cam: 'top',
  cameras: { front: { pos: [0, -6.5, 1.2] }, side: { pos: [6.5, 0, 1.2] }, top: { pos: [0, -0.01, 6.8] }, iso: { pos: [3.6, -4.4, 3.4] } },
  defaults: { kind: 'hohmann', h1: 300 * km, r2: 42164 * km, rb: 3e8, isp: 320, dry: 1000 },
  cases: [
    { id: 'transfer', label: 'Transfer', set: { kind: 'hohmann' }, examples: [
      { id: 'small', label: 'A small hop', set: { r2: 10000 * km } },
      { id: 'moon', label: 'Out to the Moon’s distance', set: { r2: 384400 * km } },
      { id: 'far', label: 'A far target: r₂/r₁ = 15', set: { r2: 15 * (RE + 300 * km) } },
      { id: 'bi', label: 'Same target, bi-elliptic', controls: ['kind', 'rb'], set: { kind: 'bielliptic', r2: 15 * (RE + 300 * km), rb: 6e8 } },
      { id: 'bi-geo', label: 'Bi-elliptic to GEO: not worth it', controls: ['kind', 'rb'], set: { kind: 'bielliptic', rb: 1.2e8 } },
      { id: 'hydrogen', label: 'Hydrogen engine', set: { isp: 450 } },
    ] },
  ],
  controls: [
    { title: 'Mission', items: [
      { id: 'kind', label: 'Route', type: 'segmented', options: [['hohmann', 'Hohmann'], ['bielliptic', 'Bi-elliptic']] },
      { id: 'h1', label: 'Start altitude', unit: 'km', k: 1e-3, min: 200 * km, max: 2000 * km, log: true },
      { id: 'r2', label: 'Target radius', unit: 'km', k: 1e-3, min: 8000 * km, max: 400000 * km, log: true, hint: 'GEO 42 164 km' },
      { id: 'rb', label: 'Apoapsis r_b', unit: 'km', k: 1e-3, min: 5e7, max: 1.5e9, log: true, show: (s) => s.kind === 'bielliptic' },
    ] },
    { title: 'Rocket', items: [
      { id: 'isp', label: 'I_sp', unit: 's', min: 200, max: 460, step: 1 },
      { id: 'dry', label: 'Dry mass', unit: 'kg', min: 100, max: 20000, log: true },
    ] },
  ],
  plots: [{ id: 'dv', title: 'Total Δv against r₂/r₁', xLabel: 'r₂/r₁', xUnit: '', yUnit: 'm/s' }, { id: 'rocket', title: 'Rocket equation', xLabel: 'Δv', xUnit: 'm/s', yUnit: 'kg' }],
  hud: [{ id: 'b1', label: 'burn 1' }, { id: 'b2', label: 'burn 2' }, { id: 'b3', label: 'burn 3' }, { id: 'tot', label: 'total Δv' }, { id: 'tof', label: 'time of flight' }, 'sep', { id: 'prop', label: 'propellant needed' }],

  setup(ctx) {
    const { scene, state, time, hud, plots, stage } = ctx;
    stage.grid.visible = false; stage.axes.visible = false;
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ roughness: 0.8 })); scene.add(earth);
    const o1 = createCurve(stage, { max: 200, width: 1.6, color: '--c-ref', dashed: true }), o2 = createCurve(stage, { max: 200, width: 1.6, color: '--c-ref', dashed: true });
    const arcs = [createCurve(stage, { max: 200, width: 2.6, color: '--c-B' }), createCurve(stage, { max: 200, width: 2.6, color: '--c-B' })];
    const trail = createCurve(stage, { max: 3000, width: 2.2, color: '--c-I' });
    const ship = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshStandardMaterial({ roughness: 0.3 })); scene.add(ship);
    const burns = [0, 1, 2].map((k) => createVector(scene, '--c-F', `Δv${'₁₂₃'[k]}`, { radius: 0.012 }));
    let plan = null, S = 1, legs = [];

    function configure() {
      const r1 = RE + state.h1, r2 = Math.max(state.r2, r1 * 1.05), rb = Math.max(state.rb, r2 * 1.01);
      plan = state.kind === 'hohmann' ? hohmann(r1, r2) : bielliptic(r1, r2, rb);
      S = 2.2 / Math.max(r2, state.kind === 'bielliptic' ? rb : r2);
      earth.scale.setScalar(Math.max(RE * S, 0.02));
      const circ = (r) => { const p = []; for (let k = 0; k <= 128; k++) { const a = 2 * Math.PI * k / 128; p.push(r * S * Math.cos(a), r * S * Math.sin(a), 0); } return p; };
      o1.set(circ(r1)); o2.set(circ(r2));
      const T1 = 2 * Math.PI * Math.sqrt(r1 ** 3 / MU), T2 = 2 * Math.PI * Math.sqrt(r2 ** 3 / MU);
      // legs: coast on r1 → arc(s) → coast on r2
      legs = [{ kind: 'circle', r: r1, from: -Math.PI / 2, dur: T1 / 4 }];
      plan.arcs.forEach((a, k) => {
        const half = Math.PI * Math.sqrt(((a.rp + a.ra) / 2) ** 3 / MU);
        legs.push({ kind: 'arc', rp: a.rp, ra: a.ra, phase: k ? Math.PI : 0, start: k ? half : 0, dur: half, outbound: k === 0 });
      });
      legs.push({ kind: 'circle', r: r2, from: state.kind === 'hohmann' ? Math.PI : 0, dur: Math.min(T2 / 2, plan.tof * 0.6) });
      plan.arcs.forEach((a, k) => {
        const pts = []; const half = Math.PI * Math.sqrt(((a.rp + a.ra) / 2) ** 3 / MU);
        for (let j = 0; j <= 160; j++) { const p = onEllipse(a.rp, a.ra, (k ? half : 0) + half * j / 160, k ? Math.PI : 0); pts.push(p[0] * S, p[1] * S, 0); }
        arcs[k].set(pts);
      });
      arcs[1].object.visible = plan.arcs.length > 1;
      const total = legs.reduce((a, l) => a + l.dur, 0);
      ctx.setDuration(total); time.scale = total / 14;
    }
    function where(t) {
      let acc = 0;
      for (const l of legs) {
        if (t <= acc + l.dur || l === legs[legs.length - 1]) {
          const u = Math.min(t - acc, l.dur);
          if (l.kind === 'circle') { const w = Math.sqrt(MU / l.r ** 3), a = l.from + w * u; return [l.r * Math.cos(a), l.r * Math.sin(a)]; }
          return onEllipse(l.rp, l.ra, l.start + u, l.phase);
        }
        acc += l.dur;
      }
      return [0, 0];
    }

    return {
      changed() { configure(); },
      update() {
        const t = time.t, p = where(t);
        ship.position.set(p[0] * S, p[1] * S, 0.01);
        const tr = []; for (let k = 0; k <= 400; k++) { const q = where(t * k / 400); tr.push(q[0] * S, q[1] * S, 0.005); }
        trail.set(tr);
        // burn markers at the leg boundaries, tangential, length ∝ Δv
        let acc = 0;
        burns.forEach((b) => b.set([0, 0, 0], [1, 0, 0], 0));
        plan.dv.forEach((dv, k) => {
          acc += legs[k].dur; const q = where(acc), r = Math.hypot(...q), tang = [-q[1] / r * Math.sign(dv), q[0] / r * Math.sign(dv), 0];
          burns[k].set([q[0] * S, q[1] * S, 0.02], tang, t >= acc - 1e-6 ? 0.08 + Math.abs(dv) / 4000 * 0.4 : 0);
        });
        const mp = propellant(plan.total, state.isp, state.dry);
        hud.set('b1', si(plan.dv[0], 'm/s')); hud.set('b2', si(plan.dv[1], 'm/s')); hud.show('b3', plan.dv.length > 2); if (plan.dv.length > 2) hud.set('b3', si(plan.dv[2], 'm/s'));
        hud.set('tot', si(plan.total, 'm/s')); hud.set('tof', plan.tof > 86400 ? `${(plan.tof / 86400).toFixed(1)} days` : `${(plan.tof / 3600).toFixed(2)} h`);
        hud.set('prop', `${si(mp, 'kg')} (${(100 * mp / (mp + state.dry)).toFixed(0)} % of launch mass)`);
        const r1 = RE + state.h1, xs = [], H = [], B = [];
        for (let i = 0; i <= 200; i++) { const q = 1.2 + 23.8 * i / 200; xs.push(q); H.push(hohmann(r1, q * r1).total); B.push(bielliptic(r1, q * r1, Math.max(state.rb, q * r1 * 1.01)).total); }
        plots.dv.draw({ xlim: [1.2, 25], cursor: state.r2 / r1, series: [{ x: xs, y: H, color: '--c-B', label: 'Hohmann' }, { x: xs, y: B, color: '--c-E', dash: [4, 3], label: `bi-elliptic, r_b = ${si(state.rb, 'm', 2)}` }] });
        const dvs = [], ms = []; for (let i = 0; i <= 100; i++) { const d = 8000 * i / 100; dvs.push(d); ms.push(propellant(d, state.isp, state.dry)); }
        plots.rocket.draw({ xlim: [0, 8000], markers: [{ x: plan.total, y: mp, color: '--accent' }], series: [{ x: dvs, y: ms, color: '--c-F', label: `propellant for ${si(state.dry, 'kg')} dry, I_sp ${state.isp} s` }] });
      },
      theme() { for (const c of [o1, o2, ...arcs, trail]) c.theme(); for (const b of burns) b.theme(); earth.material.color.set(ctx.cssVar('--c-B')); ship.material.color.set(ctx.cssVar('--c-I')); },
    };
  },
};
