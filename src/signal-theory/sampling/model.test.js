import { aliasOf, signedAlias, reconstruct, gpulse, gspec, replicas } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'alias folds into [0, fs/2]: 7 Hz at 10 Hz looks like 3 Hz'() { near(aliasOf(7, 10), 3, 1e-12, '7→3'); near(aliasOf(13, 10), 3, 1e-12, '13→3'); near(signedAlias(9.5, 10), -0.5, 1e-12, 'wheel backwards'); },
  'the 7 Hz and 3 Hz tones give identical samples at 10 Hz'() { for (let n = 0; n < 20; n++) near(Math.cos(2 * Math.PI * 7 * n / 10) + 2, Math.cos(2 * Math.PI * 3 * n / 10) + 2, 1e-9, `n=${n}`); },
  'sinc reconstruction recovers a tone sampled above Nyquist'() {
    const f = 3, fs = 10, S = Array.from({ length: 400 }, (_, n) => [(n - 200) / fs, Math.sin(2 * Math.PI * f * (n - 200) / fs)]);
    for (const t of [0.013, 0.31, 1.07]) near(reconstruct(S, 1 / fs, t) + 2, Math.sin(2 * Math.PI * f * t) + 2, 2e-3, `t=${t}`);
  },
  'Gaussian pair: numerical transform of the pulse matches the spectrum shape'() {
    const B = 2, dt = 1e-3; let X0 = 0, X1 = 0; for (let t = -3; t < 3; t += dt) { X0 += gpulse(t, B) * dt; X1 += gpulse(t, B) * Math.cos(2 * Math.PI * 1.5 * t) * dt; }
    near(X1 / X0, gspec(1.5, B), 1e-6, 'ratio');
  },
  'replicas overlap only when fs < ~2·(3B)'() { ok(replicas((f) => gspec(f, 1), 3, 12) - gspec(3, 1) < 1e-4, 'separated'); ok(replicas((f) => gspec(f, 1), 2, 4) - gspec(2, 1) > 0.1, 'overlap'); },
};
