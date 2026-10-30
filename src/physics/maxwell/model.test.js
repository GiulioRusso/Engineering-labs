import { ellip, ring, magnet, magnetB, chargeE, sphereFlux, fieldLine, loop, circulation, enclosed, capacitor, MU0 } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'elliptic integrals and the ring field: axis formula and Biot–Savart'() {
    const [K, E] = ellip(0.5); near(K, 1.8540746773013719, 1e-12, 'K(½)'); near(E, 1.3506438810476755, 1e-12, 'E(½)');
    const sum = [0, 0, 0], n = 4000; // brute force: ring of radius 0.3 in the x = 0 plane, at (0.2, 0.25, 0)
    for (let i = 0; i < n; i++) { const p = 2 * Math.PI * i / n, dl = [0, -Math.sin(p), Math.cos(p)].map((c) => c * 2 * Math.PI * 0.3 / n), r = [0.2, 0.25 - 0.3 * Math.cos(p), -0.3 * Math.sin(p)], m = Math.hypot(...r) ** 3;
      sum[0] += (dl[1] * r[2] - dl[2] * r[1]) / (4 * Math.PI * m); sum[1] += (dl[2] * r[0] - dl[0] * r[2]) / (4 * Math.PI * m); }
    const [bz, br] = ring(0.3, 0.2, 0.25); near(bz, sum[0], 1e-6, 'Bz'); near(br, sum[1], 1e-6, 'Brho');
    near(ring(0.3, 0.4, 0)[0], 0.09 / (2 * 0.25 ** 1.5), 1e-12, 'on the axis');
  },
  'no magnetic charge: zero flux through any sphere; a charge gives q'() {
    const M = magnet(), F = (x, y, z, b) => magnetB(M, x, y, z, b);
    for (const [cx, R] of [[0, 1.1], [0.6, 0.5], [-0.3, 0.45], [1.8, 0.5]]) { const f = sphereFlux(F, cx, 0, R, 120); ok(Math.abs(f.net) < 0.01 * Math.max(f.out, 1e-6), `magnet, sphere at ${cx} r ${R}: net ${f.net} vs out ${f.out}`); }
    near(sphereFlux((x, y, z, b) => chargeE(2, 0.1, 0.2, x, y, z, b), 0, 0, 0.8).net, 2, 1e-3, 'charge inside');
    ok(Math.abs(sphereFlux((x, y, z, b) => chargeE(2, 1.5, 0, x, y, z, b), 0, 0, 0.8).net) < 1e-3, 'charge outside');
  },
  'magnetic field lines close on themselves'() {
    const M = magnet(), L = fieldLine((x, y, z, b) => magnetB(M, x, y, z, b), 0, 0.2, { maxLen: 20 }), [x, y] = L.at(-1);
    ok(Math.hypot(x, y - 0.2) < 0.02 && L.length < 2000, `back to the start after ${L.length} steps`);
  },
  "Ampère: ∮B·dl = enclosed current, for any shape"() {
    const W = [{ x: 0.3, y: 0, I: 2 }, { x: -0.5, y: 0.4, I: -1 }, { x: 1.4, y: 1.4, I: 5 }];
    for (const [sh, cx, cy, R] of [['circle', 0, 0, 1], ['square', 0.1, 0.2, 0.9], ['circle', 0.3, 0, 0.2], ['square', 1.2, -1, 0.5]]) {
      const P = loop(sh, cx, cy, R, 4000); near(circulation(W, P).sum + 10, enclosed(W, P) + 10, 1e-5, `${sh} at ${cx},${cy}`);
    }
  },
  'displacement current: same B whichever surface; it equals the wire current'() {
    const p = { I: 1.5, a: 0.05, r: 0.08 }, flat = capacitor({ ...p, where: 'wire', surface: 'flat' }), bag = capacitor({ ...p, where: 'wire', surface: 'bulge' }), gap = capacitor({ ...p, where: 'gap', surface: 'flat' });
    near(flat.total, bag.total, 1e-12, 'flat vs bag'); ok(flat.cond === 1.5 && bag.cond === 0, 'conduction differs');
    near(gap.B, MU0 * 1.5 / (2 * Math.PI * 0.08), 1e-12, 'outside the plates as round the wire');
    near(capacitor({ ...p, r: 0.025, where: 'gap', surface: 'flat' }).B, MU0 * 1.5 * 0.025 / (2 * Math.PI * 0.05 ** 2), 1e-12, 'inside: grows with r');
  },
};
