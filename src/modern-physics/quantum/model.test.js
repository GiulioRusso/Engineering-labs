import { psi, boxEnergy, density, line, level, kmax, threshold, photonEnergy, HC_EV_NM, METALS } from './model.js';
import { near, ok } from '../../lib/testing.js';

const integrate = (f, L, n = 4000) => { let s = 0; for (let i = 0; i < n; i++) s += f((i + 0.5) * L / n); return s * L / n; };

export const tests = {
  'box: ψₙ normalised and orthogonal; Eₙ ∝ n²; an electron in 1 nm has E₁ = 0.376 eV'() {
    const L = 1e-9;
    for (const n of [1, 2, 3]) near(integrate((x) => psi(n, x, L) ** 2, L), 1, 1e-6, `‖ψ${n}‖`);
    ok(Math.abs(integrate((x) => psi(1, x, L) * psi(2, x, L), L)) < 1e-9, 'ψ₁ ⊥ ψ₂');
    near(boxEnergy(3, L) / boxEnergy(1, L), 9, 1e-12, 'E₃ = 9 E₁'); near(boxEnergy(1, L), 0.376, 2e-3, 'E₁');
  },
  'superposition: the probability stays 1 while it sloshes from side to side'() {
    const L = 1e-9, T = 4.135667696e-15 / (boxEnergy(2, L) - boxEnergy(1, L));
    for (const t of [0, 0.25 * T, 0.5 * T]) near(integrate((x) => density(1, 2, x, L, t), L), 1, 1e-6, `t = ${t}`);
    const left = (t) => integrate((x) => (x < L / 2 ? density(1, 2, x, L, t) : 0), L);
    ok(left(0) > 0.9 && left(0.5 * T) < 0.1, `left half: ${left(0)} then ${left(0.5 * T)}`);
  },
  'hydrogen: Hα (3 → 2) at 656.47 nm in vacuum, Lyman α at 121.57 nm, ground state −13.6 eV'() {
    near(line(2, 3), 656.47, 1e-5, 'Hα'); near(line(1, 2), 121.567, 2e-5, 'Lyman α (Bohr ignores fine structure: 0.001 nm)'); near(level(1), -13.598, 1e-4, 'E₁');
    near(HC_EV_NM / (level(3) - level(2)), line(2, 3), 1e-12, 'photon energy = level difference');
  },
  'photoelectric: no electrons beyond the threshold wavelength; K_max rises with slope h'() {
    for (const m of Object.values(METALS)) { const l0 = threshold(m.phi); ok(kmax(l0 * 1.001, m.phi) === 0 && kmax(l0 * 0.999, m.phi) > 0, m.label); }
    near(kmax(200, 4.33) - kmax(250, 4.33), photonEnergy(200) - photonEnergy(250), 1e-12, 'slope h, same for every metal');
  },
};
