// Gravity assist: a hyperbolic flyby in the planet's frame (speed in = speed out, direction turned by δ),
// and the same flyby seen from the Sun, where the planet's own velocity is added. SI units.
export const PLANETS = {
  jupiter: { label: 'Jupiter', mu: 1.26687e17, R: 71492e3, V: 13.07e3 },
  venus: { label: 'Venus', mu: 3.24859e14, R: 6051.8e3, V: 35.02e3 },
  earth: { label: 'Earth', mu: 3.986004e14, R: 6371e3, V: 29.78e3 },
};
// turn angle of a hyperbola with excess speed vinf and periapsis rp
export const turn = (mu, vinf, rp) => 2 * Math.asin(1 / (1 + rp * vinf * vinf / mu));

// the flyby: incoming v∞ at angle th (radians, 0 = along the planet's motion, +x); the craft passes the
// planet on its left (side = +1) or right (−1), turning its velocity by +δ or −δ
export function flyby(P, vinf, rp, th, side) {
  const d = turn(P.mu, vinf, rp), e = 1 + rp * vinf * vinf / P.mu, a = P.mu / (vinf * vinf), out = th + side * d;
  const vin = [vinf * Math.cos(th), vinf * Math.sin(th)], vout = [vinf * Math.cos(out), vinf * Math.sin(out)];
  const hin = [P.V + vin[0], vin[1]], hout = [P.V + vout[0], vout[1]];
  return { d, e, a, vin, vout, hin, hout, gain: Math.hypot(...hout) - Math.hypot(...hin), vp: Math.sqrt(vinf * vinf + 2 * P.mu / rp) };
}

// position and velocity on the hyperbola at time t from periapsis, in the planet frame, oriented so the
// craft arrives along direction th and leaves along th + side·δ
export function hyperPos(P, f, th, side, t) {
  const { e, a } = f, n = Math.sqrt(P.mu / a ** 3), M = n * t;
  let F = Math.asinh(M / e); for (let k = 0; k < 50; k++) { const g = e * Math.sinh(F) - F - M; F -= g / (e * Math.cosh(F) - 1); if (Math.abs(g) < 1e-13) break; }
  // perifocal: periapsis on +x, motion counter-clockwise
  const x = a * (e - Math.cosh(F)), y = a * Math.sqrt(e * e - 1) * Math.sinh(F), Fd = n / (e * Math.cosh(F) - 1);
  const vx = -a * Math.sinh(F) * Fd, vy = a * Math.sqrt(e * e - 1) * Math.cosh(F) * Fd;
  // far before periapsis the craft travels at angle acos(1/e) in this frame (−acos(1/e) when mirrored): rotate that onto th
  const s = side, rot = th - s * Math.acos(1 / e), c = Math.cos(rot), sn = Math.sin(rot);
  const X = x, Y = s * y, VX = vx, VY = s * vy; // mirror for a clockwise pass
  return { x: c * X - sn * Y, y: sn * X + c * Y, vx: c * VX - sn * VY, vy: sn * VX + c * VY };
}
// a craft crossing the planet's path (arriving at 0 < th < π, moving 'up' through the planet's line of motion)
// that passes behind the planet is swung clockwise, towards the planet's motion; in front, counter-clockwise
export const sideFor = (pass) => (pass === 'behind' ? -1 : 1);
// time from periapsis to reach distance L
export function timeTo(P, f, L) { const F = Math.acosh((L / f.a + 1) / f.e); return (f.e * Math.sinh(F) - F) / Math.sqrt(P.mu / f.a ** 3); }
