import { isa, PLANE, CL, CD, forces, trimAlpha, stallSpeed, bestLD, liftSlope, kInduced } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'ISA: sea level and the tropopause'() {
    near(isa(0).rho, 1.225, 1e-3, 'ρ₀'); near(isa(11000).T, 216.65, 1e-9, 'T(11 km)'); near(isa(11000).p, 22632, 1e-3, 'p(11 km)');
    near(isa(11000.01).p, isa(10999.99).p, 1e-5, 'continuous at 11 km');
  },
  'lift: slope 2πAR/(AR+2); level flight trims L = W; stall speed'() {
    near((CL(PLANE, 0.05) - CL(PLANE, 0.04)) / 0.01, liftSlope(PLANE.AR), 1e-9, 'slope');
    const a = trimAlpha(PLANE, 55, 1000), f = forces(PLANE, 55, 1000, a);
    near(f.L, f.W, 1e-9, 'L = W');
    const vs = stallSpeed(PLANE, 0); ok(trimAlpha(PLANE, vs * 1.001, 0) !== null && trimAlpha(PLANE, vs * 0.999, 0) === null, 'stall boundary');
    near(stallSpeed(PLANE, 0, 2), vs * Math.SQRT2, 1e-12, 'Vs ∝ √n');
  },
  'drag polar: best L/D = 1/(2√(k·CD0)) at CL = √(CD0/k)'() {
    const b = bestLD(PLANE);
    let best = 0, bcl = 0; for (let cl = 0.1; cl < 1.5; cl += 1e-4) { const r = cl / CD(PLANE, cl); if (r > best) { best = r; bcl = cl; } }
    near(best, b.LD, 1e-6, 'L/D max'); near(bcl, b.CL, 1e-3, 'at CL');
    near(kInduced(PLANE), 1 / (Math.PI * 0.8 * 7.5), 1e-12, 'k');
  },
};
