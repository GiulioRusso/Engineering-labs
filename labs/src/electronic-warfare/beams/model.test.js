import { arrayFactor, patternMetrics, gratingFree, createFDTD, gain0, beamGain, lobes, barHeight, nearField } from './model.js';
import { near, ok } from '../../lib/testing.js';

const pat = (o) => { const th = [], dB = []; for (let i = 0; i <= 3600; i++) { const t = -90 + 0.05 * i; th.push(t); dB.push(20 * Math.log10(Math.max(1e-6, arrayFactor(t * Math.PI / 180, o)))); } return patternMetrics(th, dB); };
export const tests = {
  'N = 16, d = λ/2: uniform −13.2 dB, 6.4° beam; Hamming below −39 dB and wider'() {
    const u = pat({ N: 16, d: 0.5, steer: 0, taper: 'uniform' }), h = pat({ N: 16, d: 0.5, steer: 0, taper: 'hamming' });
    near(u.psl, -13.15, 0.02, 'uniform PSL'); near(u.bw, 0.886 / 8 * 180 / Math.PI, 0.03, 'beam width'); ok(h.psl < -39 && h.bw > 1.4 * u.bw, `Hamming ${h.psl} ${h.bw}`);
  },
  'grating lobe at full strength once d > λ/(1 + |sin θ0|)'() {
    ok(gratingFree(0.6, 0.5) && !gratingFree(0.7, 0.5), 'threshold');
    const o = { N: 8, d: 1, steer: 20 * Math.PI / 180, taper: 'uniform' }, g = Math.asin(Math.sin(o.steer) - 1); near(arrayFactor(g, o), 1, 1e-9, 'second beam');
  },
  'near field: the beam points where it was steered'() {
    const o = { N: 16, d: 0.5, steer: 0.5, taper: 'uniform' }; let best = -1, bx = 0; const R = 200;
    for (let a = -1.2; a <= 1.2; a += 0.01) { let p = 0; for (let k = 0; k < 16; k++) { const v = nearField(R * Math.sin(a), R * Math.cos(a), 2 * Math.PI * k / 16, o); p += v * v; } if (p > best) { best = p; bx = a; } }
    near(bx, 0.5, 0.03, 'steering angle');
  },
  'FDTD: stable at S = 0.70, unstable at S = 0.75 (2-D Courant limit 1/√2)'() {
    const run = (S) => { const F = createFDTD(60, 60, { S, pml: 0 }); F.run(300, (n, Ez) => { if (n < 30) Ez[30 * 60 + 30] += Math.sin(n * 0.3); }); return F.energy(); };
    ok(run(0.7) < 1e6, 'bounded'); ok(run(0.75) > 1e12, 'blows up');
  },
  'FDTD: a pulse travels at c (S cells per step)'() {
    const F = createFDTD(240, 60, { S: 0.5, pml: 0 }), probe = 30 * 240 + 120; let best = 0, tPeak = 0;
    F.run(260, (n, Ez) => { if (n < 25) for (let j = 1; j < 60; j++) Ez[j * 240 + 40] += Math.exp(-(((n - 12) / 4) ** 2)); if (Math.abs(Ez[probe]) > best) { best = Math.abs(Ez[probe]); tPeak = n; } });
    near(tPeak - 12, 80 / 0.5, 0.03, 'plane-wave peak arrives after distance / S steps');
  },
  'pointing and lobing'() {
    near(10 * Math.log10(gain0(2) / gain0(4)), 6.02, 1e-3, 'half the beam width: +6 dB'); near(-10 * Math.log10(beamGain(4, 4)), 12.04, 1e-3, 'one beam width off: −12 dB');
    near(lobes(1, 1, 1.5, 4).err, 0, 1e-12, 'on boresight Δ = 0'); ok(lobes(2, 1, 1.5, 4).err > 0, 'sign tells the side');
    near(barHeight(5000, 4), 349.2, 1e-3, '4° bar at 5 km');
  },
};
