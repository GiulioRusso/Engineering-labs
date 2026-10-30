// Early quantum physics: the photoelectric effect, a particle in a box, and the hydrogen spectrum.
// SI constants (CODATA 2018 exact values where they exist), energies in eV. Pure, no DOM.
export const H = 6.62607015e-34, E = 1.602176634e-19, C = 299792458, ME = 9.1093837015e-31, MP = 1.67262192369e-27;
export const HBAR = H / (2 * Math.PI), HC_EV_NM = H * C / E * 1e9; // hc ≈ 1239.84 eV·nm

// Work functions (eV), polycrystalline values from the CRC Handbook of Chemistry and Physics,
// "Electron work function of the elements".
export const METALS = { cs: { label: 'Caesium', phi: 2.14 }, na: { label: 'Sodium', phi: 2.36 }, zn: { label: 'Zinc', phi: 4.33 }, cu: { label: 'Copper', phi: 4.65 } };
export const photonEnergy = (lamNm) => HC_EV_NM / lamNm;            // eV
export const kmax = (lamNm, phi) => Math.max(0, photonEnergy(lamNm) - phi); // eV (= stopping voltage in V)
export const threshold = (phi) => HC_EV_NM / phi;                   // longest wavelength that frees electrons, nm

// Infinite well of width L (m): ψₙ = √(2/L) sin(nπx/L), Eₙ = n²h²/(8mL²)
export const boxEnergy = (n, L, m = ME) => n * n * H * H / (8 * m * L * L) / E; // eV
export const psi = (n, x, L) => Math.sqrt(2 / L) * Math.sin(n * Math.PI * x / L);
// |Ψ|² of the equal superposition (ψa + ψb)/√2 at time t (s)
export function density(a, b, x, L, t) {
  const w = (boxEnergy(b, L) - boxEnergy(a, L)) * E / HBAR, pa = psi(a, x, L), pb = psi(b, x, L);
  return a === b ? pa * pa : 0.5 * (pa * pa + pb * pb) + pa * pb * Math.cos(w * t);
}

// Hydrogen (Bohr, with the reduced mass): Eₙ = −R_H hc / n²; lines 1/λ = R_H (1/n₁² − 1/n₂²) in vacuum
export const RINF = 10973731.568160, RH = RINF / (1 + ME / MP);
export const level = (n) => -RH * H * C / E / (n * n);              // eV
export const line = (n1, n2) => 1e9 / (RH * (1 / (n1 * n1) - 1 / (n2 * n2))); // nm
