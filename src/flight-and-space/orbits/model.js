// Earth orbits from classical elements, with the secular J2 drift of Ω and ω, and the ground track.
// SI units, angles in radians. Pure, no DOM.
export const MU = 3.986004418e14, RE = 6378137, J2 = 1.08262668e-3, WE = 7.2921159e-5;

export function solveKepler(M, e) { // E − e sin E = M, Newton
  let E = e < 0.8 ? M : Math.PI;
  for (let k = 0; k < 30; k++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-14) break; }
  return E;
}
export const period = (a) => 2 * Math.PI * Math.sqrt(a ** 3 / MU);
export const visViva = (r, a) => Math.sqrt(MU * (2 / r - 1 / a));
export function j2Rates(a, e, i) {
  const n = Math.sqrt(MU / a ** 3), p = a * (1 - e * e), f = 1.5 * n * J2 * (RE / p) ** 2;
  return { dOmega: -f * Math.cos(i), domega: 0.5 * f * (5 * Math.cos(i) ** 2 - 1) };
}
// Position (ECI, m) at time t since perigee passage; j2 adds the secular drift.
export function position({ a, e, i, raan, argp }, t, j2 = false) {
  const n = Math.sqrt(MU / a ** 3), E = solveKepler((n * t) % (2 * Math.PI), e);
  const x = a * (Math.cos(E) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  let W = raan, w = argp;
  if (j2) { const r = j2Rates(a, e, i); W += r.dOmega * t; w += r.domega * t; }
  const cW = Math.cos(W), sW = Math.sin(W), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(i), si = Math.sin(i);
  return [
    (cW * cw - sW * sw * ci) * x + (-cW * sw - sW * cw * ci) * y,
    (sW * cw + cW * sw * ci) * x + (-sW * sw + cW * cw * ci) * y,
    (sw * si) * x + (cw * si) * y,
  ];
}
// Latitude and longitude (rad) under the satellite, with the Earth turning at WE.
export function subPoint(p, t) {
  const g = WE * t, x = Math.cos(g) * p[0] + Math.sin(g) * p[1], y = -Math.sin(g) * p[0] + Math.cos(g) * p[1];
  return { lat: Math.asin(p[2] / Math.hypot(...p)), lon: Math.atan2(y, x) };
}
