// Linear systems: Gaussian elimination recorded step by step (with or without partial pivoting, building
// L and U), Jacobi and Gauss–Seidel iterations, and the condition number of a 2×2 system. Pure, no DOM.

export const SYSTEMS = {
  basic: { label: 'A friendly 3 × 3', A: [[2, 1, -1], [-3, -1, 2], [-2, 1, 2]], b: [8, -11, -3] },
  zero: { label: 'Zero pivot: must swap', A: [[0, 2, 1], [1, -2, -3], [-1, 1, 2]], b: [-8, 0, 3] },
  tiny: { label: 'Tiny pivot ε', A: null, b: [1, 2, 4] },
};
export const tinyA = (eps) => [[eps, 1, 1], [1, 1, 2], [2, 3, 1]];
const copy = (M) => M.map((r) => [...r]);

// elimination on [A | b]: snapshots { M, L, perm, op, row, col } after every swap and row operation, then back
// substitution; returns { steps, x } (x = NaN entries if a zero pivot is met without pivoting)
export function eliminate(A, b, pivot = true) {
  const n = A.length, M = A.map((r, i) => [...r, b[i]]), L = A.map((_, i) => A.map((__, j) => (i === j ? 1 : 0))), perm = A.map((_, i) => i), steps = [];
  const snap = (op, row, col, kind) => steps.push({ M: copy(M), L: copy(L), perm: [...perm], op, row, col, kind });
  snap('start: the augmented matrix [A | b]', -1, -1, 'start');
  for (let k = 0; k < n - 1; k++) {
    if (pivot) { let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
      if (p !== k) { [M[k], M[p]] = [M[p], M[k]]; [perm[k], perm[p]] = [perm[p], perm[k]]; for (let j = 0; j < k; j++) [L[k][j], L[p][j]] = [L[p][j], L[k][j]]; snap(`swap rows ${k + 1} and ${p + 1}: the largest |entry| becomes the pivot`, k, k, 'swap'); } }
    if (M[k][k] === 0) { snap(`pivot ${k + 1} is zero: elimination cannot go on without a swap`, k, k, 'fail'); return { steps, x: A.map(() => NaN) }; }
    for (let i = k + 1; i < n; i++) { const m = M[i][k] / M[k][k]; L[i][k] = m; for (let j = k; j <= n; j++) M[i][j] -= m * M[k][j]; M[i][k] = 0; snap(`R${i + 1} ← R${i + 1} − (${fmt(m)})·R${k + 1}`, i, k, 'elim'); }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; snap(`back substitution: x${i + 1} = ${fmt(x[i])}`, i, i, 'back'); }
  return { steps, x };
}
const fmt = (v) => (v !== 0 && (Math.abs(v) >= 1e5 || Math.abs(v) < 1e-3) ? v.toExponential(2) : String(Number(v.toPrecision(4))));
export const matvec = (A, x) => A.map((r) => r.reduce((s, a, j) => s + a * x[j], 0));
export const matmul = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, a, k) => s + a * B[k][j], 0)));

// one Jacobi or Gauss–Seidel sweep on a 2 × 2 (or n × n) system; `n` iterates from x0
export function iterate(A, b, x0, n, method) {
  const out = [[...x0]]; let x = [...x0];
  for (let k = 0; k < n; k++) {
    const y = [...x];
    for (let i = 0; i < A.length; i++) { let s = b[i]; for (let j = 0; j < A.length; j++) if (j !== i) s -= A[i][j] * (method === 'gs' ? y[j] : x[j]); y[i] = s / A[i][i]; }
    x = y; out.push([...x]);
  }
  return out;
}
// spectral radius of the iteration matrix for a 2 × 2 system: Jacobi √|a12 a21 / (a11 a22)|, Gauss–Seidel its square
export const rhoJacobi = (A) => Math.sqrt(Math.abs(A[0][1] * A[1][0] / (A[0][0] * A[1][1])));
export const rhoGS = (A) => rhoJacobi(A) ** 2;
export const solve2 = (A, b) => { const d = A[0][0] * A[1][1] - A[0][1] * A[1][0]; return [(b[0] * A[1][1] - A[0][1] * b[1]) / d, (A[0][0] * b[1] - b[0] * A[1][0]) / d]; };
// singular values of a 2 × 2 matrix and the 2-norm condition number σmax/σmin
export function sv2(A) {
  const [a, b] = A[0], [c, d] = A[1], s1 = a * a + b * b + c * c + d * d, det = a * d - b * c, q = Math.sqrt(Math.max(0, s1 * s1 / 4 - det * det));
  const smax = Math.sqrt(s1 / 2 + q), smin = Math.sqrt(Math.max(0, s1 / 2 - q)); return { smax, smin, cond: smin ? smax / smin : Infinity };
}
// two unit-length rows at an angle θ between them (the lines they define meet at that angle)
export const rowsAt = (theta) => [[1, 0], [Math.cos(theta), Math.sin(theta)]];
