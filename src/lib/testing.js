// Tiny assertion helpers for model tests (run by tools/test.mjs).
export function near(got, want, tol, what = '') {
  const err = Math.abs(got - want) / Math.max(Math.abs(want), 1e-300);
  if (!(err <= tol)) throw new Error(`${what}: got ${got}, want ${want}, rel err ${err.toExponential(2)} > ${tol}`);
  return err;
}
export function ok(cond, msg) { if (!cond) throw new Error(msg); }
export const pct = (e) => `${(100 * e).toPrecision(2)} %`;
