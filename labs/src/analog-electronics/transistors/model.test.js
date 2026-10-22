import { VT, bjtIc, mosId, mosRegion, gmBjt, gmMos, solveBias, smallSignal, mirror } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'BJT: ×10 collector current per 59.5 mV of V_BE'() { near(bjtIc(0.7 + VT * Math.LN10, 5) / bjtIc(0.7, 5), 10, 1e-9, 'decade'); },
  'MOSFET: continuous at the triode/saturation edge, regions named'() { const a = mosId(2, 0.999999), b = mosId(2, 1.000001); near(a, b, 1e-5, 'continuous'); ok(mosRegion(0.5, 2) === 'cutoff' && mosRegion(2, 0.5) === 'triode' && mosRegion(2, 3) === 'saturation', 'regions'); },
  'gm: 38.7 mS at 1 mA for a BJT, far less for a MOSFET'() { near(gmBjt(1e-3), 0.0387, 1e-2, 'bjt'); ok(gmMos(1e-3) < 0.1 * gmBjt(1e-3), 'mos smaller'); },
  'emitter resistor makes the bias insensitive to temperature'() { const a = solveBias({ Re: 1000 }), b = solveBias({ Re: 1000, dT: 50 }); ok(Math.abs(b.Ic / a.Ic - 1) < 0.1, `with Re ${b.Ic / a.Ic}`); const c = solveBias({ Re: 0, Vb: 0.65 }), d = solveBias({ Re: 0, Vb: 0.65, dT: 50 }); ok(d.Ic / c.Ic > 10, 'without Re it runs away'); },
  'small signal: tangent good below V_T, wrong above'() { const s = smallSignal('bjt', 1e-3, 0.001), l = smallSignal('bjt', 1e-3, 0.05); ok(Math.abs(s.exact / s.lin - 1) < 0.03, 'small'); ok(l.exact / l.lin > 2, 'large'); },
  'mirror copies the reference within a few percent'() { const m = mirror({}); ok(Math.abs(m.iout / m.iref - 1) < 0.08, `${m.iout / m.iref}`); ok(mirror({ dvbe: 0.018 }).iout > 1.9 * m.iout, '18 mV mismatch doubles it'); },
};
