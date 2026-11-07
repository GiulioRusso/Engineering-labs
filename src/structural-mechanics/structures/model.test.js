import { makeTruss, solveTruss, torsion, kirsch, ktEllipse, life, snCurve, SN, propped } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'trusses are statically determinate; reactions balance the load; the midspan bottom chord carries M/h'() {
    for (const t of ['pratt', 'howe', 'warren']) {
      const T = makeTruss(t, 4, 8, 2); near(T.M.length + 3, 2 * T.J.length, 0, `${t}: m + 3 = 2j`);
      const S = solveTruss(T, { 2: [0, -10e3] }); near(S.Ay + S.By, 10e3, 1e-9, `${t} ΣFy`); near(S.Ay, 5e3, 1e-9, `${t} symmetric`); ok(Math.abs(S.Ax) < 1e-6, 'no horizontal reaction');
      const k = T.M.findIndex(([p, q]) => p === 1 && q === 2), want = 5e3 * (t === 'pratt' ? 2 : 4) / 2;   // moment about the top joint the cut passes (x = 2 m Pratt, 4 m Howe) ÷ height
      if (t !== 'warren') near(S.f[k], want, 1e-9, `${t} bottom chord in tension`);
    }
    const W = makeTruss('warren', 4, 8, 2), S = solveTruss(W, { 2: [0, -10e3] }), top = W.M.findIndex(([p, q]) => p === 6 && q === 7); ok(S.f[top] < 0, 'top chord in compression');
  },
  'torsion: τ grows linearly with r; φ = TL/(GJ); a hollow shaft of the same mass is stiffer and stronger'() {
    const s = torsion(1000, 0.02, 0, 1, 80e9); near(s.tau(0.01), s.tauMax / 2, 1e-12, 'linear'); near(s.phi, 1000 / (80e9 * Math.PI / 2 * 0.02 ** 4), 1e-12, 'φ');
    const ri = 0.02, ro = Math.sqrt(0.02 ** 2 + ri ** 2), h = torsion(1000, ro, ri, 1, 80e9); near(h.area, s.area, 1e-12, 'same mass'); ok(h.tauMax < s.tauMax / 2 && h.phi < s.phi / 2, 'hollow wins');
  },
  'Kirsch: 3σ at the side of the hole, 0 at its front, σ far away; Inglis Kt = 1 + 2a/b'() {
    near(kirsch(0, 1, 1, 1), 3, 1e-12, '3σ'); ok(Math.abs(kirsch(1, 0, 1, 1)) < 1e-12, 'free surface in front: σxx = 0'); near(kirsch(0, 60, 1, 1), 1, 1e-3, 'far'); near(kirsch(0, 2, 1, 1), 1 + 0.5 / 4 + 1.5 / 16, 1e-12, 'along the section');
    near(ktEllipse(1), 3, 0, 'circle');
  },
  'fatigue: Basquin life inverts the curve; below the endurance limit the life is infinite'() {
    const N = life(400e6); near(snCurve(N), 400e6, 1e-9, 'inverse'); ok(life(200e6) === Infinity, 'endurance'); ok(life(3 * 200e6) < life(400e6), 'a hole that triples the stress shortens life');
    near(SN.sf * (2 * N) ** SN.b, 400e6, 1e-9, 'Basquin');
  },
  'propped cantilever: R = 3wL/8, wall moment −wL²/8, no deflection at the roller'() {
    const L = 4, w = 10e3, P = propped(L, { w }, 1e7); near(P.R, 3 * w * L / 8, 1e-5, 'R'); near(P.M[0], -w * L * L / 8, 1e-5, 'wall moment'); ok(Math.abs(P.y.at(-1)) < 1e-12, 'y(L) = 0');
    const Q = propped(L, { P: 20e3, a: L / 2 }, 1e7); near(Q.R, 5 * 20e3 / 16, 1e-5, 'point load at midspan: 5P/16');
  },
};
