// Beams: phased-array fields (near field, far-field pattern with taper), a 2-D FDTD Maxwell solver,
// Gaussian beams for pointing, lobing (Δ/Σ) and nodding search geometry. Pure, no DOM.
// Lengths in wavelengths unless stated.

export const TAPERS = { uniform: () => 1, hamming: (n, N) => (N < 2 ? 1 : 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1))), taylor: (n, N) => (N < 2 ? 1 : 0.5 - 0.5 * Math.cos(2 * Math.PI * (n + 0.5) / N) * 0.85 + 0.15) };
export const elements = (N, d) => Array.from({ length: N }, (_, n) => (n - (N - 1) / 2) * d);

// instantaneous field of N line sources (cylindrical waves) at (x, y), phase ωt; steering β_n = −k d n sin θ0
export function nearField(x, y, wt, { N, d, steer, taper }) {
  let s = 0; const k = 2 * Math.PI, xs = elements(N, d), st = Math.sin(steer);
  for (let n = 0; n < N; n++) {
    const dx = x - xs[n], R = Math.hypot(dx, y) + 1e-6, g = y / R > 0 ? Math.sqrt(y / R) : 0; // element pattern ∝ √cos θ
    s += TAPERS[taper](n, N) * g * Math.cos(wt - k * R - k * xs[n] * st) / Math.sqrt(R);
  }
  return s;
}
// far-field array factor (normalised) at angle θ from broadside, with taper
export function arrayFactor(theta, { N, d, steer, taper }) {
  let re = 0, im = 0, w = 0; const xs = elements(N, d), u = Math.sin(theta) - Math.sin(steer);
  for (let n = 0; n < N; n++) { const a = TAPERS[taper](n, N), ph = 2 * Math.PI * xs[n] * u; re += a * Math.cos(ph); im += a * Math.sin(ph); w += a; }
  return Math.hypot(re, im) / w;
}
export const gratingFree = (d, steer) => d < 1 / (1 + Math.abs(Math.sin(steer)));

// pattern metrics: −3 dB beam width (deg) and peak sidelobe (dB) of a sampled pattern in dB vs angle (deg)
export function patternMetrics(th, dB) {
  let pk = 0; for (let i = 1; i < dB.length; i++) if (dB[i] > dB[pk]) pk = i;
  let a = pk, b = pk; while (a > 0 && dB[a] > -3) a--; while (b < dB.length - 1 && dB[b] > -3) b++;
  let l = pk, r = pk; while (l > 0 && dB[l - 1] < dB[l]) l--; while (r < dB.length - 1 && dB[r + 1] < dB[r]) r++;
  let sl = -Infinity; for (let i = 0; i < dB.length; i++) if (i < l || i > r) sl = Math.max(sl, dB[i]);
  return { bw: th[b] - th[a], psl: sl };
}

// ------------------------------------------------------------------ 2-D FDTD (TMz: Ez, Hx, Hy), Yee leapfrog
// grid nx × ny, cell = 1/ppw wavelength, Courant number S = c dt / dx; PEC cells where mask = 1;
// a graded conductivity layer absorbs at the borders.
export function createFDTD(nx, ny, { S = 0.5, ppw = 20, pml = 16 } = {}) {
  const Ez = new Float64Array(nx * ny), Hx = new Float64Array(nx * ny), Hy = new Float64Array(nx * ny), pec = new Uint8Array(nx * ny), damp = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const d = Math.min(i, j, nx - 1 - i, ny - 1 - j); damp[j * nx + i] = d < pml ? 1 - 0.35 * ((pml - d) / pml) ** 3 : 1; }
  let n = 0;
  return {
    nx, ny, Ez, Hx, Hy, pec, S, ppw,
    get step() { return n; },
    reset() { Ez.fill(0); Hx.fill(0); Hy.fill(0); n = 0; },
    run(steps, src) {
      for (let s = 0; s < steps; s++) {
        for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; Hx[k] = (Hx[k] - S * (Ez[k + nx] - Ez[k])) * damp[k]; }
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx - 1; i++) { const k = j * nx + i; Hy[k] = (Hy[k] + S * (Ez[k + 1] - Ez[k])) * damp[k]; }
        for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++) { const k = j * nx + i; Ez[k] = pec[k] ? 0 : (Ez[k] + S * ((Hy[k] - Hy[k - 1]) - (Hx[k] - Hx[k - nx]))) * damp[k]; }
        n++; if (src) src(n, Ez);
      }
    },
    energy() { let e = 0; for (let k = 0; k < nx * ny; k++) e += Ez[k] * Ez[k] + Hx[k] * Hx[k] + Hy[k] * Hy[k]; return e; },
  };
}

// ------------------------------------------------------------------ Gaussian beams, pointing, lobing
export const gain0 = (bwDeg) => 4 * Math.PI / (bwDeg * Math.PI / 180) ** 2;          // pencil beam, linear
export const beamGain = (psiDeg, bwDeg) => Math.exp(-2.773 * (psiDeg / bwDeg) ** 2);   // relative, G/G0
export const friis = (PtW, Gt, Gr, lam, R) => PtW * Gt * Gr * (lam / (4 * Math.PI * R)) ** 2;
// two beams squinted by ±sq around boresight b: amplitudes A, B and the error ratio Δ/Σ for a target at θ
export function lobes(theta, b, sq, bw) { const A = Math.sqrt(beamGain(theta - (b - sq), bw)), B = Math.sqrt(beamGain(theta - (b + sq), bw)); return { A, B, err: (B - A) / (B + A) }; }
// nodding search: height covered by a bar of elevation width bw at range R; frame time
export const barHeight = (R, bwDeg) => 2 * R * Math.tan(bwDeg * Math.PI / 360);
export const frameTime = (solidDeg2, bwAz, bwEl, np, prf) => (solidDeg2 / (bwAz * bwEl)) * np / prf;
