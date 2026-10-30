// Heat conduction along a rod made of one or two materials: ρc ∂T/∂t = ∂/∂x (k ∂T/∂x).
// Finite volumes, backward Euler (stable for any step, which matters when copper sits next to wood),
// ends held at fixed temperatures or insulated. SI units, T in °C. Pure, no DOM.
export const MATERIALS = {
  copper: { label: 'Copper', k: 401, rc: 3.45e6 },
  steel: { label: 'Steel', k: 50, rc: 3.8e6 },
  glass: { label: 'Glass', k: 1, rc: 2.1e6 },
  wood: { label: 'Wood', k: 0.12, rc: 0.9e6 },
};
export const diffusivity = (m) => MATERIALS[m].k / MATERIALS[m].rc;

export function rod({ left, right = left, L = 0.2, n = 100 }) {
  const dx = L / n, x = [], k = [], rc = [];
  for (let i = 0; i < n; i++) { x.push((i + 0.5) * dx); const m = MATERIALS[i < n / 2 ? left : right]; k.push(m.k); rc.push(m.rc); }
  // conductance between neighbouring cells (series halves) and to the walls (half a cell)
  const G = k.slice(1).map((_, i) => 1 / (dx / (2 * k[i]) + dx / (2 * k[i + 1])));
  return { n, L, dx, x, k, rc, G, G0: 2 * k[0] / dx, G1: 2 * k[n - 1] / dx };
}
// One backward-Euler step in place. bc: { fixed: true, TL, TR } or { fixed: false } (insulated).
export function step(R, T, dt, bc) {
  const { n, dx, rc, G } = R, a = new Float64Array(n), b = new Float64Array(n), c = new Float64Array(n), d = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const C = rc[i] * dx / dt; b[i] = C; d[i] = C * T[i];
    if (i > 0) { a[i] = -G[i - 1]; b[i] += G[i - 1]; }
    if (i < n - 1) { c[i] = -G[i]; b[i] += G[i]; }
  }
  if (bc.fixed) { b[0] += R.G0; d[0] += R.G0 * bc.TL; b[n - 1] += R.G1; d[n - 1] += R.G1 * bc.TR; }
  for (let i = 1; i < n; i++) { const w = a[i] / b[i - 1]; b[i] -= w * c[i - 1]; d[i] -= w * d[i - 1]; } // Thomas algorithm
  T[n - 1] = d[n - 1] / b[n - 1];
  for (let i = n - 2; i >= 0; i--) T[i] = (d[i] - c[i] * T[i + 1]) / b[i];
  return T;
}
// Heat flux into the rod at the left end and out at the right end (W/m²)
export const fluxes = (R, T, bc) => (bc.fixed ? [R.G0 * (bc.TL - T[0]), R.G1 * (T[R.n - 1] - bc.TR)] : [0, 0]);
export const heat = (R, T) => T.reduce((s, t, i) => s + R.rc[i] * t * R.dx, 0); // J/m², from 0 °C
// Steady state of two materials in series: one flux, temperature drops ∝ L/k
export function steady(left, right, L, TL, TR) {
  const r1 = L / 2 / MATERIALS[left].k, r2 = L / 2 / MATERIALS[right].k, q = (TL - TR) / (r1 + r2);
  return { q, Ti: TL - q * r1 };
}
