// Resultant force, torque on a pivoted bar, buoyancy of a floating block. SI units.
export const G = 9.80665, P0 = 101325;
export const resultant = (forces) => forces.reduce((s, f) => [s[0] + f[0], s[1] + f[1]], [0, 0]);
// Torque about the pivot of a force F applied at distance r along a bar, at angle a from the bar (z component).
export const torque = (r, F, a) => r * F * Math.sin(a);
export const barInertia = (M, L) => M * L * L / 3; // uniform bar about one end
// Block of side s and density rb in a liquid of density rf: equilibrium depth (clamped to s: it sinks).
export const draft = (s, rb, rf) => Math.min(s, s * rb / rf);
export const pressure = (depth, rf) => P0 + rf * G * depth;
// Bobbing of the block released with its bottom at the surface. z = depth of the bottom face (down
// positive): m z'' = m g − ρ_f g s²·clamp(z, 0, s) − c z', with c a fraction `damp` of critical damping.
// Runge–Kutta–Nyström, returns { t, z }.
export function bob({ s, rb, rf, damp = 0.25, tEnd = 6, dt = 2e-3 }) {
  const m = rb * s ** 3, A = s * s, kz = rf * G * A, c = damp * 2 * Math.sqrt(kz * m), out = { t: [0], z: [0] };
  const acc = (z, v) => (m * G - kz * Math.max(0, Math.min(s, z)) - c * v) / m;
  let z = 0, v = 0;
  for (let n = 1; n * dt <= tEnd; n++) {
    const k1 = acc(z, v), k2 = acc(z + dt / 2 * v + dt * dt / 8 * k1, v + dt / 2 * k1);
    const k3 = acc(z + dt / 2 * v + dt * dt / 8 * k1, v + dt / 2 * k2), k4 = acc(z + dt * v + dt * dt / 2 * k3, v + dt * k3);
    z += dt * v + dt * dt / 6 * (k1 + k2 + k3); v += dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
    out.t.push(n * dt); out.z.push(z);
  }
  return out;
}
