// First-order ODEs y' = f(x, y) and the oscillator x'' = −x − 2γx' as a planar system. Pure, no DOM.
// Every kind is a vector field F(x, y) = (dx/dt, dy/dt); for y' = f(x, y) that is (1, f).
export const KINDS = {
  growth: { label: "y′ = k·y", F: (s) => (x, y) => [1, s.k * y], exact: (s) => (x) => s.y0 * Math.exp(s.k * (x - s.x0)) },
  logistic: { label: "y′ = r·y·(1 − y/K)", F: (s) => (x, y) => [1, s.r * y * (1 - y / s.K)],
    exact: (s) => (x) => { const e = Math.exp(-s.r * (x - s.x0)); return s.K * s.y0 / (s.y0 + (s.K - s.y0) * e); } },
  forced: { label: "y′ = −y + cos x", F: () => (x, y) => [1, -y + Math.cos(x)],
    exact: (s) => (x) => { const p = (u) => (Math.cos(u) + Math.sin(u)) / 2; return p(x) + (s.y0 - p(s.x0)) * Math.exp(-(x - s.x0)); } },
  oscillator: { label: "x″ = −x − 2γ·x′", F: (s) => (x, v) => [v, -x - 2 * s.gamma * v], system: true },
};

// Euler: the next point follows the slope at the current point for one step h.
export function euler(F, p0, h, n) {
  const out = [p0]; let [x, y] = p0;
  for (let i = 0; i < n; i++) { const [a, b] = F(x, y); x += h * a; y += h * b; out.push([x, y]); if (!Number.isFinite(y) || Math.abs(y) > 1e6) break; }
  return out;
}

// Classical RK4, used as the "exact" curve where no closed form is given.
export function rk4(F, p0, h, n) {
  const out = [p0]; let [x, y] = p0;
  for (let i = 0; i < n; i++) {
    const [a1, b1] = F(x, y), [a2, b2] = F(x + h * a1 / 2, y + h * b1 / 2), [a3, b3] = F(x + h * a2 / 2, y + h * b2 / 2), [a4, b4] = F(x + h * a3, y + h * b3);
    x += h * (a1 + 2 * a2 + 2 * a3 + a4) / 6; y += h * (b1 + 2 * b2 + 2 * b3 + b4) / 6; out.push([x, y]);
    if (!Number.isFinite(y) || Math.abs(y) > 1e6) break;
  }
  return out;
}
