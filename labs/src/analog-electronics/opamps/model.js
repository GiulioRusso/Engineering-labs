// Op-amps: the ideal virtual-short gains, the error of a finite open-loop gain, gain–bandwidth and slew
// rate in the time domain, DC errors (offset and bias current), stability of a two-pole loop (phase margin
// and step response), and the Sallen-Key second-order filter. SI units. Pure, no DOM.
export const RAIL = 12;

export function idealGain(cfg, R1, R2) {
  if (cfg === 'inv') return -R2 / R1;
  if (cfg === 'non') return 1 + R2 / R1;
  return 1;
}
// closed loop with finite A (non-inverting form, β = R1/(R1+R2))
export const finiteGain = (A, beta) => A / (1 + A * beta);

// single-pole closed loop (f3 = GBW/G) followed by a slew-rate limit; sine of amplitude Vp at f
export function speed({ G = 10, GBW = 1e6, SR = 0.5e6, Vp = 0.1, f = 10e3, cycles = 3 }) {
  const f3 = GBW / G, w = 2 * Math.PI * f3, T = cycles / f, n = 2000, dt = T / n, t = [], x = [], y = [];
  let v = 0;
  for (let i = 0; i < n; i++) { const tt = i * dt, target = G * Vp * Math.sin(2 * Math.PI * f * tt); let dv = (target - v) * w * dt; const lim = SR * dt; if (Math.abs(dv) > lim) dv = Math.sign(dv) * lim; v = Math.max(-RAIL, Math.min(RAIL, v + dv)); t.push(tt); x.push(G * Vp * Math.sin(2 * Math.PI * f * tt)); y.push(v); }
  return { t, x, y, f3, fpbw: SR / (2 * Math.PI * G * Vp) };
}

// output error from input offset Vos and bias current Ib; compensated = resistor R1‖R2 in the + input
export function dcError({ Vos = 2e-3, Ib = 100e-9, Ios = 10e-9, R1 = 1e3, R2 = 100e3, comp = false }) {
  const ng = 1 + R2 / R1, eV = Vos * ng, eI = comp ? Ios * R2 : Ib * R2;
  return { ng, eV, eI, total: eV + eI };
}

// two-pole op-amp A(s) = A0/((1+s/w1)(1+s/w2)) with feedback β
export function loop({ A0 = 1e5, f1 = 10, f2 = 2e6, beta = 1 }) {
  const mag = (f) => A0 * beta / Math.hypot(1, f / f1) / Math.hypot(1, f / f2), ph = (f) => -(Math.atan(f / f1) + Math.atan(f / f2)) * 180 / Math.PI;
  let lo = 0, hi = 12; if (mag(1) < 1) return { mag, ph, fc: NaN, pm: 180 };
  for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (mag(10 ** m) > 1) lo = m; else hi = m; }
  const fc = 10 ** lo; return { mag, ph, fc, pm: 180 + ph(fc) };
}
// closed-loop unit step response of that loop (output normalised by 1/β)
export function stepResponse({ A0 = 1e5, f1 = 10, f2 = 2e6, beta = 1, T }) {
  const w1 = 2 * Math.PI * f1, w2 = 2 * Math.PI * f2, n = 2000, dt = T / n / 40, t = [], y = []; let u = 0, v = 0;
  for (let i = 0; i < n * 40; i++) { const e = 1 - beta * v; u += w1 * (A0 * e - u) * dt; v += w2 * (u - v) * dt; if (i % 40 === 0) { t.push(i * dt); y.push(v * beta); } }
  return { t, y };
}

// Sallen-Key low-pass, equal R and C, gain K: w0 = 1/RC, Q = 1/(3 − K)
export function sallenKey({ R = 10e3, C = 10e-9, K = 1.586 }) {
  const w0 = 1 / (R * C), Q = 1 / Math.max(3 - K, 1e-6), f0 = w0 / (2 * Math.PI);
  const H = (f) => { const s = 2 * Math.PI * f, re = w0 * w0 - s * s, im = w0 / Q * s; return K * w0 * w0 / Math.hypot(re, im); };
  const z = 1 / (2 * Q), poles = z < 1 ? [[-z * w0, w0 * Math.sqrt(1 - z * z)], [-z * w0, -w0 * Math.sqrt(1 - z * z)]] : [[w0 * (-z + Math.sqrt(z * z - 1)), 0], [w0 * (-z - Math.sqrt(z * z - 1)), 0]];
  return { w0, f0, Q, H, poles, stable: K < 3 };
}
