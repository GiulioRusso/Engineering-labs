// Airborne radar: radial velocity in an engagement, and ground clutter seen from altitude. Pure, no DOM.
// Positions in m, velocities in m/s, angles in rad.
export const C0 = 299792458;
// closing speed (positive = range decreasing) between own ship o and target p
export function radialVelocity(o, p) {
  const dx = p.x - o.x, dy = p.y - o.y, R = Math.hypot(dx, dy), ux = dx / R, uy = dy / R;
  return -((p.vx - o.vx) * ux + (p.vy - o.vy) * uy);
}
export const bearing = (o, p) => Math.atan2(p.x - o.x, p.y - o.y); // from north (+y), clockwise
// Doppler of a ground point (x along track, y across, z = 0) seen from altitude h, flying along +x at v
export const clutterDoppler = (x, y, h, v, lam) => (2 * v / lam) * x / Math.hypot(x, y, h);
// ground extent of a beam of width bw at depression angle dep from altitude h: [near, far] ground ranges
export function footprint(h, dep, bw) {
  const near = h / Math.tan(dep + bw / 2), far = dep - bw / 2 > 0.002 ? h / Math.tan(dep - bw / 2) : Infinity;
  return { near, far, length: far - near, centre: h / Math.tan(dep), width: (h / Math.sin(dep)) * bw };
}
