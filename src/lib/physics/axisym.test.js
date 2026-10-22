import { loopField } from './loop.js';
import { stackTable, sampleStack, addStackField, fluxThroughLoop } from './axisym.js';
import { mutualCoaxial } from './loop.js';
import { near, ok, pct } from '../testing.js';

const f = { Br: 0, Bz: 0, A: 0 }, g = { Br: 0, Bz: 0, A: 0 };
const coil = { a: 0.04, N: 40, length: 0.156 };
const T = stackTable({ ...coil, rhoMax: 0.6, zMax: 1, hMax: 0.003 });

function exactStack(rho, z) {
  let br = 0, bz = 0, A = 0;
  for (let k = 0; k < coil.N; k++) {
    loopField(coil.a, 1, rho, z - (-coil.length / 2 + coil.length * k / (coil.N - 1)), f);
    br += f.Br; bz += f.Bz; A += f.A;
  }
  return { br, bz, A };
}

export const tests = {
  'table = exact sum over turns, ≥ 5 mm from the windings'() {
    let worst = 0, n = 0;
    for (let i = 0; i < 400; i++) {
      const rho = 0.3 * ((i * 0.618034) % 1), z = 0.8 * (((i * 0.4142136) % 1) - 0.5);
      if (Math.abs(rho - coil.a) < 0.005 && Math.abs(z) < coil.length / 2 + 0.005) continue;
      const e = exactStack(rho, z);
      sampleStack(T, rho, z, g);
      worst = Math.max(worst, Math.hypot(g.Br - e.br, g.Bz - e.bz) / Math.hypot(e.br, e.bz));
      n++;
    }
    ok(worst < 0.01, `worst ${pct(worst)} > 1 %`);
    return `${n} points, worst ${pct(worst)}, budget 1 %`;
  },
  'flux through a coaxial loop = Σ Maxwell mutual inductances'() {
    const T1 = stackTable({ a: 0.05, N: 1, length: 0, rhoMax: 0.6, zMax: 1, hMax: 0.003 });
    const e = near(fluxThroughLoop(T1, 0, 0, 0, 0, 0, 0.037, 0.02), mutualCoaxial(0.05, 0.02, 0.037), 5e-3, 'Φ');
    return `error ${pct(e)}, budget 0.5 %`;
  },
  'off-axis flux ∮A·dl = ∬Bz dS (independent quadrature)'() {
    const [px, pz, r] = [0.015, 0.03, 0.02];
    let s = 0;
    const nr = 200, nt = 120, b = [0, 0, 0];
    for (let i = 0; i < nr; i++) for (let k = 0; k < nt; k++) {
      const rr = r * (i + 0.5) / nr, th = 2 * Math.PI * k / nt;
      b[2] = 0; addStackField(T, 1, 0, 0, 0, px + rr * Math.cos(th), rr * Math.sin(th), pz, b);
      s += b[2] * rr * (r / nr) * (2 * Math.PI / nt);
    }
    const e = near(fluxThroughLoop(T, 0, 0, 0, px, 0, pz, r), s, 5e-3, 'Φ');
    return `error ${pct(e)}, budget 0.5 %`;
  },
  '∇·B ≈ 0 on a sample grid (table field, Cartesian differences)'() {
    const h = 1e-3, B = (x, y, z) => { const b = [0, 0, 0]; addStackField(T, 1, 0, 0, 0, x, y, z, b); return b; };
    let worst = 0;
    for (const x of [0.01, 0.06, 0.15]) for (const z of [-0.2, -0.05, 0.03, 0.12]) {
      const y = 0.007;
      const d = [(B(x + h, y, z)[0] - B(x - h, y, z)[0]), (B(x, y + h, z)[1] - B(x, y - h, z)[1]), (B(x, y, z + h)[2] - B(x, y, z - h)[2])];
      const scale = Math.abs(d[0]) + Math.abs(d[1]) + Math.abs(d[2]);
      worst = Math.max(worst, Math.abs(d[0] + d[1] + d[2]) / scale);
    }
    ok(worst < 0.02, `relative divergence ${worst}`);
    return `worst |∇·B| / Σ|∂Bi/∂xi| = ${worst.toExponential(1)}`;
  },
};
