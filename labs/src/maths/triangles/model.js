// Triangles and curves: the right triangle, solving any triangle (laws of sines and cosines, area by
// Heron), parametric curves (Lissajous) and polar curves. Pure, no DOM.
const d2 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
// sides a, b, c opposite A, B, C and the angles (radians) of the triangle with vertices A, B, C
export function solve(A, B, C) {
  const a = d2(B, C), b = d2(A, C), c = d2(A, B), ang = (x, y, z) => Math.acos(Math.max(-1, Math.min(1, (y * y + z * z - x * x) / (2 * y * z))));
  const al = ang(a, b, c), be = ang(b, a, c), ga = Math.PI - al - be, s = (a + b + c) / 2;
  return { a, b, c, A: al, B: be, C: ga, area: Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c))), R: a / (2 * Math.sin(al)) };
}
export const lissajous = (A, a, B, b, d, t) => [A * Math.sin(a * t + d), B * Math.sin(b * t)];
export const POLAR = {
  rose: { label: 'Rose r = cos(kθ)', r: (t, k) => Math.cos(k * t), turns: (k) => (Number.isInteger(k) ? (k % 2 ? 1 : 2) : 12) },
  cardioid: { label: 'Cardioid r = 1 + cos θ', r: (t) => 1 + Math.cos(t), turns: () => 2 },
  limacon: { label: 'Limaçon r = b + cos θ', r: (t, k) => k + Math.cos(t), turns: () => 2 },
  spiral: { label: 'Spiral r = θ/2π', r: (t) => t / (2 * Math.PI), turns: () => 6 },
  circle: { label: 'Circle r = 2 cos θ', r: (t) => 2 * Math.cos(t), turns: () => 1 },
};
