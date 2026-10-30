import { rod, step, fluxes, heat, steady, diffusivity } from './model.js';
import { near, ok } from '../../lib/testing.js';

const run = (R, T, dt, steps, bc) => { for (let i = 0; i < steps; i++) step(R, T, dt, bc); return T; };

export const tests = {
  'one material, ends at 100 and 0 °C: the steady state is a straight line, flux k ΔT/L'() {
    const R = rod({ left: 'copper' }), bc = { fixed: true, TL: 100, TR: 0 }, T = run(R, new Float64Array(100), 50, 400, bc);
    R.x.forEach((x, i) => near(T[i] + 1, 1 + 100 * (1 - x / 0.2), 1e-9, `x = ${x}`));
    const [qL, qR] = fluxes(R, T, bc); near(qL, 401 * 100 / 0.2, 1e-9, 'flux in'); near(qR, qL, 1e-9, 'flux out');
  },
  'copper + wood: interface temperature from the two thermal resistances in series'() {
    const R = rod({ left: 'copper', right: 'wood' }), bc = { fixed: true, TL: 100, TR: 0 }, T = run(R, new Float64Array(100), 2e4, 300, bc);
    const s = steady('copper', 'wood', 0.2, 100, 0), Ti = (T[49] + T[50]) / 2, Tint = T[49] - (T[49] - T[50]) * (R.k[50] / (R.k[49] + R.k[50]));
    near(Tint, s.Ti, 1e-3, 'interface'); near(fluxes(R, T, bc)[0], s.q, 1e-3, 'flux');
    ok(Ti > 99, 'nearly all the drop is across the wood');
  },
  'insulated ends: the heat content stays constant'() {
    const R = rod({ left: 'steel' }), T = Float64Array.from(R.x, (x) => 100 * Math.exp(-(((x - 0.1) / 0.01) ** 2) / 2)), Q0 = heat(R, T);
    run(R, T, 1, 120, { fixed: false });
    near(heat(R, T), Q0, 1e-12, 'heat');
  },
  'a hot spot spreads: variance σ₀² + 2αt'() {
    const R = rod({ left: 'steel', n: 400 }), s0 = 0.01, T = Float64Array.from(R.x, (x) => Math.exp(-(((x - 0.1) / s0) ** 2) / 2));
    run(R, T, 0.05, 400, { fixed: false }); // 20 s: the tails are still far from the ends
    const m = T.reduce((s, t) => s + t, 0), v = T.reduce((s, t, i) => s + t * (R.x[i] - 0.1) ** 2, 0) / m;
    near(v, s0 * s0 + 2 * diffusivity('steel') * 20, 1e-2, 'σ²');
  },
};
