import { seriesZ, resonance, tankZ, acPower, rcFilter, cabs, carg } from './model.js';
import { near, ok } from '../../lib/testing.js';

const P = { R: 10, L: 10e-3, C: 1e-6 };
export const tests = {
  'series RLC: purely resistive at f0'() { const { f0 } = resonance(P), Z = seriesZ(P, f0); near(Z[0], 10, 1e-9, 're'); ok(Math.abs(Z[1]) < 1e-9, 'im 0'); },
  'Q and bandwidth: |Z| = √2 R at f0 ± bw/2 (approximately)'() { const { f0, Q, bw } = resonance(P); near(Q, 10, 1e-12, 'Q'); near(cabs(seriesZ(P, f0 + bw / 2)), 10 * Math.SQRT2, 0.03, 'edge'); },
  'parallel tank: impedance peaks at R at resonance'() { const p = { R: 1000, L: 10e-3, C: 1e-6 }, { f0 } = resonance(p); near(cabs(tankZ(p, f0)), 1000, 1e-9, 'peak'); ok(cabs(tankZ(p, f0 * 2)) < 500, 'off'); },
  'power: P = ½VI cos φ, zero at 90°'() { near(acPower(10, 2, 0).P, 10, 1e-12, 'P'); ok(Math.abs(acPower(10, 2, Math.PI / 2).P) < 1e-12, 'pure reactance'); },
  'RC low-pass: −3 dB and −45° at fc'() { const r = rcFilter(1000, 1e-6, 1 / (2 * Math.PI * 1e-3)); near(r.mag, Math.SQRT1_2, 1e-12, 'mag'); near(r.ph, -Math.PI / 4, 1e-12, 'phase'); void carg; },
};
