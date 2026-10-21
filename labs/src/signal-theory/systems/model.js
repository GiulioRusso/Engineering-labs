// Convolution, LTI systems and FIR filters. Pure, no DOM. Continuous signals are sampled at step dt.
export const SHAPES = {
  rect: { label: 'Rectangle', f: (t) => (t >= 0 && t < 1 ? 1 : 0) },
  tri: { label: 'Triangle', f: (t) => (t >= 0 && t < 2 ? 1 - Math.abs(t - 1) : 0) },
  exp: { label: 'Decaying exponential', f: (t) => (t >= 0 ? Math.exp(-2 * t) : 0) },
  gauss: { label: 'Gaussian', f: (t) => Math.exp(-((t - 0.5) ** 2) / 0.05) },
};

// y = x * h on a common grid starting at t0 with step dt (both arrays sampled on that grid)
export function convolve(x, h, dt) {
  const y = new Float64Array(x.length + h.length - 1);
  for (let i = 0; i < x.length; i++) if (x[i]) for (let j = 0; j < h.length; j++) y[i + j] += x[i] * h[j] * dt;
  return y;
}

// LTI systems: impulse response h(t) (with a δ part `d` where needed) and frequency response H(f)
export const SYSTEMS = {
  lowpass: { label: 'RC low-pass', h: (t, s) => (t >= 0 ? Math.exp(-t / s.tau) / s.tau : 0), d: 0, H: (f, s) => { const w = 2 * Math.PI * f * s.tau; return [1 / (1 + w * w), -w / (1 + w * w)]; } },
  highpass: { label: 'RC high-pass', h: (t, s) => (t >= 0 ? -Math.exp(-t / s.tau) / s.tau : 0), d: 1, H: (f, s) => { const w = 2 * Math.PI * f * s.tau; return [w * w / (1 + w * w), w / (1 + w * w)]; } },
  echo: { label: 'Echo', h: () => 0, d: 1, echo: true, H: (f, s) => [1 + s.a * Math.cos(2 * Math.PI * f * s.T), -s.a * Math.sin(2 * Math.PI * f * s.T)] },
  average: { label: 'Moving average', h: (t, s) => (t >= 0 && t < s.T ? 1 / s.T : 0), d: 0, H: (f, s) => { const x = Math.PI * f * s.T, m = x ? Math.sin(x) / x : 1; return [m * Math.cos(x), -m * Math.sin(x)]; } },
};
export const INPUTS = {
  step: { label: 'Step', f: (t) => (t >= 0 ? 1 : 0) },
  impulse: { label: 'Impulse', f: (t, s, dt) => (t >= 0 && t < dt ? 1 / dt : 0) },
  square: { label: 'Square wave', f: (t, s) => (t >= 0 ? (((t * s.f) % 1) < 0.5 ? 1 : -1) : 0) },
  sine: { label: 'Sine', f: (t, s) => (t >= 0 ? Math.sin(2 * Math.PI * s.f * t) : 0) },
};
// output of system `sys` for input `inp` on t ∈ [0, T)
export function respond(sys, inp, s, T, dt = 2e-3) {
  const n = Math.round(T / dt), t = Array.from({ length: n }, (_, i) => i * dt), x = t.map((v) => INPUTS[inp].f(v, s, dt)), S = SYSTEMS[sys];
  const h = t.map((v) => S.h(v + dt / 2, s)), c = convolve(x, h, dt), y = t.map((v, i) => c[i] + S.d * x[i] + (S.echo && i >= Math.round(s.T / dt) ? s.a * x[i - Math.round(s.T / dt)] : 0));
  return { t, x, y };
}

// windowed-sinc FIR (Hamming): low-pass at fc, high-pass, band-pass [fc, fc2]; fs in Hz, M taps (odd)
export function fir(type, fc, fc2, fs, M) {
  const m = (M - 1) / 2, lp = (f) => Array.from({ length: M }, (_, n) => { const k = n - m, w = 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (M - 1)); return w * (k === 0 ? 2 * f / fs : Math.sin(2 * Math.PI * f * k / fs) / (Math.PI * k)); });
  const norm = (h) => { const s = h.reduce((a, b) => a + b, 0); return h.map((v) => v / s); };
  if (type === 'lowpass') return norm(lp(fc));
  if (type === 'highpass') { const h = norm(lp(fc)).map((v) => -v); h[m] += 1; return h; }
  const a = norm(lp(fc2)), b = norm(lp(fc)); return a.map((v, i) => v - b[i]);
}
export const firResponse = (h, f, fs) => { let re = 0, im = 0; h.forEach((v, n) => { re += v * Math.cos(2 * Math.PI * f * n / fs); im -= v * Math.sin(2 * Math.PI * f * n / fs); }); return Math.hypot(re, im); };
export const filter = (x, h) => x.map((_, i) => { let s = 0; for (let j = 0; j < h.length; j++) if (i - j >= 0) s += h[j] * x[i - j]; return s; });
