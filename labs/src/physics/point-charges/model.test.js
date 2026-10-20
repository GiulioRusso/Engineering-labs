import { field, gaussFlux, KC, EPS0 } from './model.js';
import { near } from '../../lib/testing.js';

const e = [0, 0, 0];
export const tests = {
  "Coulomb: |E| = q/(4πε₀r²), V = q/(4πε₀r)"() {
    const V = field([{ q: 2e-9, x: 0, y: 0, z: 0 }], 0.3, 0, 0, e);
    near(e[0], KC * 2e-9 / 0.09, 1e-12, 'E'); near(V, KC * 2e-9 / 0.3, 1e-12, 'V');
  },
  "Gauss: flux through a sphere = enclosed charge / ε₀ (outside charges contribute nothing)"() {
    const C = [{ q: 3e-9, x: 0.05, y: 0, z: 0.02 }, { q: -1e-9, x: 0.4, y: 0, z: 0 }];
    const err = near(gaussFlux(C, 0, 0, 0, 0.2), 3e-9 / EPS0, 2e-4, 'flux');
    return `error ${(err * 100).toFixed(3)} %`;
  },
  'E = −∇V and the circulation of E around a loop is zero'() {
    const C = [{ q: 1e-9, x: -0.1, y: 0, z: 0 }, { q: -2e-9, x: 0.15, y: 0.05, z: -0.05 }], h = 1e-6, p = [0.05, 0.1, 0.12];
    field(C, ...p, e); const E = [...e];
    const V = (x, y, z) => field(C, x, y, z, [0, 0, 0]);
    near(E[0], -(V(p[0] + h, p[1], p[2]) - V(p[0] - h, p[1], p[2])) / (2 * h), 1e-6, 'Ex');
    near(E[2], -(V(p[0], p[1], p[2] + h) - V(p[0], p[1], p[2] - h)) / (2 * h), 1e-6, 'Ez');
    let circ = 0, n = 400; const r = 0.08;
    for (let k = 0; k < n; k++) { const a = 2 * Math.PI * (k + 0.5) / n; field(C, r * Math.cos(a), 0.02, r * Math.sin(a), e); circ += (-e[0] * Math.sin(a) + e[2] * Math.cos(a)) * r * 2 * Math.PI / n; }
    near(1 + circ / (Math.hypot(...E) * r), 1, 1e-9, '∮E·dl');
  },
};
