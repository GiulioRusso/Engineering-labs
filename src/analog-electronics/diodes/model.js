// Diodes: the Shockley I–V curve, a diode with a resistor (load line, solved by Newton), half- and
// full-wave rectifiers with a smoothing capacitor, and a Zener regulator. SI units. Pure, no DOM.
export const VT = (T = 300) => 1.380649e-23 * T / 1.602176634e-19;
// Shockley: I = Is (e^{V/(n VT)} − 1); Is doubles every ~5 K
export const Is = (T = 300, Is0 = 1e-14) => Is0 * 2 ** ((T - 300) / 5);
export const diodeI = (V, { T = 300, n = 1, Is0 = 1e-14 } = {}) => Is(T, Is0) * (Math.exp(V / (n * VT(T))) - 1);
// operating point of V_S — R — diode: solve V_S = I R + V_D by Newton on V_D
export function qpoint(VS, R, p = {}) { let V = 0.6; for (let i = 0; i < 100; i++) { const I = diodeI(V, p), g = diodeI(V + 1e-6, p) - I, f = VS - V - I * R, df = -1 - g / 1e-6 * R; const dV = -f / df; V += Math.max(-0.1, Math.min(0.1, dV)); if (Math.abs(dV) < 1e-12) break; } return { V, I: (VS - V) / R }; }
// rectifier: sine Vp at f, diode drop Vd, load R with capacitor C; returns {t, vin, vout} by time stepping
export function rectifier({ Vp = 10, f = 50, Vd = 0.7, R = 1000, C = 0, full = false, T = 0.06 }) {
  const dt = 1 / (f * 2000), n = Math.round(T / dt), t = [], vin = [], vout = []; let v = 0;
  for (let i = 0; i < n; i++) { const tt = i * dt, s = Vp * Math.sin(2 * Math.PI * f * tt), src = (full ? Math.abs(s) - 2 * Vd : s - Vd);
    if (C > 0) { if (src > v) v = src; else v -= v / (R * C) * dt; } else v = Math.max(0, src);
    t.push(tt); vin.push(s); vout.push(Math.max(0, v)); }
  return { t, vin, vout };
}
export const rippleEstimate = (Vpk, f, R, C, full) => Vpk / (R * C * f * (full ? 2 : 1));
// Zener shunt regulator: source Vs through Rs, Zener Vz (with dynamic resistance rz), load RL
export function zener({ Vs, Rs, Vz = 5.1, rz = 5, RL }) {
  const Vopen = Vs * RL / (Rs + RL);
  if (Vopen <= Vz) return { Vout: Vopen, Iz: 0, IL: Vopen / RL, Is: Vopen / RL, regulating: false };
  // node: (Vs − V)/Rs = V/RL + (V − Vz)/rz
  const V = (Vs / Rs + Vz / rz) / (1 / Rs + 1 / RL + 1 / rz);
  return { Vout: V, Iz: (V - Vz) / rz, IL: V / RL, Is: (Vs - V) / Rs, regulating: true };
}
