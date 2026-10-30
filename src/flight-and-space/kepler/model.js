// Kepler's laws and Newton's cannon. Sun-centred orbits in AU and years (μ = 4π² M, M in solar masses);
// the cannon in SI round the Earth.
import { solveKepler, MU, RE } from '../orbits/model.js';

export const MU_SUN = 4 * Math.PI ** 2; // AU³/yr² per solar mass
// semi-major axis (AU), eccentricity, measured sidereal period (years)
export const PLANETS = [['Mercury', 0.387, 0.2056, 0.2408], ['Venus', 0.723, 0.0068, 0.6152], ['Earth', 1, 0.0167, 1], ['Mars', 1.524, 0.0934, 1.8808], ['Jupiter', 5.203, 0.0484, 11.862], ['Saturn', 9.537, 0.0539, 29.457], ['Uranus', 19.19, 0.0473, 84.011], ['Neptune', 30.07, 0.0086, 164.79]]
  .map(([name, a, e, T]) => ({ name, a, e, T }));
export const periodYears = (a, M = 1) => 2 * Math.PI * Math.sqrt(a ** 3 / (MU_SUN * M));

// position on the ellipse (focus at the origin, perihelion on +x) at mean anomaly Mn
export function onOrbit(a, e, Mn, mu = MU_SUN) {
  const E = solveKepler(((Mn % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), e), x = a * (Math.cos(E) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(E), r = Math.hypot(x, y);
  return { x, y, r, nu: Math.atan2(y, x), v: Math.sqrt(mu * (2 / r - 1 / a)) };
}
// mean anomaly of a point seen at true anomaly nu (the time it is reached, as a fraction of 2π)
export function meanAnomaly(nu, e) {
  const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
  return ((E - e * Math.sin(E)) + 2 * Math.PI) % (2 * Math.PI);
}
// areas swept in n equal time slices, by integrating ½ r² dν numerically
export function sectorAreas(a, e, n, steps = 4000) {
  const p = a * (1 - e * e), out = [];
  for (let k = 0; k < n; k++) {
    const n0 = onOrbit(a, e, 2 * Math.PI * k / n).nu, n1raw = onOrbit(a, e, 2 * Math.PI * (k + 1) / n).nu;
    let n1 = n1raw; while (n1 <= n0) n1 += 2 * Math.PI;
    let A = 0; const h = (n1 - n0) / steps;
    for (let i = 0; i < steps; i++) { const nu = n0 + (i + 0.5) * h, r = p / (1 + e * Math.cos(nu)); A += 0.5 * r * r * h; }
    out.push(A);
  }
  return out;
}

// Newton's cannon: fired horizontally at speed v from radius r0 round the Earth
export function cannon(r0, v, mu = MU) {
  const eps = v * v / 2 - mu / r0, h = r0 * v, p = h * h / mu, e = Math.abs(p / r0 - 1); // horizontal launch: an apsis
  const peri = v * v >= mu / r0, a = eps < 0 ? -mu / (2 * eps) : Infinity;
  const vc = Math.sqrt(mu / r0), vesc = Math.sqrt(2 * mu / r0), rp = peri ? r0 : p / (1 + e), ra = eps < 0 ? (peri ? p / (1 - e) : r0) : Infinity;
  const kind = rp < RE ? 'falls back' : e < 1e-3 ? 'circular orbit' : eps < -2e-3 * mu / r0 ? 'ellipse' : Math.abs(eps) <= 2e-3 * mu / r0 ? 'parabola: just escapes' : 'hyperbola: escapes';
  // the path, ν measured from the launch point; r = p / (1 + e cos(ν − ν0)), ν0 = 0 at a periapsis launch, π at an apoapsis launch
  const nu0 = peri ? 0 : Math.PI, path = [];
  for (let k = 0; k <= 720; k++) {
    const t = 2 * Math.PI * k / 720, den = 1 + e * Math.cos(t + nu0); if (den <= 1e-6) break;
    const r = p / den; if (r > 12 * RE) break;
    path.push([r * Math.cos(t), r * Math.sin(t)]); if (r < RE) break;
  }
  return { eps, e, a, rp, ra, vc, vesc, kind, path, T: eps < 0 ? 2 * Math.PI * Math.sqrt(a ** 3 / mu) : Infinity };
}
export { RE, MU };
