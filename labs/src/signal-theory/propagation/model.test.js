import { fspl, friis, twoRay, breakpoint, yagi, yagiPattern, patchE, patchH, directivity2D } from './model.js';
import { near, ok } from '../../lib/testing.js';

const L = { Pt: 20, Gt: 0, Gr: 0, f: 2.4e9, ht: 10, hr: 1.5 };
export const tests = {
  'FSPL at 2.4 GHz, 1 km ≈ 100 dB; +6 dB per doubling'() { near(fspl(1000, 2.4e9), 100.05, 1e-3, '1 km'); near(fspl(2000, 2.4e9) - fspl(1000, 2.4e9), 6.02, 1e-3, 'doubling'); },
  'two-ray: beyond the breakpoint the power falls 40 dB/decade'() { const db = breakpoint(L); near(db, 480, 0.01, 'breakpoint'); const a = twoRay(L, 20 * db), b = twoRay(L, 200 * db); near(a - b, 40, 0.02, 'slope'); ok(Math.abs(twoRay(L, 0.1 * db) - friis(L, 0.1 * db)) < 6.1, 'near: within ±6 dB of free space'); },
  'Yagi: directors make it point forward'() { const e = yagi(4, 0.25, 100); ok(yagiPattern(e, 0) > 3 * yagiPattern(e, Math.PI), `F/B ${yagiPattern(e, 0) / yagiPattern(e, Math.PI)}`); ok(directivity2D((p) => yagiPattern(e, p)) > directivity2D((p) => yagiPattern(yagi(0, 0.25, 100), p)), 'more directors, more gain'); },
  'patch: broadside maximum, nothing behind'() { near(patchE(0, 0.5, 0.04), 1, 1e-9, 'E'); near(patchH(0, 0.6), 1, 1e-9, 'H'); ok(patchE(2.5, 0.5, 0.04) === 0, 'back'); },
};
