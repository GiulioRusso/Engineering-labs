import { VT, diodeI, qpoint, rectifier, rippleEstimate, zener } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'thermal voltage 25.9 mV; +60 mV per decade of current'() { near(VT(300), 0.02585, 1e-3, 'VT'); const r = diodeI(0.66) / diodeI(0.6); near(Math.log10(r), 0.06 / (VT() * Math.LN10), 1e-6, 'decade'); },
  'diode + 1 kΩ from 5 V: about 0.6 V and 4.4 mA, satisfying both equations'() { const q = qpoint(5, 1000); ok(q.V > 0.55 && q.V < 0.7, `V ${q.V}`); near(diodeI(q.V), q.I, 1e-6, 'on the curve'); },
  'rectifier ripple ≈ Vp/(fRC), halved for full wave'() { const C = 470e-6, R = 1000, a = rectifier({ C, R, T: 0.2 }), b = rectifier({ C, R, full: true, T: 0.2 }); const rip = (o) => { const v = o.vout.slice(-2000); return Math.max(...v) - Math.min(...v); }; near(rip(a), rippleEstimate(9.3, 50, R, C), 0.15, 'half'); ok(rip(b) < 0.6 * rip(a), 'full wave smaller'); },
  'Zener holds the output near Vz while the load varies'() { const a = zener({ Vs: 12, Rs: 220, RL: 1000 }), b = zener({ Vs: 12, Rs: 220, RL: 500 }); ok(a.regulating && b.regulating, 'regulating'); ok(Math.abs(a.Vout - b.Vout) < 0.15, `${a.Vout} ${b.Vout}`); ok(!zener({ Vs: 12, Rs: 220, RL: 100 }).regulating, 'too heavy a load'); },
};
