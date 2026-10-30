import { isa, sound, CRAFT, glide, bestGlideV, minSinkV, speedToFly, breguet, endurance, G } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'ISA: 11 km tropopause and the speed of sound'() {
    const a = isa(11000); near(a.T, 216.65, 1e-9, 'T'); near(a.p, 22632, 1e-4, 'p'); near(isa(0).rho, 1.225, 1e-3, 'rho0'); near(sound(0), 340.29, 1e-4, 'a0');
  },
  'glide: best L/D at the analytic speed, minimum sink at 3^-¼ of it; a headwind asks for more speed'() {
    for (const P of Object.values(CRAFT)) {
      const vb = bestGlideV(P); let best = 0, at = 0; for (let V = vb * 0.5; V < vb * 2; V += 0.001) { const g = glide(P, V).LD; if (g > best) { best = g; at = V; } }
      near(at, vb, 1e-3, `${P.label} best glide`); near(best, 1 / (2 * Math.sqrt(P.CD0 / (Math.PI * P.e * P.AR))), 1e-6, 'max L/D');
      let ms = Infinity, mv = 0; for (let V = vb * 0.4; V < vb * 1.5; V += 0.001) { const s = glide(P, V).sink; if (s < ms) { ms = s; mv = V; } } near(mv, minSinkV(P), 1e-3, 'min sink');
      ok(speedToFly(P, 10).V > speedToFly(P, 0).V + 1, 'faster into wind');
    }
  },
  'Breguet range equals the step-by-step cruise'() {
    const V = 240, LD = 18, c = 0.55, W0 = 2e6; let W = W0, x = 0, t = 0; const dt = 1;
    while (W > 0.7 * W0) { W -= c / 3600 * W / LD * dt; x += V * dt; t += dt; }
    near(x, breguet(V, LD, c, 0.3), 1e-4, 'range'); near(t / 3600, endurance(LD, c, 0.3), 1e-4, 'endurance'); void G;
  },
};
