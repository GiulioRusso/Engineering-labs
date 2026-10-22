// Sinusoidal steady state: complex impedances, series RLC (resonance, Q, bandwidth), the parallel tank,
// AC power (P, Q, S, power factor) and first-order RC filters. Complex numbers as [re, im]. Pure, no DOM.
export const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
export const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
export const cabs = (a) => Math.hypot(a[0], a[1]), carg = (a) => Math.atan2(a[1], a[0]);

export const zR = (R) => [R, 0], zL = (L, f) => [0, 2 * Math.PI * f * L], zC = (C, f) => [0, -1 / (2 * Math.PI * f * C)];
export const seriesZ = ({ R, L, C }, f) => cadd(cadd(zR(R), zL(L, f)), zC(C, f));
export function resonance({ R, L, C }) { const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C)), Q = Math.sqrt(L / C) / R; return { f0, Q, bw: f0 / Q }; }
// parallel R ‖ L ‖ C: impedance
export const tankZ = ({ R, L, C }, f) => { const w = 2 * Math.PI * f; return cdiv([1, 0], [1 / R, w * C - 1 / (w * L)]); };
// V and I amplitudes with I lagging V by phi: average, reactive and apparent power
export const acPower = (V, I, phi) => ({ P: 0.5 * V * I * Math.cos(phi), Q: 0.5 * V * I * Math.sin(phi), S: 0.5 * V * I, pf: Math.cos(phi) });
// RC low-pass (output across C) and high-pass (across R)
export const rcFilter = (R, C, f, high = false) => { const x = f * 2 * Math.PI * R * C, H = high ? cdiv([0, x], [1, x]) : cdiv([1, 0], [1, x]); return { mag: cabs(H), ph: carg(H), fc: 1 / (2 * Math.PI * R * C) }; };
