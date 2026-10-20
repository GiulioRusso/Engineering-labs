// A charged particle in uniform E and B fields, integrated with the Boris pusher (exactly
// energy-conserving in a pure magnetic field). SI units. Pure, no DOM.
export const SPECIES = {
  proton: { label: 'Proton', q: 1.602176634e-19, m: 1.67262192e-27 },
  electron: { label: 'Electron', q: -1.602176634e-19, m: 9.1093837e-31 },
  alpha: { label: 'Alpha particle', q: 3.204353268e-19, m: 6.6446573e-27 },
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function boris({ q, m, E, B, v0, x0 = [0, 0, 0], dt, steps }) {
  const k = q * dt / (2 * m), out = { x: [x0.slice()], v: [v0.slice()] };
  let x = x0.slice(), v = v0.slice();
  for (let n = 0; n < steps; n++) {
    const vm = v.map((c, i) => c + k * E[i]);                       // half electric kick
    const t = B.map((c) => k * c), t2 = t[0] ** 2 + t[1] ** 2 + t[2] ** 2, s = t.map((c) => 2 * c / (1 + t2));
    const vp = vm.map((c, i) => c + cross(vm, t)[i]), vr = vm.map((c, i) => c + cross(vp, s)[i]); // magnetic rotation
    v = vr.map((c, i) => c + k * E[i]);                             // second half kick
    x = x.map((c, i) => c + v[i] * dt);
    out.x.push(x); out.v.push(v);
  }
  return out;
}
export const gyro = (q, m, B) => Math.abs(q) * B / m;               // cyclotron angular frequency, rad/s
export const larmor = (m, vperp, q, B) => m * vperp / (Math.abs(q) * B);
export const drift = (E, B) => { const b2 = B[0] ** 2 + B[1] ** 2 + B[2] ** 2; return cross(E, B).map((c) => c / b2); }; // E×B/B²
