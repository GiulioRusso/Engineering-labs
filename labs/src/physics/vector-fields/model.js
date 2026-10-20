// Dot and cross products, gravitational fields of point masses, and divergence/curl measured as
// flux and circulation around a small circle. SI units. Pure, no DOM.
export const GN = 6.6743e-11;
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a) => Math.hypot(a[0], a[1], a[2]);

// g at (x, y) from masses [{ m, x, y }] in the plane (m/s²) and the potential (J/kg).
export function gravity(masses, x, y) {
  let gx = 0, gy = 0, V = 0;
  for (const q of masses) { const dx = q.x - x, dy = q.y - y, r = Math.hypot(dx, dy) || 1e-9; gx += GN * q.m * dx / r ** 3; gy += GN * q.m * dy / r ** 3; V -= GN * q.m / r; }
  return [gx, gy, V];
}

// 2D sample fields with their exact divergence and curl (z-component).
export const FIELDS = {
  source: { label: 'Source: F = (x, y)', F: (x, y) => [x, y], div: () => 2, curl: () => 0 },
  sink: { label: 'Sink: F = −(x, y)', F: (x, y) => [-x, -y], div: () => -2, curl: () => 0 },
  vortex: { label: 'Vortex: F = (−y, x)', F: (x, y) => [-y, x], div: () => 0, curl: () => 2 },
  shear: { label: 'Shear: F = (y, 0)', F: (x, y) => [y, 0], div: () => 0, curl: () => -1 },
  saddle: { label: 'Saddle flow: F = (x, −y)', F: (x, y) => [x, -y], div: () => 0, curl: () => 0 },
  swirl: { label: 'Spiral: F = (x − y, x + y)', F: (x, y) => [x - y, x + y], div: () => 2, curl: () => 2 },
  gauss: { label: 'Bump: F = (x, y)·e^(−r²)', F: (x, y) => { const e = Math.exp(-(x * x + y * y)); return [x * e, y * e]; }, div: (x, y) => (2 - 2 * (x * x + y * y)) * Math.exp(-(x * x + y * y)), curl: () => 0 },
};
// Flux out of and circulation around a circle of radius r at (x0, y0), divided by its area:
// these tend to div F and (curl F)_z as r → 0 (divergence and Stokes theorems).
export function measure(F, x0, y0, r, n = 128) {
  let flux = 0, circ = 0;
  for (let k = 0; k < n; k++) {
    const a = 2 * Math.PI * k / n, c = Math.cos(a), s = Math.sin(a), [fx, fy] = F(x0 + r * c, y0 + r * s);
    flux += fx * c + fy * s; circ += -fx * s + fy * c;
  }
  const dl = 2 * Math.PI * r / n, A = Math.PI * r * r;
  return { div: flux * dl / A, curl: circ * dl / A };
}
