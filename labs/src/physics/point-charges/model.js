// Electrostatics of point charges: field, potential, Gauss flux. SI units. Pure, no DOM.
export const EPS0 = 8.8541878128e-12, KC = 1 / (4 * Math.PI * EPS0);
// charges: [{ q, x, y, z }]. Writes E into e, returns V.
export function field(charges, x, y, z, e) {
  e[0] = e[1] = e[2] = 0;
  let V = 0;
  for (const c of charges) {
    const dx = x - c.x, dy = y - c.y, dz = z - c.z, r2 = dx * dx + dy * dy + dz * dz, r = Math.sqrt(r2) || 1e-12, k = KC * c.q / (r2 * r);
    e[0] += k * dx; e[1] += k * dy; e[2] += k * dz; V += KC * c.q / r;
  }
  return V;
}
// Electric flux through a sphere (centre, radius R), by midpoint quadrature in (cos θ, φ).
export function gaussFlux(charges, cx, cy, cz, R, n = 120) {
  const e = [0, 0, 0];
  let s = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < 2 * n; j++) {
    const u = -1 + 2 * (i + 0.5) / n, p = Math.PI * (j + 0.5) / n, w = Math.sqrt(1 - u * u), nx = w * Math.cos(p), ny = w * Math.sin(p), nz = u;
    field(charges, cx + R * nx, cy + R * ny, cz + R * nz, e);
    s += e[0] * nx + e[1] * ny + e[2] * nz;
  }
  return s * R * R * (2 / n) * (Math.PI / n);
}
