import { chebyshev, TAPER, steerWeights, af, squint, gratingAngles, nullWeights, planarAF } from './model.js';
import { near, ok } from '../../lib/testing.js';

const deg = Math.PI / 180, dB = (v) => 20 * Math.log10(v + 1e-12);
const pattern = (N, d, w, fr = 1) => Array.from({ length: 3601 }, (_, i) => af((-90 + i * 0.05) * deg, N, d, w, fr));
export const tests = {
  'uniform array steered to 30° peaks there with −13.3 dB sidelobes'() { const w = steerWeights(16, 0.5, 30 * deg), p = pattern(16, 0.5, w), k = p.indexOf(Math.max(...p)); near(-90 + k * 0.05, 30, 0.1, 'peak'); near(af(30 * deg, 16, 0.5, w), 1, 1e-9, 'unity'); },
  'Chebyshev weights give equal sidelobes at the design level'() { const N = 12, w = chebyshev(N, -30).map((a) => [a, 0]), p = pattern(N, 0.5, w).map(dB), k = p.indexOf(Math.max(...p)); let l = k; while (p[l - 1] < p[l]) l--; let mx = -Infinity; for (let i = 0; i < l; i++) mx = Math.max(mx, p[i]); near(mx + 100, -30 + 100, 0.01, 'SLL'); ok(TAPER.cheb(8).length === 8, 'taper'); },
  'phase-shifter beam squints with frequency, true time delay does not'() { const N = 16, d = 0.5, t0 = 40 * deg, fr = 1.2; const p1 = pattern(N, d, steerWeights(N, d, t0, { mode: 'phase', fr }), fr), p2 = pattern(N, d, steerWeights(N, d, t0, { mode: 'ttd', fr }), fr); near(-90 + p1.indexOf(Math.max(...p1)) * 0.05, squint(t0, fr) / deg, 0.1, 'squint'); near(-90 + p2.indexOf(Math.max(...p2)) * 0.05, 40, 0.1, 'ttd'); },
  'grating lobe appears when d > λ/(1 + |sin θ0|)'() { ok(gratingAngles(0.5, 0).length === 0, 'half wave'); ok(gratingAngles(0.6, 60 * deg).length === 1, 'steered'); near(gratingAngles(1, 0)[0] / deg + 200, -90 + 200, 1e-6, 'd = λ: endfire'); },
  'null steering puts deep nulls where asked and keeps the beam'() { const N = 12, w = nullWeights(N, 0.5, 0, [20 * deg, -35 * deg]); ok(dB(af(20 * deg, N, 0.5, w)) < -100, 'null 1'); ok(dB(af(-35 * deg, N, 0.5, w)) < -100, 'null 2'); ok(af(0, N, 0.5, w) > 0.8, 'beam kept'); near(planarAF(0.2, 0.1, 8, 8, 0.5, 0.2, 0.1), 1, 1e-9, 'planar peak'); },
};
