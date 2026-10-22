import { coaxZ0, gamma, vswr, gammaAt, vmag, zFromGamma, smithGrid, cutoff, beta, vp, vg, modes, propagate, slabModes, slabProfile, C0 } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'RG-58-like coax: b/a = 3.5, εr = 2.25 → about 50 Ω'() { near(coaxZ0(3.5, 2.25), 50.1, 0.01, 'Z0'); },
  'reflections: matched 0, short −1, VSWR of 100 Ω on 50 Ω is 2'() { near(Math.hypot(...gamma(50, 0)) + 1, 1, 1e-12, 'matched'); near(gamma(0, 0)[0], -1, 1e-12, 'short'); near(vswr(gamma(100, 0)), 2, 1e-12, 'VSWR'); },
  'a λ/4 line turns a short into an open; λ/2 repeats'() { near(gammaAt([-1, 0], 0.25)[0], 1, 1e-12, 'λ/4'); const g = gamma(30, 20); near(gammaAt(g, 0.5)[0], g[0], 1e-12, 'λ/2'); near(zFromGamma(gamma(30, 20))[0], 0.6, 1e-12, 'z back'); ok(vmag([-1, 0], 0) < 1e-12, 'voltage null at a short'); ok(smithGrid().length > 6, 'grid'); },
  'WR-90: TE10 cutoff 6.56 GHz, TE20 at twice'() { const a = 22.86e-3, b = 10.16e-3; near(cutoff(1, 0, a, b) / 1e9, 6.557, 1e-3, 'TE10'); near(cutoff(2, 0, a, b), 2 * cutoff(1, 0, a, b), 1e-12, 'TE20'); ok(modes(a, b, 10e9)[0].name === 'TE10', 'dominant'); },
  'vp·vg = c², group delay matches L/vg'() { const fc = 6.56e9, f = 10e9; near(vp(f, fc) * vg(f, fc), C0 * C0, 1e-9, 'product'); near(beta(f, fc), 2 * Math.PI * f / vp(f, fc), 1e-9, 'β'); const L = 3, P = propagate(f, 2e-9, L, fc), pk = (y) => { let k = 0; for (let i = 0; i < y.length; i++) if (Math.abs(y[i]) > Math.abs(y[k])) k = i; return P.t[k]; }; near(pk(P.y) - pk(P.x), L / vg(f, fc), 0.03, 'delay'); },
  'slab: V < π/2 → one mode; profile continuous at the edge'() { const s = slabModes(1e-6, 1.48, 1.46, 1.55e-6); ok(s.V < Math.PI / 2 && s.modes.length === 1, `V ${s.V} modes ${s.modes.length}`); const t = slabModes(5e-6, 1.48, 1.46, 1.55e-6); ok(t.modes.length >= 3, 'multimode'); const md = t.modes[1]; near(slabProfile(md, 1 - 1e-9) + 2, slabProfile(md, 1 + 1e-9) + 2, 1e-6, 'continuous'); },
};
