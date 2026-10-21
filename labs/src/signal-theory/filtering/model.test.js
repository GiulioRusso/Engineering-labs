import { kernel, convSame, response, mask, applyMask, maskImpulse, fir } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'kernels have unit DC gain; the moving average has sinc zeros at multiples of 1/M'() { const h = kernel('rect', 21); near(response(h, 0), 1, 1e-12, 'DC'); ok(response(h, 1 / 21) < 1e-12, 'first zero'); near(response(kernel('gauss', 21), 0), 1, 1e-12, 'gauss DC'); },
  'brick-wall mask: its impulse response is a sinc (rings), Butterworth rings less'() {
    const fs = 256, N = 256, b = maskImpulse(fs, N, mask('brick', 10, 0)), w = maskImpulse(fs, N, mask('butter', 10, 2));
    const neg = (y) => Math.min(...y) / Math.max(...y); ok(neg(b) < -0.2, `brick undershoot ${neg(b)}`); ok(neg(w) > neg(b), 'butterworth less ringing');
  },
  'masking keeps the in-band tone and removes the out-of-band one'() {
    const fs = 256, N = 256, x = Array.from({ length: N }, (_, n) => Math.sin(2 * Math.PI * 5 * n / fs) + Math.sin(2 * Math.PI * 60 * n / fs)), y = applyMask(x, fs, mask('brick', 20, 0));
    let e = 0; for (let n = 0; n < N; n++) e = Math.max(e, Math.abs(y[n] - Math.sin(2 * Math.PI * 5 * n / fs))); ok(e < 1e-9, `err ${e}`);
  },
  'FIR low-pass: unit DC gain, > 40 dB down an octave above cutoff'() { const h = fir('lowpass', 50, 0, 1000, 101); near(response(h, 0), 1, 1e-9, 'DC'); ok(response(h, 100 / 1000) < 0.01, 'stop'); near(convSame([1, 1, 1, 1, 1], [0, 1, 0])[2], 1, 1e-12, 'identity'); },
};
