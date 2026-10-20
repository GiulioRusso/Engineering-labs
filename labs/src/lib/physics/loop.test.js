import { MU0, ellipKE, loopField, mutualCoaxial, loopFieldSegments } from './loop.js';
import { near, pct } from '../testing.js';

const f = { Br: 0, Bz: 0, A: 0 };

export const tests = {
  'K(m), E(m) match tabulated values (m = 0.5, 0.9)'() {
    near(ellipKE(0.5).K, 1.8540746773013719, 1e-14, 'K(0.5)');
    near(ellipKE(0.5).E, 1.3506438810476755, 1e-14, 'E(0.5)');
    near(ellipKE(0.9).K, 2.5780921133481733, 1e-14, 'K(0.9)');
    near(ellipKE(0.9).E, 1.1047747327040733, 1e-14, 'E(0.9)');
  },
  'on-axis field = μ0·I·R²/(2(R²+z²)^3/2)'() {
    let worst = 0;
    for (const z of [0, 0.01, 0.05, 0.3, 2]) {
      const want = MU0 * 3 * 0.05 ** 2 / (2 * Math.pow(0.05 ** 2 + z * z, 1.5));
      worst = Math.max(worst, near(loopField(0.05, 3, 0, z, f).Bz, want, 1e-3, `z=${z}`));
    }
    return `worst ${pct(worst)}, budget 0.1 %`;
  },
  'closed form = brute-force Biot-Savart on 4000 segments, off axis'() {
    let worst = 0;
    for (const [x, z] of [[0.02, 0.01], [0.049, 0.002], [0.08, -0.03], [0.2, 0.15], [0.01, 0.3]]) {
      const [bx, , bz] = loopFieldSegments(0.05, 1, x, z, 4000);
      loopField(0.05, 1, x, z, f);
      const s = Math.hypot(bx, bz);
      worst = Math.max(worst, Math.hypot(f.Br - bx, f.Bz - bz) / s);
    }
    near(1 + worst, 1, 1e-5, 'vector error');
    return `worst ${worst.toExponential(1)}`;
  },
  'B = curl A: Br = -∂A/∂z, Bz = (1/ρ)∂(ρA)/∂ρ'() {
    const h = 1e-6;
    for (const [r, z] of [[0.01, 0.02], [0.07, -0.01], [0.3, 0.4]]) {
      const Ar = (rr, zz) => loopField(0.05, 1, rr, zz, f).A;
      loopField(0.05, 1, r, z, f);
      const { Br, Bz } = f;
      near(-(Ar(r, z + h) - Ar(r, z - h)) / (2 * h), Br, 1e-6, `Br at ${r},${z}`);
      near(((r + h) * Ar(r + h, z) - (r - h) * Ar(r - h, z)) / (2 * h * r), Bz, 1e-6, `Bz at ${r},${z}`);
    }
  },
  'Maxwell mutual inductance = 2πb·A, and the small-loop limit'() {
    near(mutualCoaxial(0.05, 0.03, 0.02), 2 * Math.PI * 0.03 * loopField(0.05, 1, 0.03, 0.02, f).A, 1e-12, '2πbA');
    const a = 0.05, b = 1e-4, d = 0.03;
    near(mutualCoaxial(a, b, d), MU0 * Math.PI * b * b * a * a / (2 * Math.pow(a * a + d * d, 1.5)), 1e-5, 'small loop');
  },
  'far field is a dipole: Bz(z) → μ0·m/(2π·z³)'() {
    const a = 0.01, z = 1, m = Math.PI * a * a;
    near(loopField(a, 1, 0, z, f).Bz, MU0 * m / (2 * Math.PI * z ** 3), 2e-4, 'on axis');
    near(loopField(a, 1, z, 0, f).Bz, -MU0 * m / (4 * Math.PI * z ** 3), 2e-4, 'equator');
  },
};
