// Circular restricted three-body problem in the rotating frame, normalised units: the two primaries
// (masses 1 − μ and μ) sit at (−μ, 0) and (1 − μ, 0), their separation is 1, their angular speed is 1.
export const SYSTEMS = {
  'earth-moon': { label: 'Earth–Moon', mu: 0.012150585, a: 384400e3, T: 27.321661 * 86400, names: ['Earth', 'Moon'] },
  'sun-earth': { label: 'Sun–Earth', mu: 3.0034896e-6, a: 1.495978707e11, T: 365.256 * 86400, names: ['Sun', 'Earth'] },
  'sun-jupiter': { label: 'Sun–Jupiter', mu: 9.5388e-4, a: 7.7857e11, T: 4332.59 * 86400, names: ['Sun', 'Jupiter'] },
};
export function omega(mu, x, y) { // effective potential Ω (Ω = −U); also returns its gradient
  const r1 = Math.hypot(x + mu, y), r2 = Math.hypot(x - 1 + mu, y), a = (1 - mu) / r1 ** 3, b = mu / r2 ** 3;
  return { W: 0.5 * (x * x + y * y) + (1 - mu) / r1 + mu / r2, gx: x - a * (x + mu) - b * (x - 1 + mu), gy: y - a * y - b * y };
}
export function lagrangePoints(mu) {
  const root = (x0) => { let x = x0; for (let k = 0; k < 60; k++) { const h = 1e-7, g = omega(mu, x, 0).gx, d = (omega(mu, x + h, 0).gx - omega(mu, x - h, 0).gx) / (2 * h); x -= g / d; } return x; };
  const h = Math.cbrt(mu / 3);
  return { L1: [root(1 - mu - h), 0], L2: [root(1 - mu + h), 0], L3: [root(-1 - 5 * mu / 12), 0], L4: [0.5 - mu, Math.sqrt(3) / 2], L5: [0.5 - mu, -Math.sqrt(3) / 2] };
}
// x'' − 2y' = Ωx, y'' + 2x' = Ωy. RK4. state s = [x, y, vx, vy]; returns samples.
export function integrate(mu, s0, { dt = 2e-3, tEnd = 60 } = {}) {
  const f = ([x, y, vx, vy]) => { const o = omega(mu, x, y); return [vx, vy, o.gx + 2 * vy, o.gy - 2 * vx]; };
  const out = { t: [0], s: [s0.slice()] };
  let s = s0.slice();
  for (let n = 1; n * dt <= tEnd; n++) {
    const k1 = f(s), k2 = f(s.map((v, i) => v + dt / 2 * k1[i])), k3 = f(s.map((v, i) => v + dt / 2 * k2[i])), k4 = f(s.map((v, i) => v + dt * k3[i]));
    s = s.map((v, i) => v + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    out.t.push(n * dt); out.s.push(s);
    if (Math.hypot(s[0], s[1]) > 3) break;
  }
  return out;
}
export const jacobi = (mu, [x, y, vx, vy]) => 2 * omega(mu, x, y).W - (vx * vx + vy * vy);
export const ROUTH = 0.5 * (1 - Math.sqrt(23 / 27)); // L4/L5 linearly stable for μ below this (≈ 0.0385)
