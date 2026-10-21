import { rc, rcImpulse, second, poles, H2, H1, stepInfo } from './model.js';
import { near, ok } from '../../lib/testing.js';

const dt = 1e-3, N = 8000, step = new Float64Array(N).fill(1);
export const tests = {
  'RC step response is 1 − e^{−t/τ}'() { const y = rc(step, dt, 0.5); near(y[999], 1 - Math.exp(-1 / 0.5), 1e-3, 'at 1 s'); },
  'linearity: response to a·x1 + b·x2 equals a·y1 + b·y2'() {
    const x1 = Array.from({ length: N }, (_, i) => Math.sin(i * dt * 3)), x2 = Array.from({ length: N }, (_, i) => (i * dt > 2 ? 1 : 0)), a = 1.3, b = -0.7;
    const y = second(x1.map((v, i) => a * v + b * x2[i]), dt, 0.3, 2), y1 = second(x1, dt, 0.3, 2), y2 = second(x2, dt, 0.3, 2);
    let e = 0; for (let i = 0; i < N; i++) e = Math.max(e, Math.abs(y[i] - a * y1[i] - b * y2[i])); ok(e < 1e-9, `max err ${e}`);
  },
  'second-order overshoot matches e^{−πζ/√(1−ζ²)}'() { const y = second(step, dt, 0.3, 2); near(Math.max(...y) - 1, stepInfo(0.3, 2).os, 2e-3, 'overshoot'); },
  'poles: |p| = ωn and Re p = −ζωn'() { const [p] = poles(0.4, 3); near(Math.hypot(...p), 3, 1e-12, '|p|'); near(-p[0], 1.2, 1e-12, 'Re'); },
  'sinusoidal steady state follows |H(jω)|'() {
    const w = 1.5, x = Array.from({ length: 40000 }, (_, i) => Math.sin(w * i * dt)), y = second(x, dt, 0.3, 2); let m = 0; for (let i = 30000; i < 40000; i++) m = Math.max(m, Math.abs(y[i])); near(m, H2(w, 0.3, 2).mag, 2e-3, 'amp');
    near(H1(1 / 0.5, 0.5).mag, 1 / Math.SQRT2, 1e-12, 'RC −3 dB at ω = 1/τ'); near(rcImpulse(0.5, 0.5) * 0.5, Math.exp(-1), 1e-12, 'h(τ) = e⁻¹/τ');
  },
};
