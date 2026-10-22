// The basic parts one at a time: Ohm's law and power, the capacitor and the inductor under a square-wave
// source (exponential charge and discharge), all three under a sine (phase), and an LC pair trading
// energy. SI units. Pure, no DOM.

// square wave 0 → V for the first half of the period P, 0 for the second; first-order response with
// time constant tau of a quantity that settles to V when on. Starts from rest, exact piecewise solution.
export function firstOrder(t, { V = 5, tau = 1e-3, P = 10e-3 }) {
  const h = P / 2, n = Math.floor(t / h); let x = 0;
  for (let k = 0; k < n; k++) { const tgt = k % 2 ? 0 : V; x = tgt + (x - tgt) * Math.exp(-h / tau); }
  const tgt = n % 2 ? 0 : V; return { x: tgt + (x - tgt) * Math.exp(-(t - n * h) / tau), on: n % 2 === 0, tgt };
}
// RC: capacitor voltage and current; RL: inductor current and voltage
export function rc(t, { V = 5, R = 1e3, C = 1e-6, P }) { const f = firstOrder(t, { V, tau: R * C, P }), vs = f.on ? V : 0; return { vC: f.x, i: (vs - f.x) / R, vs }; }
export function rl(t, { V = 5, R = 100, L = 0.1, P }) { const f = firstOrder(t, { V: V / R, tau: L / R, P }), vs = f.on ? V : 0; return { i: f.x, vL: vs - f.x * R, vs }; }

// each part driven by V sin(ωt): current amplitude and phase lead of current over voltage
export function sineDrive(kind, { V = 1, f = 50, R = 100, C = 10e-6, L = 0.1 }) {
  const w = 2 * Math.PI * f;
  if (kind === 'R') return { I: V / R, phi: 0, Z: R };
  if (kind === 'C') return { I: V * w * C, phi: Math.PI / 2, Z: 1 / (w * C) };
  return { I: V / (w * L), phi: -Math.PI / 2, Z: w * L };
}

// LC tank (with a small series R) released from the capacitor charged to V0
export function lcTank(t, { V0 = 5, L = 1e-3, C = 1e-6, R = 0 }) {
  const w0 = 1 / Math.sqrt(L * C), a = R / (2 * L), wd = Math.sqrt(Math.max(w0 * w0 - a * a, 1e-12)), e = Math.exp(-a * t);
  const vC = V0 * e * (Math.cos(wd * t) + a / wd * Math.sin(wd * t)), i = -C * V0 * e * (-(a * a + wd * wd) / wd) * Math.sin(wd * t) * -1;
  return { vC, i, EC: 0.5 * C * vC * vC, EL: 0.5 * L * i * i, w0 };
}
