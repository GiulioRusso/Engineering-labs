import { ceStage, ceOut, follower, pairI1, diffPair, miller, feedback, cascade } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'common emitter: −g_m(R_C‖r_o) ≈ −166 at 1 mA, 4.7 kΩ; R_E trades gain for linearity'() { near(ceStage({}).Av, -166, 0.01, 'Av'); near(ceStage({ Re: 470 }).Av, -8.66, 0.01, 'with Re'); const d = ceOut(5e-4, {}) - ceOut(-5e-4, {}); near(d / 1e-3, -ceStage({}).gm * 4700, 0.01, 'large-signal slope = −g_m R_C'); },
  'emitter follower: gain ≈ 0.975, R_in ≈ 155 kΩ, R_out ≈ 26 Ω'() { const f = follower({}); near(f.Av, 0.9748, 1e-3, 'Av'); near(f.Rin, 155e3, 0.02, 'Rin'); ok(f.Rout < 30, `Rout ${f.Rout}`); },
  'differential pair: currents always add to the tail, tanh shape'() { const I = 1e-3, v = 0.03; near(pairI1(v, I) + pairI1(-v, I), I, 1e-12, 'sum'); near(pairI1(v, I) - pairI1(-v, I), I * Math.tanh(v / 2 / 0.02585), 1e-9, 'tanh'); ok(diffPair({}).cmrr > 50, 'CMRR'); },
  'Miller: 5 pF × (1 + 200) = 1005 pF'() { near(miller({ Av: -200, Cpi: 0 }).Cin, 1005e-12, 1e-9, 'Cin'); },
  'feedback: closed loop → 1/β, bandwidth × (1 + Aβ)'() { const f = feedback({}); near(f.Acl, 10, 1e-3, 'Acl'); near(f.cl(1), f.Acl, 1e-3, 'dc'); near(f.cl(f.f3), f.Acl / Math.SQRT2, 0.01, 'f3'); },
  'cascade: loading wastes most of the ideal gain; a follower recovers it'() { const a = cascade({}), b = cascade({ buffer: true }); ok(a.total / a.ideal < 0.5, `${a.total / a.ideal}`); ok(Math.abs(b.total) > Math.abs(a.total), 'buffer helps'); },
};
