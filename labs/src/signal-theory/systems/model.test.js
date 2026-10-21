import { SHAPES, convolve, respond, SYSTEMS, fir, firResponse } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'rect * rect = triangle, and convolution commutes'() {
    const dt = 1e-3, r = Array.from({ length: 1000 }, (_, i) => SHAPES.rect.f(i * dt)), y = convolve(r, r, dt);
    near(y[999], 1, 2e-3, 'peak at t = 1'); near(y[499], 0.5, 2e-3, 'half way');
    const e = Array.from({ length: 1500 }, (_, i) => SHAPES.exp.f(i * dt)), a = convolve(r, e, dt), b = convolve(e, r, dt);
    ok(a.every((v, i) => Math.abs(v - b[i]) < 1e-12), 'x*h = h*x');
  },
  'RC low-pass: step response 1 − e^(−t/τ); sine amplitude = |H(f)|'() {
    const s = { tau: 0.2, f: 2 }, r = respond('lowpass', 'step', s, 1);
    near(r.y[100], 1 - Math.exp(-1), 1e-2, 'y(τ)');
    const q = respond('lowpass', 'sine', s, 4), tail = q.y.slice(1500), H = SYSTEMS.lowpass.H(2, s);
    near(Math.max(...tail), Math.hypot(...H), 2e-2, 'steady amplitude');
  },
  'FIR: unit DC gain, > 40 dB attenuation an octave above cutoff'() {
    const h = fir('lowpass', 50, 0, 1000, 101);
    near(firResponse(h, 0, 1000), 1, 1e-12, 'DC'); ok(20 * Math.log10(firResponse(h, 100, 1000)) < -40, 'stopband');
    const hp = fir('highpass', 50, 0, 1000, 101); ok(firResponse(hp, 0, 1000) < 1e-9 && Math.abs(firResponse(hp, 300, 1000) - 1) < 0.01, 'high-pass');
  },
};
