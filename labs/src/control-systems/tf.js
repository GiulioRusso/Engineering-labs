// Linear time-invariant systems as transfer functions G(s) = num(s)/den(s). Pure, no DOM.
// Polynomials are coefficient arrays, highest power first: s² + 3s + 2 → [1, 3, 2]. Complex numbers are [re, im].
export const cmul = ([a, b], [c, d]) => [a * c - b * d, a * d + b * c];
export const cdiv = ([a, b], [c, d]) => { const n = c * c + d * d; return [(a * c + b * d) / n, (b * c - a * d) / n]; };
export const cabs = ([a, b]) => Math.hypot(a, b);

export function polymul(p, q) {
  const r = new Array(p.length + q.length - 1).fill(0);
  p.forEach((a, i) => q.forEach((b, j) => { r[i + j] += a * b; }));
  return r;
}
export function polyadd(p, q) {
  const n = Math.max(p.length, q.length), r = new Array(n).fill(0);
  p.forEach((a, i) => { r[n - p.length + i] += a; }); q.forEach((b, i) => { r[n - q.length + i] += b; });
  return r;
}
export const polyscale = (p, k) => p.map((a) => a * k);
export function polyval(p, s) { let r = [0, 0]; for (const a of p) { r = cmul(r, s); r[0] += a; } return r; }

// polynomial from its roots (complex roots must come in conjugate pairs; imaginary parts are dropped)
export function fromRoots(rs) { let p = [[1, 0]]; for (const r of rs) { const q = [...p.map((c) => c.slice()), [0, 0]]; for (let i = 0; i < p.length; i++) { const m = cmul(p[i], r); q[i + 1][0] -= m[0]; q[i + 1][1] -= m[1]; } p = q; } return p.map((c) => c[0]); }

// all complex roots (Durand–Kerner)
export function roots(p) {
  while (p.length && Math.abs(p[0]) < 1e-14) p = p.slice(1);
  const n = p.length - 1; if (n < 1) return [];
  const a = p.map((c) => c / p[0]);
  let z = Array.from({ length: n }, (_, k) => { const r = 1 + Math.max(...a.slice(1).map(Math.abs)); return [r * 0.9 * Math.cos(2 * Math.PI * k / n + 0.4), r * 0.9 * Math.sin(2 * Math.PI * k / n + 0.4)]; });
  for (let it = 0; it < 500; it++) {
    let moved = 0;
    z = z.map((zi, i) => {
      let d = [1, 0]; z.forEach((zj, j) => { if (j !== i) d = cmul(d, [zi[0] - zj[0], zi[1] - zj[1]]); });
      const step = cdiv(polyval(a, zi), d); moved = Math.max(moved, cabs(step));
      return [zi[0] - step[0], zi[1] - step[1]];
    });
    if (moved < 1e-13) break;
  }
  return z.map(([x, y]) => [x, Math.abs(y) < 1e-9 ? 0 : y]).sort((u, v) => u[0] - v[0] || u[1] - v[1]);
}

export const evalTF = (G, s) => cdiv(polyval(G.num, s), polyval(G.den, s));

// unity negative feedback around L: T = L / (1 + L); E = 1 / (1 + L)
export const closedLoop = (L) => ({ num: L.num, den: polyadd(L.den, L.num) });
export const errorTF = (L) => ({ num: L.den, den: polyadd(L.den, L.num) });
export const series = (A, B) => ({ num: polymul(A.num, B.num), den: polymul(A.den, B.den) });

