import { stiffness, modes, motion, velocity, energy, modeEnergy } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'two masses: ω₁ = √(k/m) (together), ω₂ = √((k + 2κ)/m) (opposite)'() {
    const M = modes(2, 10, 2, 1);
    near(M.w[0], Math.sqrt(10), 1e-12, 'ω₁'); near(M.w[1], Math.sqrt(14), 1e-12, 'ω₂');
    ok(M.shape[0][0] * M.shape[0][1] > 0 && M.shape[1][0] * M.shape[1][1] < 0, 'in phase, then opposite');
  },
  'chain of 8 (k = κ): ωₙ = 2√(κ/m) sin(nπ / 2(N + 1))'() {
    const N = 8, M = modes(N, 10, 10, 1);
    M.w.forEach((w, i) => near(w, 2 * Math.sqrt(10) * Math.sin((i + 1) * Math.PI / (2 * (N + 1))), 1e-10, `n = ${i + 1}`));
  },
  'one mass pulled: x₁ = A/2 (cos ω₁t + cos ω₂t), x₂ = A/2 (cos ω₁t − cos ω₂t) — the beats'() {
    const M = modes(2, 10, 2, 1), w1 = Math.sqrt(10), w2 = Math.sqrt(14);
    for (const t of [0.3, 2.7, 5.4, 11]) {
      const x = motion(M, [0.3, 0], t);
      near(x[0] + 1, 1 + 0.15 * (Math.cos(w1 * t) + Math.cos(w2 * t)), 1e-12, `x₁(${t})`);
      near(x[1] + 1, 1 + 0.15 * (Math.cos(w1 * t) - Math.cos(w2 * t)), 1e-12, `x₂(${t})`);
    }
  },
  'energy stays constant and equals the sum of the mode energies'() {
    const N = 8, K = stiffness(N, 10, 10), M = modes(N, 10, 10, 1), x0 = [0.3, 0, 0, 0, 0, 0, 0, 0], E0 = energy(K, 1, x0, new Float64Array(N));
    near(modeEnergy(M, x0, 1).reduce((a, b) => a + b), E0, 1e-12, 'mode sum');
    for (const t of [0.5, 3, 17]) near(energy(K, 1, motion(M, x0, t), velocity(M, x0, t)), E0, 1e-12, `t = ${t}`);
  },
};
