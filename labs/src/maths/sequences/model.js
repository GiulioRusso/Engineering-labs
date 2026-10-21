// Sequences and series: terms a_n (n = 1, 2, …), partial sums S_n and their limits. Pure, no DOM.
export const KINDS = {
  geometric: { label: 'Geometric: a·rⁿ⁻¹', a: (s, n) => s.a * s.r ** (n - 1), sum: (s) => (Math.abs(s.r) < 1 ? s.a / (1 - s.r) : null), series: true },
  pseries: { label: 'p-series: 1/nᵖ', a: (s, n) => 1 / n ** s.p, sum: (s) => (s.p === 2 ? Math.PI ** 2 / 6 : s.p === 4 ? Math.PI ** 4 / 90 : null), series: true },
  alternating: { label: 'Alternating: (−1)ⁿ⁺¹/n', a: (s, n) => (n % 2 ? 1 : -1) / n, sum: () => Math.LN2, series: true },
  leibniz: { label: 'Leibniz: 4·(−1)ⁿ⁺¹/(2n − 1)', a: (s, n) => 4 * (n % 2 ? 1 : -1) / (2 * n - 1), sum: () => Math.PI, series: true },
  euler: { label: 'Sequence (1 + 1/n)ⁿ', a: (s, n) => (1 + 1 / n) ** n, sum: () => Math.E, series: false },
};

// values to plot: the terms, and what converges (partial sums for a series, the terms for a sequence)
export function sequence(s, N) {
  const K = KINDS[s.kind], a = [], S = [];
  let acc = 0;
  for (let n = 1; n <= N; n++) { const v = K.a(s, n); a.push(v); acc += v; S.push(K.series ? acc : v); }
  return { a, S, limit: K.sum(s), series: K.series };
}

// first n after which every value stays within ε of the limit (checked up to N), or null
export function settleIndex(S, limit, eps) {
  if (limit == null) return null;
  for (let i = S.length - 1; i >= 0; i--) if (Math.abs(S[i] - limit) > eps) return i + 2 <= S.length ? i + 2 : null;
  return 1;
}
