// Surfaces z = f(x, y) with exact gradients. Pure, no DOM.
export const SURF = {
  bowl: { label: 'Bowl: (x² + y²)/4', f: (x, y) => (x * x + y * y) / 4, g: (x, y) => [x / 2, y / 2] },
  saddle: { label: 'Saddle: (x² − y²)/4', f: (x, y) => (x * x - y * y) / 4, g: (x, y) => [x / 2, -y / 2] },
  hills: {
    label: 'Two hills and a valley',
    f: (x, y) => 1.4 * Math.exp(-((x - 1) ** 2 + (y - 0.6) ** 2)) + Math.exp(-((x + 1.2) ** 2 + (y + 0.8) ** 2) / 0.7) - 0.9 * Math.exp(-((x + 0.3) ** 2 + (y - 1.6) ** 2) / 0.6),
    g(x, y) {
      const a = 1.4 * Math.exp(-((x - 1) ** 2 + (y - 0.6) ** 2)), b = Math.exp(-((x + 1.2) ** 2 + (y + 0.8) ** 2) / 0.7), c = -0.9 * Math.exp(-((x + 0.3) ** 2 + (y - 1.6) ** 2) / 0.6);
      return [-2 * (x - 1) * a - 2 * (x + 1.2) / 0.7 * b - 2 * (x + 0.3) / 0.6 * c, -2 * (y - 0.6) * a - 2 * (y + 0.8) / 0.7 * b - 2 * (y - 1.6) / 0.6 * c];
    },
  },
  ripple: {
    label: 'Ripple: cos(r)·e^(−r/3)',
    f: (x, y) => { const r = Math.hypot(x, y); return Math.cos(1.8 * r) * Math.exp(-r / 3); },
    g(x, y) { const r = Math.hypot(x, y) || 1e-12, d = (-1.8 * Math.sin(1.8 * r) - Math.cos(1.8 * r) / 3) * Math.exp(-r / 3); return [d * x / r, d * y / r]; },
  },
};
// Tangent plane at (x0, y0): the best linear approximation.
export const tangentPlane = (S, x0, y0) => { const z0 = S.f(x0, y0), [gx, gy] = S.g(x0, y0); return (x, y) => z0 + gx * (x - x0) + gy * (y - y0); };
