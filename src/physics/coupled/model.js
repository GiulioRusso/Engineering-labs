// Coupled oscillators: N equal masses in a row, springs k to the walls and κ between neighbours.
// Solved exactly by normal modes (eigenvectors of the stiffness matrix). SI units. Pure, no DOM.

export function stiffness(N, k, kc) {
  const K = Array.from({ length: N }, () => new Float64Array(N));
  for (let i = 0; i < N; i++) {
    K[i][i] = (i === 0 ? k : kc) + (i === N - 1 ? k : kc);
    if (i > 0) K[i][i - 1] = K[i - 1][i] = -kc;
  }
  if (N === 1) K[0][0] = 2 * k;
  return K;
}
// Cyclic Jacobi for a small symmetric matrix: eigenvalues and eigenvectors (columns of V)
export function jacobi(A0) {
  const n = A0.length, A = A0.map((r) => Float64Array.from(r)), V = Array.from({ length: n }, (_, i) => Float64Array.from({ length: n }, (_, j) => +(i === j)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] ** 2;
    if (off < 1e-30) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-300) continue;
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const a = A[k][p], b = A[k][q]; A[k][p] = c * a - s * b; A[k][q] = s * a + c * b; }
      for (let k = 0; k < n; k++) { const a = A[p][k], b = A[q][k]; A[p][k] = c * a - s * b; A[q][k] = s * a + c * b; }
      for (let k = 0; k < n; k++) { const a = V[k][p], b = V[k][q]; V[k][p] = c * a - s * b; V[k][q] = s * a + c * b; }
    }
  }
  return { values: A.map((r, i) => r[i]), vectors: V };
}
// Modes sorted by frequency: { w: [ω], shape: [[component per mass]] } (shapes normalised, first nonzero > 0)
export function modes(N, k, kc, m) {
  const { values, vectors } = jacobi(stiffness(N, k, kc));
  const idx = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
  return { w: idx.map((i) => Math.sqrt(values[i] / m)), shape: idx.map((i) => { const v = vectors.map((r) => r[i]), s = Math.sign(v.find((x) => Math.abs(x) > 1e-9)); return v.map((x) => x * s); }) };
}
// Exact motion from x0 (at rest): x(t) = Σ (shapeₙ·x0) cos(ωₙ t) shapeₙ; also the energy in each mode.
export function motion(M, x0, t, out = new Float64Array(x0.length)) {
  out.fill(0);
  M.w.forEach((w, n) => { const a = M.shape[n].reduce((s, c, i) => s + c * x0[i], 0) * Math.cos(w * t); M.shape[n].forEach((c, i) => { out[i] += a * c; }); });
  return out;
}
export function velocity(M, x0, t, out = new Float64Array(x0.length)) {
  out.fill(0);
  M.w.forEach((w, n) => { const a = -M.shape[n].reduce((s, c, i) => s + c * x0[i], 0) * w * Math.sin(w * t); M.shape[n].forEach((c, i) => { out[i] += a * c; }); });
  return out;
}
export const modeEnergy = (M, x0, m) => M.w.map((w, n) => 0.5 * m * w * w * M.shape[n].reduce((s, c, i) => s + c * x0[i], 0) ** 2);
export function energy(K, m, x, v) { let E = 0; for (let i = 0; i < x.length; i++) { E += 0.5 * m * v[i] * v[i]; for (let j = 0; j < x.length; j++) E += 0.5 * x[i] * K[i][j] * x[j]; } return E; }
