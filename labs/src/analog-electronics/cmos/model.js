// CMOS logic from the analog side: the inverter's transfer curve (solving I_n = I_p), switching
// threshold and noise margins, the crowbar current, gate delay as an RC charge, dynamic power, and the
// cross-coupled latch with its unstable middle point. SI units. Pure, no DOM.
export const VTN = 0.7, VTP = 0.7, KN = 200e-6, KP = 100e-6;

export function sqId(vgs, vds, k, vth) {
  const vov = vgs - vth; if (vov <= 0 || vds <= 0) return 0;
  return vds < vov ? k * (vov * vds - vds * vds / 2) : 0.5 * k * vov * vov;
}
// inverter output: the NMOS pull-down current rises with v_out, the PMOS pull-up falls: bisection on In − Ip
export function invOut(vin, r = 2, vdd = 3.3) {
  const f = (vo) => sqId(vin, vo, KN, VTN) - sqId(vdd - vin, vdd - vo, KP * r, VTP);
  if (f(vdd) <= 0) return vdd; if (f(0) >= 0) return 0;
  let lo = 0, hi = vdd; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
  return (lo + hi) / 2;
}
export const crowbar = (vin, r = 2, vdd = 3.3) => sqId(vin, invOut(vin, r, vdd), KN, VTN);
export function threshold(r = 2, vdd = 3.3) { let lo = 0, hi = vdd; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (invOut(m, r, vdd) > m) lo = m; else hi = m; } return (lo + hi) / 2; }
// unity-gain points of the transfer curve
export function margins(r = 2, vdd = 3.3) {
  const n = 600, vi = Array.from({ length: n }, (_, i) => 0.01 + (vdd - 0.02) * i / (n - 1)), vo = vi.map((v) => invOut(v, r, vdd)); let a = -1, b = -1;
  for (let i = 1; i < n; i++) { const g = (vo[i] - vo[i - 1]) / (vi[i] - vi[i - 1]); if (g <= -1) { if (a < 0) a = i; b = i - 1; } }
  const VIL = vi[a], VIH = vi[b], VOH = invOut(VIL, r, vdd), VOL = invOut(VIH, r, vdd);
  return { VIL, VIH, VOH, VOL, NMH: VOH - VIH, NML: VIL - VOL };
}
// propagation delay: on-resistance of the driver charging the load, t_p = 0.69 R C
export function gateDelay(vdd, W, CL) { const Ron = 1 / (KN * W * (vdd - VTN)); return { tp: 0.69 * Ron * CL, Ron }; }
export const dynPower = ({ alpha = 0.1, C = 1e-12, vdd = 3.3, f = 100e6, Ileak = 0 }) => ({ dyn: alpha * C * vdd * vdd * f, leak: Ileak * vdd });
// net current into the output node of an inverter (pull-up minus pull-down)
const inet = (vin, vout, r, vdd) => sqId(vdd - vin, vdd - vout, KP * r, VTP) - sqId(vin, vout, KN, VTN);
// two cross-coupled inverters started near the middle: how long to fall to a rail
export function latch(offset, { r = 2, vdd = 3.3, C = 10e-15, dt = 2e-13, n = 4000 } = {}) {
  const Vm = threshold(r, vdd); let a = Vm + offset, b = Vm; const ta = [a], tb = [b]; let res = NaN;
  for (let k = 0; k < n; k++) { const ia = inet(b, a, r, vdd), ib = inet(a, b, r, vdd); a = Math.min(vdd, Math.max(0, a + ia / C * dt)); b = Math.min(vdd, Math.max(0, b + ib / C * dt)); ta.push(a); tb.push(b); if (!Number.isFinite(res) && Math.abs(a - Vm) > 0.45 * vdd) res = k * dt; }
  return { ta, tb, Vm, res, dt };
}
