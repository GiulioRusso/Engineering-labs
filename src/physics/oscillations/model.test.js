import { simulate, energy, period, steadyAmplitude, measuredPeriod, omega0 } from './model.js';
import { near, ok } from '../../lib/testing.js';

const spring = { kind: 'spring', m: 1, k: 10, x0: 0.3, gamma: 0, F0: 0, wd: 0 };

export const tests = {
  'spring: measured period = 2π√(m/k), energy conserved'() {
    const r = simulate(spring, 20);
    near(measuredPeriod(r), 2 * Math.PI * Math.sqrt(spring.m / spring.k), 1e-5, 'period');
    const E0 = energy(spring, r.q[0], r.v[0]), n = r.q.length - 1, E1 = energy(spring, r.q[n], r.v[n]);
    near(E1.K + E1.U, E0.K + E0.U, 1e-9, 'energy');
  },
  'pendulum: large-amplitude period matches the AGM formula; small angle → 2π√(L/g)'() {
    const s = { kind: 'pendulum', m: 1, L: 1, th0: 2, gamma: 0, F0: 0, wd: 0 };
    near(measuredPeriod(simulate(s, 30)), period(s), 1e-5, 'θ₀ = 2 rad');
    near(period({ ...s, th0: 1e-4 }), 2 * Math.PI * Math.sqrt(1 / 9.81), 1e-8, 'small angle');
    ok(period(s) > 1.3 * period({ ...s, th0: 0.01 }), 'big swings are slower');
  },
  'damping: amplitude envelope decays as e^(−γt)'() {
    const s = { ...spring, gamma: 0.2 }, r = simulate(s, 15);
    const peak = (a, b) => { let m = 0; for (let i = 0; i < r.t.length; i++) if (r.t[i] >= a && r.t[i] < b) m = Math.max(m, Math.abs(r.q[i])); return m; };
    const w = Math.sqrt(omega0(s) ** 2 - 0.04), T = 2 * Math.PI / w;
    near(peak(10, 10 + T) / peak(0, T), Math.exp(-0.2 * 10), 0.02, 'envelope ratio over 10 s');
  },
  'driven: steady-state amplitude matches the resonance formula'() {
    for (const wd of [2, Math.sqrt(10), 6]) {
      const s = { ...spring, x0: 0, gamma: 0.3, F0: 1, wd }, r = simulate(s, 60);
      let a = 0; for (let i = 0; i < r.t.length; i++) if (r.t[i] > 45) a = Math.max(a, Math.abs(r.q[i]));
      near(a, steadyAmplitude(Math.sqrt(10), 0.3, 1, wd), 2e-3, `ω_d = ${wd.toFixed(2)}`);
    }
  },
};
