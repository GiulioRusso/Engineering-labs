// Projectile (with optional quadratic air drag), uniform circular motion and 1D collisions. SI units.
export const G = 9.80665;

// Projectile from (0, h0) with speed v0 at angle th (rad); drag acceleration −c·|v|·v (c = ½ρC_dA/m, 1/m).
// RK4 at dt until it lands. Returns samples { t, x, y, vx, vy }.
export function projectile({ v0, th, h0 = 0, g = G, c = 0, dt = 1e-3 }) {
  const out = { t: [0], x: [0], y: [h0], vx: [v0 * Math.cos(th)], vy: [v0 * Math.sin(th)] };
  const acc = (vx, vy) => { const v = Math.hypot(vx, vy); return [-c * v * vx, -g - c * v * vy]; };
  let [x, y, vx, vy] = [0, h0, out.vx[0], out.vy[0]], t = 0;
  for (let n = 0; n < 200000; n++) {
    const a1 = acc(vx, vy), a2 = acc(vx + a1[0] * dt / 2, vy + a1[1] * dt / 2), a3 = acc(vx + a2[0] * dt / 2, vy + a2[1] * dt / 2), a4 = acc(vx + a3[0] * dt, vy + a3[1] * dt);
    const nx = x + dt * (vx + dt / 6 * (a1[0] + a2[0] + a3[0])), ny = y + dt * (vy + dt / 6 * (a1[1] + a2[1] + a3[1]));
    const nvx = vx + dt / 6 * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]), nvy = vy + dt / 6 * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]);
    if (ny < 0) { const u = y / (y - ny); out.t.push(t + u * dt); out.x.push(x + u * (nx - x)); out.y.push(0); out.vx.push(vx + u * (nvx - vx)); out.vy.push(vy + u * (nvy - vy)); break; }
    [x, y, vx, vy] = [nx, ny, nvx, nvy]; t += dt;
    out.t.push(t); out.x.push(x); out.y.push(y); out.vx.push(vx); out.vy.push(vy);
  }
  return out;
}
// No-drag closed forms.
export const range = (v0, th, h0, g = G) => (v0 * Math.cos(th) / g) * (v0 * Math.sin(th) + Math.sqrt((v0 * Math.sin(th)) ** 2 + 2 * g * h0));
export const apex = (v0, th, h0, g = G) => h0 + (v0 * Math.sin(th)) ** 2 / (2 * g);

// Uniform circular motion: position, velocity, acceleration at time t.
export function circular(r, w, t) {
  const a = w * t;
  return { p: [r * Math.cos(a), r * Math.sin(a)], v: [-r * w * Math.sin(a), r * w * Math.cos(a)], a: [-r * w * w * Math.cos(a), -r * w * w * Math.sin(a)] };
}

// Head-on collision with restitution e (1 elastic, 0 perfectly inelastic). Velocities after impact.
export function collide(m1, m2, u1, u2, e) {
  const P = m1 * u1 + m2 * u2;
  return [(P - m2 * e * (u1 - u2)) / (m1 + m2), (P + m1 * e * (u1 - u2)) / (m1 + m2)];
}
