// Derivative, integral and Taylor polynomial of a few smooth functions. Pure, no DOM.
// Each function provides its exact n-th derivative d(n, x), so Taylor polynomials are exact.
function hermite(n, x) { let a = 1, b = x; if (n === 0) return 1; for (let k = 1; k < n; k++) [a, b] = [b, x * b - k * a]; return b; }
export const FUNCS = {
  sq: { label: 'x²/2', d: (n, x) => [x * x / 2, x, 1][n] ?? 0 },
  sin: { label: 'sin x', d: (n, x) => Math.sin(x + n * Math.PI / 2) },
  cubic: { label: 'x³/6 − x', d: (n, x) => [x ** 3 / 6 - x, x * x / 2 - 1, x, 1][n] ?? 0 },
  exp: { label: 'e^(x/2)', d: (n, x) => 0.5 ** n * Math.exp(x / 2) },
  gauss: { label: '2·e^(−x²/2)', d: (n, x) => 2 * (n % 2 ? -1 : 1) * hermite(n, x) * Math.exp(-x * x / 2) },
};
export const f = (k, x) => FUNCS[k].d(0, x);
export const df = (k, x) => FUNCS[k].d(1, x);

// Reference integral: composite Simpson with 20 000 panels (error far below what is displayed).
export function integral(k, a, b, n = 20000) {
  const h = (b - a) / n;
  let s = f(k, a) + f(k, b);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(k, a + i * h);
  return s * h / 3;
}
// Riemann / trapezoid sums with n strips. rule: 'left' | 'mid' | 'right' | 'trap'
export function riemann(k, a, b, n, rule) {
  const h = (b - a) / n;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const x0 = a + i * h;
    s += rule === 'left' ? f(k, x0) : rule === 'right' ? f(k, x0 + h) : rule === 'mid' ? f(k, x0 + h / 2) : (f(k, x0) + f(k, x0 + h)) / 2;
  }
  return s * h;
}
export function taylor(k, x0, N) {
  const c = []; let fact = 1;
  for (let n = 0; n <= N; n++) { if (n) fact *= n; c.push(FUNCS[k].d(n, x0) / fact); }
  return (x) => { let s = 0, p = 1; for (let n = 0; n <= N; n++) { s += c[n] * p; p *= x - x0; } return s; };
}
