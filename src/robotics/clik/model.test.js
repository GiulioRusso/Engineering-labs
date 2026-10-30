import { clik, squarePath, ARM3, STARTS, planar } from './model.js';
import { near, ok } from '../../lib/testing.js';

const Q0 = STARTS.comfortable;
export const tests = {
  'the square path: 15.5 s, back to the start, corners on time'() {
    const S = squarePath([1, 0.2]); near(S.total, 15.5, 1e-12, 'duration'); near(S.at(3).p[0], 1.4, 1e-12, 'first corner'); near(S.at(15.5).p[1], 0.2, 1e-12, 'home');
  },
  'CLIK with the pseudo-inverse tracks the square to a fraction of a millimetre; transpose lags more'() {
    const a = clik({ q0: Q0 }), b = clik({ q0: Q0, alg: 'transpose', K: 20 }), ea = Math.max(...a.out.map((o) => o.e)), eb = Math.max(...b.out.map((o) => o.e));
    ok(ea < 1e-3, `pinv ${ea}`); ok(eb > 3 * ea, `transpose ${eb}`);
    const c = clik({ q0: Q0, task: 'pose' }); ok(Math.max(...c.out.map((o) => o.eo)) < 1e-3, 'orientation held');
  },
  'redundancy: the null-space term changes the posture, not the tip'() {
    const a = clik({ q0: Q0 }), b = clik({ q0: Q0, nul: 'center' });
    ok(Math.max(...b.out.map((o) => o.e)) < 1e-3, 'tip still tracked'); ok(b.out.at(-1).dist < 0.8 * a.out.at(-1).dist, `joints centred: ${b.out.at(-1).dist} vs ${a.out.at(-1).dist}`);
    const m = clik({ q0: Q0, nul: 'manip' }); ok(m.out.at(-1).w > a.out.at(-1).w, 'more manipulable'); void planar; void ARM3;
  },
  'near a singularity the pseudo-inverse explodes, damped least squares stays bounded'() {
    const p = clik({ q0: STARTS.stretched }), d = clik({ q0: STARTS.stretched, alg: 'dls', lambda: 0.1 });
    ok(Math.max(...p.out.map((o) => o.qdn)) > 20 * Math.max(...d.out.map((o) => o.qdn)), 'joint speeds');
  },
};
