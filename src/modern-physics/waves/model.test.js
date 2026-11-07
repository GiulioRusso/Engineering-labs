import { lambdaE, twoSlit, hits, packet, barrier, transmission, compton, LC, H, ME, C } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'de Broglie: a 100 eV electron has λ = 0.1226 nm; two-slit maxima are λ/d apart; a detector removes the fringes'() {
    near(lambdaE(100) * 1e9, 0.12264, 1e-4, 'λ');
    const lam = 1e-10, d = 1e-7, a = 2e-8; near(twoSlit(lam / d, lam, d, a), twoSlit(0, lam, d, a) * (Math.sin(Math.PI * a / d) / (Math.PI * a / d)) ** 2, 1e-6, 'next maximum');
    ok(twoSlit(Math.asin(lam / (2 * d)), lam, d, a) < 1e-20, 'dark fringe'); ok(twoSlit(lam / (2 * d), lam, d, a, true) > 0.9, 'detector: no dark fringe');
    const h = hits(4000, lam, d, a, false, 3 * lam / d); ok(h.filter((t) => Math.abs(t - lam / (2 * d)) < 0.05 * lam / d).length < 0.01 * h.length, 'few hits on a dark fringe');
  },
  'uncertainty: a plain Gaussian packet has Δx·Δk = ½ exactly; a chirp makes it larger'() {
    for (const s of [0.5, 1, 2]) near(packet(s, 3, 0).product, 0.5, 1e-6, `σ = ${s}`);
    const p = packet(1, 0, 0.3); ok(p.product > 0.7, `chirp ${p.product}`); near(p.product, 0.5 * Math.sqrt(1 + 16 * 0.09), 1e-4, 'closed form ½√(1 + 16c²σ⁴)');
  },
  'tunnelling: the matched wavefunction gives T + R = 1 and the textbook T, below and above the barrier'() {
    for (const [e, v, a] of [[2, 5, 0.5e-9], [2, 5, 1e-9], [8, 5, 0.6e-9]]) { const B = barrier(e, v, a); near(B.T + B.R, 1, 1e-9, 'T + R'); near(B.T, transmission(e, v, a), 1e-9, `T(${e}, ${v}, ${a})`); }
    const p0 = barrier(2, 5, 1e-9).psi(1e-9 + 1e-16), p1 = barrier(2, 5, 1e-9).psi(1e-9 - 1e-16); near(p0[0], p1[0], 1e-5, 'ψ continuous at x = a');
    ok(transmission(2, 5, 1e-9) < transmission(2, 5, 0.5e-9) ** 1.5, 'roughly exponential in width');
  },
  'Compton: Δλ = λc(1 − cos θ), λc = h/(mₑc) = 2.426 pm; energy is shared, momentum balances'() {
    near(LC * 1e12, 2.42631, 1e-4, 'λc'); near(compton(10e-12, Math.PI / 2).dl, LC, 1e-12, '90°'); near(compton(10e-12, Math.PI).dl, 2 * LC, 1e-12, '180°');
    const r = compton(5e-12, 1.1); near(r.E1, r.E2 + r.Ke, 1e-12, 'energy');
    const p1 = H / 5e-12, p2 = H / r.lam2, pe = Math.sqrt((r.Ke * 1.602176634e-19 / C) ** 2 + 2 * r.Ke * 1.602176634e-19 * ME);
    near(p1, p2 * Math.cos(1.1) + pe * Math.cos(r.phi), 1e-9, 'p along'); near(p2 * Math.sin(1.1), pe * Math.sin(r.phi), 1e-9, 'p across');
  },
};
