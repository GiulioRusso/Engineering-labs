import { packet, echoDelay, resolution, overlap, eclipsed, unambiguous, apparent, pulsesInFlight, rangeAt, C0 } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'the pulse goes out, reflects at R and is back after 2R/c'() {
    const R = 30e3, tau = 1e-6;
    const a = packet(R / C0 / 2, R, tau); ok(a.out && !a.back && Math.abs(a.out[1] - R / 2) < 1e-6, 'half way out');
    const b = packet(1.5 * R / C0, R, tau); ok(b.back && Math.abs(b.back[0] - R / 2) < 1 && !b.out, 'half way back');
    near(echoDelay(R), 2e-4, 1e-3, '30 km → 200 µs');
  },
  'resolution cτ/2; overlap and eclipsing'() {
    near(resolution(1e-6), 149.896, 1e-5, '1 µs → 150 m'); ok(overlap(100, 1e-6) && !overlap(200, 1e-6), 'overlap test');
    ok(eclipsed(100, 1e-6) && !eclipsed(200, 1e-6), 'blind zone cτ/2');
  },
  'folding: a target beyond R_u appears at R mod R_u, n pulses later'() {
    const pri = 1 / 8000, Ru = unambiguous(pri); near(Ru, 18737, 1e-3, 'R_u at 8 kHz');
    near(apparent(58e3, pri), 58e3 - 3 * Ru, 1e-9, '58 km → 1.8 km'); ok(pulsesInFlight(58e3, pri) === 3, 'three pulses in flight');
    near(rangeAt(10e3, 300, 100, 1e-3), 10030, 1e-12, 'moving target');
  },
};
