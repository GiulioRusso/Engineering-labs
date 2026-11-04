import { budget, pulsed, coherent, aesa, esm, drfm, PULSES, N } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'budget: 1 MW, 33 dBi, 10 GHz, 1 m² at 60 km ≈ −98 dBm; noise kT₀BF at 1 MHz, 3 dB = −111 dBm; R⁴ law'() {
    const b = budget({ Rkm: 60 }); near(b.Pt, 90, 1e-9, 'Pt'); near(b.Pn, -110.98, 1e-3, 'noise'); ok(b.Pr > -100 && b.Pr < -95, `Pr ${b.Pr}`);
    near(budget({ Rkm: 30 }).Pr - b.Pr, 40 * Math.log10(2), 1e-6, 'twice as close: +12 dB');
  },
  'pulsed: the limiter clips the leak, the detector output is a non-negative envelope peaking at the echo'() {
    const m = pulsed({ Rkm: 60, isol: 25 }), lim = Math.max(...m.sig.lim.map(Math.abs)), dup = Math.max(...m.sig.dup.map(Math.abs));
    ok(lim < dup / 100, 'leak clipped'); ok(m.sig.det.every((v) => v >= 0), 'envelope ≥ 0');
    const i0 = Math.round((m.d + m.tau / 2) * N), j0 = Math.round((m.t0 + m.tau + 0.05) * N), det = m.sig.det;
    ok(det[i0] > 3 * det[j0], 'echo above the noise between pulses');
  },
  'coherent: the Doppler FFT peak sits at fd·PULSES; the compression peak at the echo delay'() {
    for (const v of [120, -200, 0]) { const m = coherent({ v, snrDb: 20 }); near(m.bin, Math.round(m.fd * PULSES), 0, `bin for v=${v}`); }
    const m = coherent({ Rkm: 40, snrDb: 20 }); ok(Math.abs(m.peak / N - m.d) < 0.02, `peak ${m.peak / N} vs delay ${m.d}`);
  },
  'aesa: steering at the target puts the module outputs in phase (gain 1); off the beam they cancel'() {
    near(aesa({ steer: 20, target: 20 }).gain, 1, 1e-12, 'on beam');
    ok(aesa({ steer: 20, target: -15 }).gain < 0.3, 'off beam');
    const a = aesa({ steer: 20, target: 20 }); ok(a.sig.after.every((w) => Math.abs(w[10] - a.sig.after[0][10]) < 1e-9), 'aligned after the phase shifters');
  },
  'esm: both PRIs are found; the deinterleaved trains hold all pulses'() {
    const e = esm(); ok(e.pri.every(Boolean), 'PRIs'); const pulses = e.sig.split.reduce((s, y) => s + y.filter((v, i) => v > 0 && !(y[i - 1] > 0)).length, 0); near(pulses, e.pdw.length, 0, 'all pulses assigned');
  },
  'drfm: the copy is the stored pulse played back Δt later'() {
    const d = drfm({ delay: 0.2, bits: 8 }), k = Math.round(0.2 * N), on = (y) => y.findIndex((v) => Math.abs(v) > 0.2);
    near(on(d.sig.mod) - on(d.sig.adc), k, 0, 'delay in samples');
  },
};
