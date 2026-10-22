import { current, F, Fmax, directivity, Si, Ci, impedance, PSI, nearE, contours } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'half-wave dipole: D = 1.64, R = 73 Ω, X ≈ 42.5 Ω'() { near(directivity(0.5), 1.641, 2e-3, 'D'); const z = impedance(0.5); near(z.R, 73.1, 5e-3, 'R'); near(z.X, 42.5, 0.02, 'X'); },
  'short dipole: D → 1.5, R ≈ 20π²(L/λ)²'() { near(directivity(0.02), 1.5, 2e-3, 'D'); near(impedance(0.05).R, 20 * Math.PI ** 2 * 0.05 ** 2, 0.02, 'R short'); ok(impedance(0.1).X < -500, 'capacitive'); },
  'first resonance just below λ/2'() { let Lr = 0; for (let L = 0.4; L < 0.5; L += 0.001) if (impedance(L, 0.001).X < 0 && impedance(L + 0.001, 0.001).X >= 0) Lr = L; ok(Lr > 0.46 && Lr < 0.49, `resonance at ${Lr}`); },
  'Si and Ci known values; current nulls'() { near(Si(Math.PI), 1.85194, 1e-5, 'Si(π)'); near(Ci(1) + 1, 0.337404 + 1, 1e-5, 'Ci(1)'); ok(Math.abs(current(0, 1)) < 1e-12, 'full-wave feed null'); near(current(0, 0.5), 1, 1e-12, 'half-wave'); },
  'pattern: λ/2 maximum at broadside; 1.5λ main lobe tilts'() { near(Math.abs(F(0.5, Math.PI / 2)), Fmax(0.5), 1e-6, 'broadside'); ok(Math.abs(F(1.5, Math.PI / 2)) < 0.8 * Fmax(1.5), 'tilted'); },
  'far from a short wire the field falls as 1/r; contours of a cone are circles'() { const a = nearE(0.1, 20, 0), b = nearE(0.1, 40, 0); near(a / b, 2, 0.01, '1/r'); const g = []; for (let j = 0; j < 41; j++) for (let i = 0; i < 41; i++) g.push(Math.hypot(i - 20, j - 20)); const s = contours(g, 41, 41, [-1, 1], [-1, 1], [0.5 * 20]); ok(s.length > 40, 'segments'); for (let q = 0; q < s.length; q += 2) near(Math.hypot(s[q], s[q + 1]), 0.5, 0.02, 'radius'); ok(Number.isFinite(PSI.full(1, 1, 0)), 'psi'); },
};
