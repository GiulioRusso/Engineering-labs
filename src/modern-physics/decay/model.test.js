import { lambda, nuclei, census, exactA, exactB } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'Bateman formula = RK4 integration of dN_A/dt = −λ_A N_A, dN_B/dt = λ_A N_A − λ_B N_B'() {
    const la = lambda(3), lb = lambda(1), h = 1e-3; let A = 1000, B = 0;
    const f = (a, b) => [-la * a, la * a - lb * b];
    for (let n = 0; n < 8000; n++) {
      const k1 = f(A, B), k2 = f(A + k1[0] * h / 2, B + k1[1] * h / 2), k3 = f(A + k2[0] * h / 2, B + k2[1] * h / 2), k4 = f(A + k3[0] * h, B + k3[1] * h);
      A += (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) * h / 6; B += (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) * h / 6;
    }
    near(A, exactA(1000, la, 8), 1e-8, 'N_A'); near(B, exactB(1000, la, lb, 8), 1e-8, 'N_B');
  },
  'Monte Carlo: after one half-life about half are left (within 3σ = 3√(N/4))'() {
    for (const seed of [1, 2, 3]) {
      const n = census(nuclei(10000, 2, 0, seed), 2).a;
      ok(Math.abs(n - 5000) < 3 * 50, `seed ${seed}: ${n} left`);
    }
  },
  'chain: a long-lived parent and a short-lived daughter reach secular equilibrium, λ_B N_B = λ_A N_A'() {
    const la = lambda(1000), lb = lambda(1);
    const r = lb * exactB(1, la, lb, 30) / (la * exactA(1, la, 30));
    near(r, lb / (lb - la), 1e-9, 'activity ratio'); ok(Math.abs(r - 1) < 2e-3, 'close to 1 when λ_A ≪ λ_B');
    const la2 = lambda(4), lb2 = lambda(1.5), t = 80; // transient equilibrium: ratio λ_B/(λ_B − λ_A)
    near(lb2 * exactB(1, la2, lb2, t) / (la2 * exactA(1, la2, t)), lb2 / (lb2 - la2), 1e-6, 'transient');
  },
};
