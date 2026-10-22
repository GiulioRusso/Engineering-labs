// Geometric and wave optics: thin lens / spherical mirror imaging, Snell refraction, two-slit
// interference. SI units. Pure, no DOM.
// Thin lens (or mirror) of focal length f (> 0 converging), object at distance d_o > 0 in front.
// Returns image distance d_i (> 0: real, on the far side for a lens / in front for a mirror) and m.
export function image(f, dobj) { const di = 1 / (1 / f - 1 / dobj); return { di, m: -di / dobj, real: di > 0 }; }
export function snell(n1, n2, th1) {
  const s = n1 * Math.sin(th1) / n2;
  const crit = n1 > n2 ? Math.asin(n2 / n1) : null;
  if (Math.abs(s) > 1) return { tir: true, th2: null, crit, R: 1 };
  const th2 = Math.asin(s), c1 = Math.cos(th1), c2 = Math.cos(th2);
  const rs = (n1 * c1 - n2 * c2) / (n1 * c1 + n2 * c2), rp = (n2 * c1 - n1 * c2) / (n2 * c1 + n1 * c2);
  return { tir: false, th2, crit, R: (rs * rs + rp * rp) / 2 }; // unpolarised reflectance
}
// Two coherent point sources at (0, ±d/2), wavelength lam: intensity on a screen at x = L, height y
// (relative to the single-source value), exact path difference.
export function twoSlit(lam, d, L, y) {
  const r1 = Math.hypot(L, y - d / 2), r2 = Math.hypot(L, y + d / 2), ph = 2 * Math.PI * (r2 - r1) / lam;
  return 2 + 2 * Math.cos(ph);
}
export const fringe = (lam, d, L) => lam * L / d; // small-angle spacing of bright fringes
