// Conic sections: a double cone cut by a tilted plane (the curve depends on the tilt vs the cone's
// slope), and the focus–directrix definition r = e·d / (1 + e cos θ) with the reflection property.
// Cone: x² + y² = (z tan α)², plane through (0, 0, h) tilted by β about the x axis: z = h + y tan β.
export function section(alpha, beta, h, n = 400) {
  const ta = Math.tan(alpha), pts = [];
  // in the plane use (x, s) with y = s cos β, z = h + s sin β; x² + y² = ta² z²
  for (let i = 0; i <= n; i++) {
    const s = -6 + 12 * i / n, y = s * Math.cos(beta), z = h + s * Math.sin(beta), r2 = (ta * z) ** 2 - y * y;
    if (r2 >= 0) { const x = Math.sqrt(r2); pts.push([x, y, z], [-x, y, z]); }
  }
  return pts;
}
// type from the plane tilt β and the cone half-angle α (both from the horizontal / axis)
export function kind(alpha, beta) { const b = Math.abs(beta), lim = Math.PI / 2 - alpha; if (b < 1e-6) return 'circle'; if (Math.abs(b - lim) < 0.01) return 'parabola'; return b < lim ? 'ellipse' : 'hyperbola'; }
export const eccentricity = (alpha, beta) => Math.sin(Math.abs(beta)) / Math.cos(alpha);
// focus–directrix polar form: r(θ) = p / (1 + e cos θ), focus at the origin
export const polarConic = (e, p, th) => p / (1 + e * Math.cos(th));
