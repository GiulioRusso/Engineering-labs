// Radar and jamming. Pure, no DOM. SI units: m, s, W; dB where named.
import { erfc } from '../../signal-theory/modulation/model.js';
export const C0 = 299792458, KB = 1.380649e-23, T0 = 290;
export const db = (x) => 10 * Math.log10(x), lin = (d) => 10 ** (d / 10);

export const unambiguousRange = (prf) => C0 / (2 * prf);
export const rangeResolution = (tau, B) => C0 / (2 * (B > 0 ? B : 1 / tau)); // chirp: c/2B, plain pulse: cτ/2
export const doppler = (v, lam) => 2 * v / lam;
export const unambiguousVelocity = (prf, lam) => lam * prf / 4;              // ±
export const apparentRange = (R, prf) => R % unambiguousRange(prf);
export const foldVelocity = (v, prf, lam) => { const w = 2 * unambiguousVelocity(prf, lam); return ((v + w / 2) % w + w) % w - w / 2; };

// matched-filter output magnitude for delay error dt: plain pulse → triangle; LFM chirp → narrow sinc
export function matched(dt, tau, B) {
  const a = Math.abs(dt); if (a >= tau) return 0;
  const tri = 1 - a / tau; if (!(B > 0)) return tri;
  const x = Math.PI * B * dt * tri; return Math.abs(tri * (x ? Math.sin(x) / x : 1));
}

// radar equation: single-pulse SNR at range R; n pulses integrated coherently multiply it by n
export function snr({ Pt, G, lam, rcs, R, B, F, L = 1, n = 1 }) {
  return n * Pt * G * G * lam * lam * rcs / ((4 * Math.PI) ** 3 * R ** 4 * KB * T0 * B * F * L);
}
// detection of a steady target in Gaussian noise: Pfa from the threshold; Pd by North's approximation
export const thresholdFor = (pfa) => Math.sqrt(-2 * Math.log(pfa)); // in units of the noise rms
export const pd = (snrLin, pfa) => 0.5 * erfc(Math.sqrt(-Math.log(pfa)) - Math.sqrt(snrLin + 0.5));

// jamming: echo power S and jammer power J at the radar (same receiver), self-screening or stand-off
export function signalPower({ Pt, G, lam, rcs, R }) { return Pt * G * G * lam * lam * rcs / ((4 * Math.PI) ** 3 * R ** 4); }
export function jammerPower({ Pj, Gj, G, lam, Rj, Br, Bj, sidelobe = 1 }) { return Pj * Gj * G * sidelobe * lam * lam / ((4 * Math.PI) ** 2 * Rj ** 2) * Math.min(1, Br / Bj); }
// self-screening burn-through: range where S/J equals the required ratio
export function burnThrough(p, needDb) {
  // S/J = Pt G rcs Bj / (4π Pj Gj R² Br) (for Bj ≥ Br) = need  →  R = sqrt(Pt G rcs Bj / (4π Pj Gj Br need))
  return Math.sqrt(p.Pt * p.G * p.rcs * Math.max(p.Bj, p.Br) / (4 * Math.PI * p.Pj * p.Gj * p.Br * lin(needDb)));
}

// MTI: an n-pulse canceller (1 − z⁻¹)^(n−1); gain vs Doppler, zero at multiples of the PRF (blind speeds)
export const mtiGain = (fd, prf, order) => Math.abs(2 * Math.sin(Math.PI * fd / prf)) ** order;
export const blindSpeed = (k, prf, lam) => k * lam * prf / 2;
// the radar range equation as a ledger of dB terms: returns [[label, dB], …] and the resulting SNR
export function ledger({ PtW, Gdb, lam, rcs, R, B, Fdb, mode = 'radar' }) {
  const t = [['transmit power', db(PtW)], ['transmit gain', Gdb], ['receive gain', Gdb], ['λ²', db(lam * lam)]];
  if (mode === 'radar') t.push(['target σ', db(rcs)], ['(4π)³', -db((4 * Math.PI) ** 3)], ['R⁴', -40 * Math.log10(R)]);
  else t.push(['(4π)²', -db((4 * Math.PI) ** 2)], ['R²', -20 * Math.log10(R)]);
  const S = t.reduce((a, [, v]) => a + v, 0), N = db(KB * T0) + db(B) + Fdb;
  return { terms: t, S, N, snr: S - N };
}
