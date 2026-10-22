// Oscillators: mass on a spring and pendulum, with damping and a periodic drive. Pure, no DOM.
// spring:   x'' = −(k/m)·x − 2γ·x' + (F₀/m)·cos(ω_d t)
// pendulum: θ'' = −(g/L)·sin θ − 2γ·θ' + (F₀/mL)·cos(ω_d t)     (F₀ pushes the bob along its arc)
export const G = 9.81;

export const omega0 = (s) => (s.kind === 'pendulum' ? Math.sqrt(G / s.L) : Math.sqrt(s.k / s.m));

// RK4 from rest at the starting displacement; samples every dt up to T.
export function simulate(s, T, dt = 1e-3) {
  const w2 = omega0(s) ** 2, g = s.gamma || 0, f = (s.F0 || 0) / (s.kind === 'pendulum' ? s.m * s.L : s.m), wd = s.wd || 0;
  const acc = s.kind === 'pendulum'
    ? (t, q, v) => -w2 * Math.sin(q) - 2 * g * v + f * Math.cos(wd * t)
    : (t, q, v) => -w2 * q - 2 * g * v + f * Math.cos(wd * t);
  const n = Math.round(T / dt), t = new Float64Array(n + 1), q = new Float64Array(n + 1), v = new Float64Array(n + 1);
  q[0] = s.kind === 'pendulum' ? s.th0 : s.x0;
  for (let i = 0; i < n; i++) {
    const ti = i * dt, x = q[i], u = v[i];
    const k1x = u, k1v = acc(ti, x, u);
    const k2x = u + k1v * dt / 2, k2v = acc(ti + dt / 2, x + k1x * dt / 2, k2x);
    const k3x = u + k2v * dt / 2, k3v = acc(ti + dt / 2, x + k2x * dt / 2, k3x);
    const k4x = u + k3v * dt, k4v = acc(ti + dt, x + k3x * dt, k4x);
    q[i + 1] = x + (k1x + 2 * k2x + 2 * k3x + k4x) * dt / 6;
    v[i + 1] = u + (k1v + 2 * k2v + 2 * k3v + k4v) * dt / 6;
    t[i + 1] = ti + dt;
  }
  return { t, q, v };
}

// Energies (J): spring ½kx² + ½mv²; pendulum mgL(1 − cos θ) + ½m(Lθ')².
export function energy(s, q, v) {
  if (s.kind === 'pendulum') return { K: 0.5 * s.m * (s.L * v) ** 2, U: s.m * G * s.L * (1 - Math.cos(q)) };
  return { K: 0.5 * s.m * v * v, U: 0.5 * s.k * q * q };
}

// Exact undamped period. Pendulum: T₀ / AGM(1, cos(θ₀/2)), valid at any amplitude below π.
export function period(s) {
  const T0 = 2 * Math.PI / omega0(s);
  if (s.kind !== 'pendulum') return T0;
  let a = 1, b = Math.cos(s.th0 / 2);
  for (let i = 0; i < 30 && Math.abs(a - b) > 1e-15; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
  return T0 / a;
}

// Steady-state amplitude of the driven, damped linear oscillator.
export const steadyAmplitude = (w0, gamma, fm, wd) => fm / Math.sqrt((w0 * w0 - wd * wd) ** 2 + (2 * gamma * wd) ** 2);

// Period measured from successive upward zero crossings (linear interpolation).
export function measuredPeriod({ t, q }, skip = 0) {
  const c = [];
  for (let i = 1; i < q.length; i++) if (t[i] >= skip && q[i - 1] < 0 && q[i] >= 0) c.push(t[i - 1] + (t[i] - t[i - 1]) * (-q[i - 1]) / (q[i] - q[i - 1]));
  return c.length > 1 ? (c[c.length - 1] - c[0]) / (c.length - 1) : NaN;
}
