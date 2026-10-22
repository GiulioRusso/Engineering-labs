// Convolution: continuous signals on a grid (flip, slide, multiply, integrate), short discrete sequences,
// and the convolution theorem. Pure, no DOM.
export const SIGS = {
  rect: { label: 'Rectangle', f: (t) => (Math.abs(t) <= 0.5 ? 1 : 0) },
  tri: { label: 'Triangle', f: (t) => Math.max(0, 1 - Math.abs(t)) },
  gauss: { label: 'Gaussian', f: (t) => Math.exp(-t * t / (2 * 0.3 * 0.3)) },
  exp: { label: 'Decaying exponential', f: (t) => (t >= 0 ? Math.exp(-1.5 * t) : 0) },
  ramp: { label: 'Ramp (0 → 1)', f: (t) => (t >= 0 && t <= 1 ? t : 0) },
};
// grid τ ∈ [−L, L] with step d
export const grid = (L = 6, d = 0.01) => Array.from({ length: Math.round(2 * L / d) + 1 }, (_, i) => -L + i * d);
// y(t) = ∫ h(τ) g(t − τ) dτ on a grid of τ
export const convAt = (h, g, t, tau) => { let s = 0; const d = tau[1] - tau[0]; for (const u of tau) s += h(u) * g(t - u) * d; return s; };
// discrete full convolution (length N + M − 1)
export function conv(x, h) { const y = new Array(x.length + h.length - 1).fill(0); for (let i = 0; i < x.length; i++) for (let j = 0; j < h.length; j++) y[i + j] += x[i] * h[j]; return y; }
