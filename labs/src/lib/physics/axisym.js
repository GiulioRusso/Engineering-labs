// Tabulated field of an axisymmetric "stack": N equal coaxial loops, evenly spaced over a length.
// A single loop, a solenoid and an Amperian bar magnet are all stacks.
//
// The table is exact at its nodes (closed-form loop field) and bilinearly interpolated between them.
// Radial nodes are asinh-spaced so they crowd near the windings; axial nodes are uniform with a
// spacing h that divides the turn pitch, so the sum over turns becomes a strided prefix sum:
// cost O(nr · (nz + N)) exact evaluations instead of O(nr · nz · N).
import { loopField } from './loop.js';

const tmp = { Br: 0, Bz: 0, A: 0 };

// a: loop radius, N: number of loops, length: centre-to-centre span of the stack (0 for N = 1),
// rhoMax / zMax: table extent around the stack centre, hMax: largest axial node spacing.
// Field values are per ampere in each loop.
export function stackTable({ a, N, length, rhoMax, zMax, hMax, nr = 160 }) {
  const pitch = N > 1 ? length / (N - 1) : 0;
  const q = pitch > 0 ? Math.max(1, Math.ceil(pitch / hMax)) : 1;
  const h = pitch > 0 ? pitch / q : hMax;
  const nz = 2 * Math.ceil(zMax / h) + 1;
  const zMin = -h * (nz - 1) / 2;
  const s = a / 3, ur = Math.asinh(rhoMax / s);
  const Br = new Float64Array(nr * nz), Bz = new Float64Array(nr * nz), A = new Float64Array(nr * nz);
  const z0 = -length / 2;                 // first loop
  const lead = (N - 1) * q;               // g is needed from index -lead
  const gBr = new Float64Array(nz + lead), gBz = new Float64Array(nz + lead), gA = new Float64Array(nz + lead);
  for (let i = 0; i < nr; i++) {
    const rho = s * Math.sinh(ur * i / (nr - 1));
    // g[k] = field of the first loop at axial offset zMin + (k - lead)·h - z0
    for (let k = 0; k < nz + lead; k++) {
      loopField(a, 1, rho, zMin + (k - lead) * h - z0, tmp);
      gBr[k] = tmp.Br; gBz[k] = tmp.Bz; gA[k] = tmp.A;
    }
    // strided prefix sums: P[k] = g[k] + P[k - q]; node j sums loops 0..N-1 = P[j+lead] - P[j+lead-N·q]
    for (let k = q; k < nz + lead; k++) { gBr[k] += gBr[k - q]; gBz[k] += gBz[k - q]; gA[k] += gA[k - q]; }
    for (let j = 0; j < nz; j++) {
      const hi = j + lead, lo = hi - N * q, o = i * nz + j;
      Br[o] = gBr[hi] - (lo >= 0 ? gBr[lo] : 0);
      Bz[o] = gBz[hi] - (lo >= 0 ? gBz[lo] : 0);
      A[o] = gA[hi] - (lo >= 0 ? gA[lo] : 0);
    }
  }
  return { a, N, length, nr, nz, s, ur, zMin, h, rhoMax, zMax: -zMin, Br, Bz, A };
}

// Bilinear lookup at (rho, z) in the stack's own frame. Writes out.Br, out.Bz, out.A (per ampere).
// Returns false (and zeros) outside the table.
export function sampleStack(T, rho, z, out) {
  const fi = Math.asinh(rho / T.s) / T.ur * (T.nr - 1), fj = (z - T.zMin) / T.h;
  if (!(fi < T.nr - 1) || fj < 0 || fj >= T.nz - 1) { out.Br = out.Bz = out.A = 0; return false; }
  const i = fi | 0, j = fj | 0, u = fi - i, v = fj - j, o = i * T.nz + j, nz = T.nz;
  const w00 = (1 - u) * (1 - v), w01 = (1 - u) * v, w10 = u * (1 - v), w11 = u * v;
  out.Br = w00 * T.Br[o] + w01 * T.Br[o + 1] + w10 * T.Br[o + nz] + w11 * T.Br[o + nz + 1];
  out.Bz = w00 * T.Bz[o] + w01 * T.Bz[o + 1] + w10 * T.Bz[o + nz] + w11 * T.Bz[o + nz + 1];
  out.A = w00 * T.A[o] + w01 * T.A[o + 1] + w10 * T.A[o + nz] + w11 * T.A[o + nz + 1];
  return true;
}

// Cartesian field of a stack centred at (cx, cy, cz), axis along z, carrying current I per loop.
// Adds into b = [Bx, By, Bz]; returns the azimuthal vector potential A at the point.
export function addStackField(T, I, cx, cy, cz, x, y, z, b) {
  const dx = x - cx, dy = y - cy, rho = Math.hypot(dx, dy);
  if (!sampleStack(T, rho, z - cz, tmp)) return 0;
  if (rho > 0) { const f = I * tmp.Br / rho; b[0] += f * dx; b[1] += f * dy; }
  b[2] += I * tmp.Bz;
  return I * tmp.A;
}

// Flux per ampere of stack T (centred at c) through a circular loop of radius r centred at p, normal z:
// Φ = ∮ A·dl, with A azimuthal about the stack axis. Exact for a coaxial loop (2πr·A), trapezoidal
// (spectrally accurate for this periodic integrand) with nθ points otherwise.
export function fluxThroughLoop(T, cx, cy, cz, px, py, pz, r, nTheta = 48) {
  const ox = px - cx, oy = py - cy, dz = pz - cz;
  if (Math.hypot(ox, oy) < 1e-9) { sampleStack(T, r, dz, tmp); return 2 * Math.PI * r * tmp.A; }
  let s = 0;
  for (let k = 0; k < nTheta; k++) {
    const th = 2 * Math.PI * k / nTheta, c = Math.cos(th), sn = Math.sin(th);
    const qx = ox + r * c, qy = oy + r * sn, rho = Math.hypot(qx, qy);
    if (rho === 0) continue;
    sampleStack(T, rho, dz, tmp);
    // A·dl = A (φ̂·t̂) r dθ with φ̂ = (-qy, qx)/rho, t̂ = (-sin, cos)
    s += tmp.A * (qy * sn + qx * c) / rho;
  }
  return s * r * 2 * Math.PI / nTheta;
}
