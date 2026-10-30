import { PLANETS, turn, flyby, hyperPos, sideFor, timeTo } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'the hyperbola: asymptotes at the given directions, periapsis rp, speed √(v∞² + 2μ/r)'() {
    const P = PLANETS.jupiter, v = 6e3, rp = 5 * P.R;
    for (const [th, s] of [[0.3, 1], [2.5, -1], [Math.PI, 1]]) {
      const f = flyby(P, v, rp, th, s), a = hyperPos(P, f, th, s, -3e8), b = hyperPos(P, f, th, s, 3e8), p = hyperPos(P, f, th, s, 0), w = (x) => Math.atan2(Math.sin(x), Math.cos(x));
      near(Math.cos(Math.atan2(a.vy, a.vx) - th), 1, 1e-6, 'in'); near(Math.cos(Math.atan2(b.vy, b.vx) - th - s * f.d), 1, 1e-6, 'out'); void w; near(Math.hypot(p.x, p.y), rp, 1e-9, 'rp');
      for (const t of [-1e5, 2e4]) { const q = hyperPos(P, f, th, s, t); near(Math.hypot(q.vx, q.vy) ** 2 / 2 - P.mu / Math.hypot(q.x, q.y), v * v / 2, 1e-9, 'energy'); }
    }
  },
  'a numerical flyby (RK4) turns by δ = 2 asin(1/(1 + rp v∞²/μ))'() {
    const P = PLANETS.earth, v = 8e3, rp = 2 * P.R, f = flyby(P, v, rp, 0, 1), t0 = -timeTo(P, f, 300 * P.R), q = hyperPos(P, f, 0, 1, t0);
    let s = [q.x, q.y, q.vx, q.vy]; const g = (u) => { const r3 = Math.hypot(u[0], u[1]) ** 3; return [u[2], u[3], -P.mu * u[0] / r3, -P.mu * u[1] / r3]; }, h = 5;
    for (let t = 0; t < -2 * t0; t += h) { const k1 = g(s), k2 = g(s.map((x, j) => x + h / 2 * k1[j])), k3 = g(s.map((x, j) => x + h / 2 * k2[j])), k4 = g(s.map((x, j) => x + h * k3[j])); s = s.map((x, j) => x + h / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])); }
    near(Math.atan2(s[3], s[2]) - Math.atan2(q.vy, q.vx), turn(P.mu, v, rp), 2e-3, 'turn angle');
  },
  'speed unchanged in the planet’s frame; passing behind gains, in front loses'() {
    const P = PLANETS.jupiter;
    for (const th of [0.5, 1.5, 2, 2.8]) {
      const b = flyby(P, 6e3, 4 * P.R, th, sideFor('behind')), fr = flyby(P, 6e3, 4 * P.R, th, sideFor('front'));
      near(Math.hypot(...b.vout), 6e3, 1e-12, 'v∞ kept'); ok(b.gain > fr.gain, `th ${th}: ${b.gain} vs ${fr.gain}`);
    }
  },
};
