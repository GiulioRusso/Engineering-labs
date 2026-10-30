// Maxwell's equations made visible. Units: μ0 = ε0 = 1 for the field pictures (only ratios matter), SI for
// the capacitor. A bar magnet is a stack of current rings along x (exact field from elliptic integrals).
export const MU0 = 4e-7 * Math.PI, EPS0 = 8.8541878128e-12;

// complete elliptic integrals K(m), E(m), m = k², by the arithmetic-geometric mean
export function ellip(m) {
  let a = 1, b = Math.sqrt(1 - m), c = Math.sqrt(m), s = 0.5 * m, p = 0.5;
  while (Math.abs(c) > 1e-15) { const an = (a + b) / 2; c = (a - b) / 2; b = Math.sqrt(a * b); a = an; p *= 2; s += p * c * c; }
  const K = Math.PI / (2 * a);
  return [K, K * (1 - s)];
}

// field of one ring (radius a, current 1, μ0 = 1) at axial distance z and radius rho: [Bz, Brho]
export function ring(a, z, rho) {
  if (rho < 1e-9) return [a * a / (2 * Math.pow(a * a + z * z, 1.5)), 0];
  const q = (a + rho) ** 2 + z * z, d = (a - rho) ** 2 + z * z, [K, E] = ellip(4 * a * rho / q), f = 1 / (2 * Math.PI * Math.sqrt(q));
  return [f * (K + (a * a - rho * rho - z * z) / d * E), f * z / rho * (-K + (a * a + rho * rho + z * z) / d * E)];
}

// bar magnet: n rings of radius a spread over length L along x, total current 1 (a short solenoid)
export const magnet = (L = 1.2, a = 0.3, n = 40) => ({ L, a, xs: Array.from({ length: n }, (_, i) => -L / 2 + L * (i + 0.5) / n), I: 1 / n });
export function magnetB(M, x, y, z, out = [0, 0, 0]) {
  const rho = Math.hypot(y, z); let bx = 0, br = 0;
  for (const xi of M.xs) { const [bz, b] = ring(M.a, x - xi, rho); bx += bz; br += b; }
  out[0] = bx * M.I; out[1] = rho > 1e-12 ? br * M.I * y / rho : 0; out[2] = rho > 1e-12 ? br * M.I * z / rho : 0;
  return out;
}
// point charge q at (cx, cy, 0), ε0 = 1: flux through any closed surface around it = q
export function chargeE(q, cx, cy, x, y, z, out = [0, 0, 0]) {
  const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy, z), k = q / (4 * Math.PI * r ** 3);
  out[0] = k * dx; out[1] = k * dy; out[2] = k * z; return out;
}

// flux of a field through a sphere (centre in the z = 0 plane): outward part, inward part, net
export function sphereFlux(F, cx, cy, R, n = 90) {
  let pos = 0, neg = 0; const b = [0, 0, 0], dth = Math.PI / n, dph = Math.PI / n;
  for (let i = 0; i < n; i++) {
    const th = (i + 0.5) * dth, st = Math.sin(th), ct = Math.cos(th);
    for (let j = 0; j < 2 * n; j++) {
      const ph = (j + 0.5) * dph, nx = st * Math.cos(ph), ny = st * Math.sin(ph), nz = ct;
      F(cx + R * nx, cy + R * ny, R * nz, b);
      const f = (b[0] * nx + b[1] * ny + b[2] * nz) * R * R * st * dth * dph;
      if (f > 0) pos += f; else neg += f;
    }
  }
  return { out: pos, in: -neg, net: pos + neg };
}

// a field line in the z = 0 plane from (x, y), RK4 with unit-speed steps, stopping when it leaves the box,
// comes back to its start (a closed line) or ends on a source
export function fieldLine(F, x, y, { h = 0.01, maxLen = 30, box = 2.3, dir = 1 } = {}) {
  const b = [0, 0, 0], v = (px, py) => { F(px, py, 0, b); const m = Math.hypot(b[0], b[1]) || 1; return [dir * b[0] / m, dir * b[1] / m]; };
  const pts = [[x, y]]; let px = x, py = y;
  for (let s = 0; s < maxLen; s += h) {
    const k1 = v(px, py), k2 = v(px + h / 2 * k1[0], py + h / 2 * k1[1]), k3 = v(px + h / 2 * k2[0], py + h / 2 * k2[1]), k4 = v(px + h * k3[0], py + h * k3[1]);
    px += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); py += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    pts.push([px, py]);
    if (Math.abs(px) > box || Math.abs(py) > box) break;
    if (s > 20 * h && Math.hypot(px - x, py - y) < 0.8 * h) { pts.push([x, y]); break; }
  }
  return pts;
}

// straight wires along z through (x, y) carrying I (μ0 = 1): B = I/(2πr) around each
export function wiresB(W, x, y, out = [0, 0, 0]) {
  out[0] = 0; out[1] = 0; out[2] = 0;
  for (const w of W) { const dx = x - w.x, dy = y - w.y, r2 = dx * dx + dy * dy; out[0] += -w.I * dy / (2 * Math.PI * r2); out[1] += w.I * dx / (2 * Math.PI * r2); }
  return out;
}
// a closed path (circle or square, counter-clockwise) centred at (cx, cy), half-size R, as n points
export function loop(shape, cx, cy, R, n = 720) {
  return Array.from({ length: n }, (_, i) => {
    const u = i / n;
    if (shape === 'circle') return [cx + R * Math.cos(2 * Math.PI * u), cy + R * Math.sin(2 * Math.PI * u)];
    const k = Math.floor(4 * u), g = 4 * u - k, C = [[R, -R, R, R], [R, R, -R, R], [-R, R, -R, -R], [-R, -R, R, -R]][k]; // corner to corner
    return [cx + C[0] + (C[2] - C[0]) * g, cy + C[1] + (C[3] - C[1]) * g];
  });
}
// ∮ B·dl round the path (midpoint rule), the tangential component along it, and the current enclosed
export function circulation(W, pts) {
  let sum = 0; const b = [0, 0, 0], Bt = [], s = []; let len = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length], mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dl = Math.hypot(x1 - x0, y1 - y0);
    wiresB(W, mx, my, b); const t = (b[0] * (x1 - x0) + b[1] * (y1 - y0)); sum += t; Bt.push(t / dl); s.push(len + dl / 2); len += dl;
  }
  return { sum, Bt, s, len };
}
// winding number test: is (x, y) inside the polygon?
export function inside(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
  return c;
}
export const enclosed = (W, pts) => W.reduce((a, w) => a + (inside(pts, w.x, w.y) ? w.I : 0), 0);

// charging capacitor (SI): circular plates radius a, a constant current I in the wires. A loop of radius r
// round the axis, either round the wire (its surface flat, or bulging into the gap) or in the gap.
export function capacitor({ I, a, r, where, surface }) {
  const dEdt = I / (EPS0 * Math.PI * a * a), share = Math.min(r, a) ** 2 / (a * a);
  // round the wire: a flat disc is crossed by the wire, a bag bulging into the gap only by E; in the gap only E
  const cond = where === 'wire' && surface === 'flat' ? I : 0, disp = where === 'wire' ? I - cond : I * share;
  const B = MU0 * (where === 'wire' ? I : I * share) / (2 * Math.PI * r); // the field itself does not depend on the surface
  return { dEdt, cond, disp, total: cond + disp, B, Bwire: MU0 * I / (2 * Math.PI * r) };
}
