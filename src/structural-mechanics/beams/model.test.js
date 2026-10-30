import { statics, diagrams, section } from './model.js';
import { near, ok } from '../../lib/testing.js';

const EI = 200e9 * 6.667e-5, L = 4;
const min = (v) => Math.min(...v);
export const tests = {
  'simply supported, central load: δ = PL³/48EI, M = PL/4'() { const P = 10e3, D = diagrams('simply', L, { P, a: L / 2 }, EI); near(-min(D.y), P * L ** 3 / (48 * EI), 1e-4, 'δ'); near(Math.max(...D.M), P * L / 4, 1e-3, 'M'); },
  'simply supported, uniform load: δ = 5wL⁴/384EI'() { const w = 5e3, D = diagrams('simply', L, { w }, EI); near(-min(D.y), 5 * w * L ** 4 / (384 * EI), 1e-4, 'δ'); },
  'off-centre load: reactions Pb/L and Pa/L'() { const S = statics('simply', L, { P: 9, a: 1 }); near(S.R1, 9 * 3 / 4, 1e-12, 'R1'); near(S.R2, 9 / 4, 1e-12, 'R2'); },
  'off-centre load: deflection under it Pa²b²/3EIL'() { const P = 8e3, a = 1, b = 3, D = diagrams('simply', L, { P, a }, EI, 801), i = Math.round(a / L * 800); near(-D.y[i], P * a * a * b * b / (3 * EI * L), 1e-3, 'δa'); },
  'cantilever, tip load: δ = PL³/3EI, M(0) = −PL'() { const P = 2e3, D = diagrams('cantilever', L, { P, a: L }, EI); near(-D.y.at(-1), P * L ** 3 / (3 * EI), 1e-4, 'δ'); near(D.M[0], -P * L, 1e-9, 'M0'); },
  'cantilever, uniform load: δ = wL⁴/8EI'() { const w = 1e3, D = diagrams('cantilever', L, { w }, EI); near(-D.y.at(-1), w * L ** 4 / (8 * EI), 1e-4, 'δ'); },
  'shear is the slope of the moment'() { const D = diagrams('simply', L, { w: 3e3 }, EI), i = 100, h = D.x[1] - D.x[0]; near((D.M[i + 1] - D.M[i - 1]) / (2 * h), D.V[i], 1e-6, 'dM/dx'); },
  'I-beam: parallel-axis check, and stiffer than a rectangle of the same area'() {
    const g = { b: 0.1, h: 0.2, tf: 0.01, tw: 0.006 }, S = section('ibeam', g), web = g.tw * (g.h - 2 * g.tf) ** 3 / 12, fl = g.b * g.tf ** 3 / 12 + g.b * g.tf * ((g.h - g.tf) / 2) ** 2;
    near(S.I, web + 2 * fl, 1e-10, 'I'); const R = section('rect', { b: S.A / g.h, h: g.h }); ok(S.I > 2 * R.I, `${S.I} ${R.I}`);
  },
};
