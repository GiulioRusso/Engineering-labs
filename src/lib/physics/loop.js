// Circular current loops: the building block of every axisymmetric magnetic source.
// Pure module: no DOM, no three.js. SI units throughout.

export const MU0 = 1.25663706212e-6; // vacuum permeability, H/m (CODATA 2018)

// Complete elliptic integrals K(m) and E(m) of parameter m = k², by the arithmetic-geometric mean.
// Quadratic convergence: about 5 iterations for m < 0.99, relative error ~1e-15.
// Results are written to `KE` to keep hot loops allocation-free.
export const KE = { K: 0, E: 0 };
export function ellipKE(m) {
  if (m > 1 - 1e-16) m = 1 - 1e-16;
  let a = 1, b = Math.sqrt(1 - m), p = 0.5, s = 0.5 * m;
  for (let i = 0; i < 40 && a - b > 1e-15 * a; i++) {
    const c = 0.5 * (a - b), an = 0.5 * (a + b);
    b = Math.sqrt(a * b); a = an; p *= 2; s += p * c * c;
  }
  KE.K = Math.PI / (2 * a);
  KE.E = KE.K * (1 - s);
  return KE;
}

// Exact field of a circular loop (Biot-Savart integrated in closed form), in the loop's own
// cylindrical frame: radius a, current I (counter-clockwise seen from +z), loop in the plane z = 0.
// Writes out.Br, out.Bz (T) and the azimuthal vector potential out.A (T·m).
export function loopField(a, I, rho, z, out) {
  const zz = z * z, ap = a + rho, am = a - rho;
  const beta2 = ap * ap + zz, alpha2 = am * am + zz;
  const m = 4 * a * rho / beta2;
  const { K, E } = ellipKE(m);
  const C = MU0 * I / (2 * Math.PI), beta = Math.sqrt(beta2);
  out.Bz = C / beta * (K + (a * a - rho * rho - zz) / alpha2 * E);
  if (rho < 1e-12 * a) { out.Br = 0; out.A = 0; return out; }
  out.Br = C * z / (rho * beta) * (-K + (a * a + rho * rho + zz) / alpha2 * E);
  // (1 - m/2)K - E cancels badly for small m: use its series there.
  out.A = m < 1e-2
    ? 0.5 * MU0 * I * Math.sqrt(a / rho) * m * Math.sqrt(m) * (1 / 16 + m * (3 / 64 + m * 75 / 2048))
    : MU0 * I / (Math.PI * Math.sqrt(m)) * Math.sqrt(a / rho) * ((1 - m / 2) * K - E);
  return out;
}

// Mutual inductance of two coaxial loops (radii a, b, axial distance d), H. Maxwell's formula.
export function mutualCoaxial(a, b, d) {
  const m = 4 * a * b / ((a + b) ** 2 + d * d), k = Math.sqrt(m);
  const { K, E } = ellipKE(m);
  return MU0 * Math.sqrt(a * b) * ((2 / k - k) * K - (2 / k) * E);
}

// Brute-force Biot-Savart on n straight segments: the independent reference the closed form is
// tested against. Loop of radius a in the plane z = 0, field at (x, 0, z). Returns [Bx, By, Bz].
export function loopFieldSegments(a, I, x, z, n) {
  let bx = 0, by = 0, bz = 0;
  for (let i = 0; i < n; i++) {
    const t0 = 2 * Math.PI * i / n, t1 = 2 * Math.PI * (i + 1) / n;
    const x0 = a * Math.cos(t0), y0 = a * Math.sin(t0), x1 = a * Math.cos(t1), y1 = a * Math.sin(t1);
    // exact field of a finite straight segment, integrated along it with 4-point Gauss-Legendre
    const g = [-0.8611363115940526, -0.3399810435848563, 0.3399810435848563, 0.8611363115940526];
    const w = [0.3478548451374538, 0.6521451548625461, 0.6521451548625461, 0.3478548451374538];
    const dlx = x1 - x0, dly = y1 - y0;
    for (let q = 0; q < 4; q++) {
      const u = 0.5 * (1 + g[q]);
      const rx = x - (x0 + u * dlx), ry = -(y0 + u * dly), rz = z;
      const r3 = Math.pow(rx * rx + ry * ry + rz * rz, 1.5);
      const f = 0.5 * w[q] / r3;
      bx += f * (dly * rz); by += f * (-dlx * rz); bz += f * (dlx * ry - dly * rx);
    }
  }
  const C = MU0 * I / (4 * Math.PI);
  return [C * bx, C * by, C * bz];
}
