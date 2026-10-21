// Polarization of a plane wave E = (Ax cos(ωt − kz), Ay cos(ωt − kz + δ)): the ellipse, its orientation ψ
// and ellipticity χ, Jones vectors and elements (polarizer, retarders), Stokes parameters, and the
// circular basis. Angles in radians. Pure, no DOM.
export const field = (Ax, Ay, d, ph) => [Ax * Math.cos(ph), Ay * Math.cos(ph + d)];
export function ellipse(Ax, Ay, d) {
  const psi = 0.5 * Math.atan2(2 * Ax * Ay * Math.cos(d), Ax * Ax - Ay * Ay), A = Math.hypot(Ax, Ay), chi = 0.5 * Math.asin(Math.max(-1, Math.min(1, 2 * Ax * Ay * Math.sin(d) / (A * A || 1))));
  return { psi, chi, a: A * Math.cos(chi), b: A * Math.abs(Math.sin(chi)), hand: Math.abs(chi) < 1e-6 ? 'linear' : chi > 0 ? 'left' : 'right' };
}
// complex numbers as [re, im]; Jones vector J = [[Ax, 0], [Ay cos δ, Ay sin δ]]
const C = { mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], add: (a, b) => [a[0] + b[0], a[1] + b[1]], abs2: (a) => a[0] * a[0] + a[1] * a[1], arg: (a) => Math.atan2(a[1], a[0]) };
export const jones = (Ax, Ay, d) => [[Ax, 0], [Ay * Math.cos(d), Ay * Math.sin(d)]];
const rot = (t) => [[[Math.cos(t), 0], [-Math.sin(t), 0]], [[Math.sin(t), 0], [Math.cos(t), 0]]];
const mm = (A, B) => [0, 1].map((i) => [0, 1].map((j) => C.add(C.mul(A[i][0], B[0][j]), C.mul(A[i][1], B[1][j]))));
const mv = (M, v) => [0, 1].map((i) => C.add(C.mul(M[i][0], v[0]), C.mul(M[i][1], v[1])));
// element matrices in their own frame, rotated to angle θ: polarizer, retarder with retardance Γ
export function element(kind, th, G = Math.PI / 2) {
  const D = kind === 'polarizer' ? [[[1, 0], [0, 0]], [[0, 0], [0, 0]]] : [[[1, 0], [0, 0]], [[0, 0], [Math.cos(-G), Math.sin(-G)]]];
  return mm(mm(rot(th), D), rot(-th));
}
export const apply = (M, J) => mv(M, J);
// back from a Jones vector to (Ax, Ay, δ)
export const fromJones = (J) => ({ Ax: Math.sqrt(C.abs2(J[0])), Ay: Math.sqrt(C.abs2(J[1])), d: C.arg(J[1]) - C.arg(J[0]) });
export const power = (J) => C.abs2(J[0]) + C.abs2(J[1]);
export function stokes(Ax, Ay, d, dop = 1) { const S0 = Ax * Ax + Ay * Ay; return [S0, dop * (Ax * Ax - Ay * Ay), dop * 2 * Ax * Ay * Math.cos(d), dop * 2 * Ax * Ay * Math.sin(d)]; }
// sum of right- and left-hand circular components (amplitudes aR, aL, phase difference φ)
export const circular = (aR, aL, phi, wt) => [aR * Math.cos(wt - phi / 2) + aL * Math.cos(wt + phi / 2), -aR * Math.sin(wt - phi / 2) + aL * Math.sin(wt + phi / 2)];
