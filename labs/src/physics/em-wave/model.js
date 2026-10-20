// A plane wave travelling along +x, E along z, B along y, meeting an interface at x = 0
// (a dielectric of index n2, or a perfect conductor). Normal incidence. SI units. Pure, no DOM.
export const C0 = 299792458, ETA0 = 376.730313668;
export function fresnel(n1, n2, conductor = false) {
  if (conductor) return { r: -1, t: 0, R: 1, T: 0 };
  const r = (n1 - n2) / (n1 + n2), t = 2 * n1 / (n1 + n2);
  return { r, t, R: r * r, T: (n2 / n1) * t * t }; // T counts the slower wave's lower impedance
}
// Fields at (x, t). mode: 'travel' (no interface) | 'interface' | 'conductor'. Returns [Ez, By].
export function fields({ mode, E0, f, n2 }, x, t) {
  const w = 2 * Math.PI * f, k1 = w / C0, k2 = n2 * k1;
  if (mode === 'travel') { const e = E0 * Math.cos(k1 * x - w * t); return [e, -e / C0]; }
  const { r, t: tt } = fresnel(1, n2, mode === 'conductor');
  if (x < 0) {
    const ei = E0 * Math.cos(k1 * x - w * t), er = r * E0 * Math.cos(-k1 * x - w * t);
    return [ei + er, -ei / C0 + er / C0]; // the reflected wave travels −x: its B flips sign
  }
  if (mode === 'conductor') return [0, 0];
  const et = tt * E0 * Math.cos(k2 * x - w * t);
  return [et, -et * n2 / C0];
}
