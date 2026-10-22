// Single-transistor amplifier stages and what limits them: the common emitter (gain, inversion,
// clipping), the emitter follower (impedance transformation), the differential pair (tanh, common-mode
// rejection), the Miller effect, negative feedback, and cascading with loading. SI units. Pure, no DOM.
import { VT, IS, BETA, hybridPi } from '../transistors/model.js';

export const par = (...r) => 1 / r.reduce((s, x) => s + 1 / x, 0);

export function ceStage({ Ic = 1e-3, Rc = 4700, Re = 0, beta = BETA }) {
  const p = hybridPi(Ic, beta);
  return { ...p, Av: -p.gm * par(Rc, p.ro) / (1 + p.gm * Re), Rin: p.rpi + (beta + 1) * Re, Rout: par(Rc, p.ro) };
}
// large-signal CE output for an input v added to the bias: solve Ic from Vb + v = VT ln(Ic/IS) + Ic Re
export function ceOut(v, { Ic = 1e-3, Rc = 4700, Re = 0, Vcc = 12 }) {
  const Vb = VT * Math.log(Ic / IS) + Ic * Re; let i;
  if (Re > 0) { let lo = 0, hi = 1; for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (VT * Math.log(Math.max(m, 1e-30) / IS) + m * Re > Vb + v) hi = m; else lo = m; } i = (lo + hi) / 2; } else i = IS * Math.exp(Math.min((Vb + v) / VT, 60));
  return Math.min(Vcc, Math.max(0.2, Vcc - i * Rc));
}

export function follower({ Ic = 1e-3, Re = 1000, RL = 1e9, Rs = 0, beta = BETA }) {
  const p = hybridPi(Ic, beta), R = par(Re, RL), Av = p.gm * R / (1 + p.gm * R);
  return { Av, Rin: p.rpi + (beta + 1) * R, Rout: par(1 / p.gm + Rs / (beta + 1), Re) };
}

export const pairI1 = (vid, Itail) => Itail / (1 + Math.exp(-vid / VT));
export function diffPair({ Itail = 1e-3, Rc = 5000, Rtail = 50e3 }) {
  const gm = Itail / 2 / VT, Adm = gm * Rc, Acm = Rc / (2 * Rtail + 1 / gm);
  return { gm, Adm, Acm, cmrr: 20 * Math.log10(Adm / Acm) };
}

export function miller({ Av = -100, Cmu = 5e-12, Cpi = 20e-12, Rs = 1000 }) {
  const Cin = Cmu * (1 - Av) + Cpi, f3 = 1 / (2 * Math.PI * Rs * Cin);
  return { Cin, f3, mag: (f) => Math.abs(Av) / Math.hypot(1, f / f3) };
}

// single-pole open loop A(f) = A0/(1 + j f/fp), closed loop A/(1 + Aβ)
export function feedback({ A0 = 1e5, beta = 0.1, fp = 10 }) {
  const cl = (f) => { const re = 1, im = f / fp, d = re * re + im * im, Ar = A0 * re / d, Ai = -A0 * im / d, Dr = 1 + Ar * beta, Di = Ai * beta, D = Dr * Dr + Di * Di; return Math.hypot((Ar * Dr + Ai * Di) / D, (Ai * Dr - Ar * Di) / D); };
  return { Acl: A0 / (1 + A0 * beta), ideal: 1 / beta, loop: A0 * beta, f3: fp * (1 + A0 * beta), open: (f) => A0 / Math.hypot(1, f / fp), cl };
}

// two CE stages, optionally with an emitter follower between them, driving RL
export function cascade({ Ic = 1e-3, Rc = 4700, buffer = false, RL = 1e9 }) {
  const p = hybridPi(Ic), A1 = -p.gm * par(Rc, p.ro), Rout1 = par(Rc, p.ro), Rin2 = p.rpi, A2 = -p.gm * par(Rc, p.ro, RL);
  let chain;
  if (buffer) { const Rb = p.rpi + (BETA + 1) * par(1000, Rin2), Rob = 1 / p.gm + Rout1 / (BETA + 1); chain = [['stage 1', A1], ['loading', Rb / (Rout1 + Rb)], ['follower', follower({ Ic, Re: 1000, RL: Rin2 }).Av], ['loading', Rin2 / (Rob + Rin2)], ['stage 2', A2]]; } else chain = [['stage 1', A1], ['loading', Rin2 / (Rout1 + Rin2)], ['stage 2', A2]];
  return { chain, total: chain.reduce((a, [, g]) => a * g, 1), ideal: A1 * A2, Rout1, Rin2 };
}