// time response to input u(t), via the controllable canonical state space and RK4
export function simulate(G, u, T, dt = 2e-3) {
  const den = G.den.map((c) => c / G.den[0]), n = den.length - 1;
  let num = G.num.map((c) => c / G.den[0]); while (num.length < n + 1) num = [0, ...num];
  const D = num[0], c = num.slice(1).map((b, i) => b - D * den[i + 1]); // y = C x + D u, highest state first
  const f = (x, ut) => { const dx = new Array(n); dx[0] = ut - den.slice(1).reduce((s, a, i) => s + a * x[i], 0); for (let i = 1; i < n; i++) dx[i] = x[i - 1]; return dx; };
  let x = new Array(n).fill(0); const N = Math.round(T / dt), t = new Float64Array(N + 1), y = new Float64Array(N + 1);
  const out = (x, ut) => c.reduce((s, ci, i) => s + ci * x[i], 0) + D * ut;
  y[0] = out(x, u(0));
  for (let k = 0; k < N; k++) {
    const tk = k * dt, k1 = f(x, u(tk)), x2 = x.map((v, i) => v + dt / 2 * k1[i]), k2 = f(x2, u(tk + dt / 2)), x3 = x.map((v, i) => v + dt / 2 * k2[i]), k3 = f(x3, u(tk + dt / 2)), x4 = x.map((v, i) => v + dt * k3[i]), k4 = f(x4, u(tk + dt));
    x = x.map((v, i) => v + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    t[k + 1] = tk + dt; y[k + 1] = out(x, u(tk + dt));
    if (!Number.isFinite(y[k + 1]) || Math.abs(y[k + 1]) > 1e8) { return { t: t.subarray(0, k + 2), y: y.subarray(0, k + 2) }; }
  }
  return { t, y };
}
export const step = (G, T, dt) => simulate(G, () => 1, T, dt);

// overshoot (%), 2 % settling time, 10–90 % rise time and final value of a step response
export function stepInfo({ t, y }, final) {
  const yf = final ?? y[y.length - 1], peak = Math.max(...y);
  let ts = 0; for (let i = y.length - 1; i >= 0; i--) if (Math.abs(y[i] - yf) > 0.02 * Math.abs(yf)) { ts = t[Math.min(i + 1, t.length - 1)]; break; }
  const t10 = t[y.findIndex((v) => v >= 0.1 * yf)], t90 = t[y.findIndex((v) => v >= 0.9 * yf)];
  return { overshoot: Math.max(0, 100 * (peak - yf) / Math.abs(yf)), settling: ts, rise: t90 - t10, final: yf };
}

// frequency response on a log grid: magnitude (dB) and unwrapped phase (degrees)
export function bode(G, w0 = 1e-2, w1 = 1e2, n = 400) {
  const w = [], mag = [], ph = [], re = [], im = []; let prev = null, off = 0;
  for (let i = 0; i < n; i++) {
    const wi = w0 * (w1 / w0) ** (i / (n - 1)), g = evalTF(G, [0, wi]); let p = Math.atan2(g[1], g[0]) * 180 / Math.PI;
    if (prev != null) { while (p + off - prev > 180) off -= 360; while (p + off - prev < -180) off += 360; }
    p += off; prev = p; w.push(wi); mag.push(20 * Math.log10(cabs(g))); ph.push(p); re.push(g[0]); im.push(g[1]);
  }
  return { w, mag, ph, re, im };
}

// gain and phase margins of the loop L (linear interpolation between fine grid points)
const wrap = (d) => { const r = ((d + 180) % 360 + 360) % 360 - 180; return r === -180 ? 180 : r; }; // to (−180, 180]
export function margins(L, w0 = 1e-3, w1 = 1e3) {
  const B = bode(L, w0, w1, 4000), out = { gm: Infinity, wpc: null, pm: Infinity, wgc: null };
  for (let i = 1; i < B.w.length; i++) {
    const lw = (u) => B.w[i - 1] * (B.w[i] / B.w[i - 1]) ** u;
    if (out.wgc == null && B.mag[i - 1] >= 0 && B.mag[i] < 0) {
      const u = B.mag[i - 1] / (B.mag[i - 1] - B.mag[i]); out.wgc = lw(u); out.pm = wrap(B.ph[i - 1] + u * (B.ph[i] - B.ph[i - 1]) + 180);
    }
    const qa = wrap(B.ph[i - 1] + 180), qb = wrap(B.ph[i] + 180); // zero where the phase is −180° (mod 360)
    if (out.wpc == null && qa > 0 && qb <= 0 && qa - qb < 90) { const u = qa / (qa - qb); out.wpc = lw(u); out.gm = -(B.mag[i - 1] + u * (B.mag[i] - B.mag[i - 1])); }
  }
  return out;
}
