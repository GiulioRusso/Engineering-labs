// Nuclear binding energy: the semi-empirical (Weizsäcker) mass formula term by term, the binding energy per
// nucleon along the valley of stability, measured values for a few nuclei, and the energy released by
// fission and fusion. Pure, no DOM.
export const SEMF = { aV: 15.75, aS: 17.8, aC: 0.711, aA: 23.7, aP: 11.18 };   // MeV
// the five terms for (A, Z), in MeV
export function terms(A, Z) {
  const N = A - Z, d = A % 2 ? 0 : (Z % 2 ? -1 : 1) * SEMF.aP / Math.sqrt(A);
  return { volume: SEMF.aV * A, surface: -SEMF.aS * A ** (2 / 3), coulomb: -SEMF.aC * Z * (Z - 1) / A ** (1 / 3), asymmetry: -SEMF.aA * (N - Z) ** 2 / A, pairing: d };
}
export const B = (A, Z) => { const t = terms(A, Z); return t.volume + t.surface + t.coulomb + t.asymmetry + t.pairing; };
// the most stable Z for a given A (minimises the mass: Coulomb against asymmetry)
export const zStable = (A) => Math.max(1, Math.round(A / (2 + SEMF.aC / (2 * SEMF.aA) * A ** (2 / 3))));
export const perNucleon = (A) => B(A, zStable(A)) / A;
// measured binding energies (MeV, AME): what the formula is fitted to
export const MEASURED = [
  { name: '²H', A: 2, B: 2.2246 }, { name: '³H', A: 3, B: 8.4818 }, { name: '⁴He', A: 4, B: 28.2957 }, { name: '⁶Li', A: 6, B: 31.994 }, { name: '¹²C', A: 12, B: 92.162 }, { name: '¹⁶O', A: 16, B: 127.619 },
  { name: '⁵⁶Fe', A: 56, B: 492.254 }, { name: '⁶²Ni', A: 62, B: 545.259 }, { name: '⁹⁰Zr', A: 90, B: 783.893 }, { name: '¹³⁸Ba', A: 138, B: 1158.30 }, { name: '²⁰⁸Pb', A: 208, B: 1636.43 }, { name: '²³⁵U', A: 235, B: 1783.87 }, { name: '²³⁸U', A: 238, B: 1801.69 },
];
// energy released by splitting A into two equal halves (positive: fission pays), from the formula
export const fissionQ = (A) => 2 * B(Math.round(A / 2), zStable(Math.round(A / 2))) - B(A, zStable(A));
// deuterium + tritium → helium-4 + neutron, from measured binding energies
export const dtQ = () => MEASURED.find((m) => m.name === '⁴He').B - MEASURED.find((m) => m.name === '²H').B - MEASURED.find((m) => m.name === '³H').B;
