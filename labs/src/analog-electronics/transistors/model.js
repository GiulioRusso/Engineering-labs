// Transistor models shared by the analog labs: the BJT (exponential, with Early effect and a soft
// saturation knee), the MOSFET (square law with three regions), transconductance, biasing with an
// emitter resistor, the small-signal approximation and the current mirror. SI units. Pure, no DOM.
export const VT = 0.02585, IS = 1e-15, BETA = 150, VA = 50, VTH = 1, KN = 2e-3, LAMBDA = 0.02;

// collector current: exponential in V_BE, slowly rising with V_CE (Early), collapsing below ~0.2 V (saturation)
export const bjtIc = (vbe, vce, { Is = IS, va = VA } = {}) => Is * Math.exp(Math.min(vbe, 1.2) / VT) * (1 + Math.max(vce, 0) / va) * (1 - Math.exp(-Math.max(vce, 0) / 0.06));
export function mosId(vgs, vds, { vth = VTH, kn = KN, lambda = LAMBDA } = {}) {
  const vov = vgs - vth; if (vov <= 0 || vds <= 0) return 0;
  return vds < vov ? kn * (vov * vds - vds * vds / 2) * (1 + lambda * vds) : 0.5 * kn * vov * vov * (1 + lambda * vds);
}
export const mosRegion = (vgs, vds, vth = VTH) => (vgs <= vth ? 'cutoff' : vds < vgs - vth ? 'triode' : 'saturation');
export const gmBjt = (Ic) => Ic / VT;
// square law in strong inversion; at tiny currents (weak inversion) it becomes exponential like a BJT with n ≈ 1.5
export const gmMos = (Id, kn = KN) => Math.min(Math.sqrt(2 * kn * Id), Id / (1.5 * VT));
// hybrid-π small-signal parameters at a collector current
export const hybridPi = (Ic, beta = BETA, va = VA) => ({ gm: Ic / VT, rpi: beta * VT / Ic, ro: va / Ic });

// bias with base voltage Vb, emitter resistor Re, collector resistor Rc; dT shifts V_BE by −2 mV/K
export function solveBias({ Vcc = 12, Rc = 4700, Re = 1000, Vb = 2, dT = 0, beta = BETA }) {
  const shift = -2e-3 * dT, vbeOf = (Ie) => VT * Math.log(Math.max(Ie, 1e-18) / IS) + shift;
  let Ie;
  if (Re > 0) { // fixed point Ie = (Vb − Vbe(Ie)) / Re, bisection on a monotone function
    let lo = 0, hi = Vb / Re; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (m * Re + vbeOf(m) > Vb) hi = m; else lo = m; } Ie = (lo + hi) / 2;
  } else Ie = IS * Math.exp((Vb - shift) / VT);
  const Ic = Ie * beta / (beta + 1), Vce = Vcc - Ic * Rc - Ie * Re;
  return { Ic, Vce, sat: Vce < 0.2, vbe: vbeOf(Ie) };
}

// small signal around I0: exact current change vs the tangent prediction, for an input swing v
export function smallSignal(device, I0, v) {
  if (device === 'bjt') { const gm = I0 / VT; return { gm, exact: I0 * (Math.exp(v / VT) - 1), lin: gm * v }; }
  const vov = Math.sqrt(2 * I0 / KN), gm = KN * vov; return { gm, exact: 0.5 * KN * Math.max(vov + v, 0) ** 2 - I0, lin: gm * v };
}

// current mirror: diode-connected reference fed through R from Vcc, output at Vout; dvbe = mismatch (V)
export function mirror({ Vcc = 5, R = 4300, Vout = 2.5, dvbe = 0, beta = BETA }) {
  let vbe = 0.65; for (let i = 0; i < 200; i++) vbe = VT * Math.log(Math.max((Vcc - vbe) / R, 1e-15) / (IS * (1 + vbe / VA)));
  const iref = (Vcc - vbe) / R, isat = iref / (1 + vbe / VA);
  const iout = isat * Math.exp(dvbe / VT) * (1 + Math.max(Vout, 0) / VA) * (1 - Math.exp(-Math.max(Vout, 0) / 0.06)) / (1 + 2 / beta);
  return { iref, iout, vbe };
}
