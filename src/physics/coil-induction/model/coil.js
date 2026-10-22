// Coil, probe loop and bar magnet: the quasi-static model behind the coil-induction lab.
// Pure module: no DOM, no three.js. SI units. Coil axis = z, coil centred at the origin.
//
// Model
// - The coil is N coaxial circular turns of radius R spread over length L (a helix is drawn, the
//   field is that of N rings; the helix's small axial current component is neglected).
// - The bar magnet is an Amperian model: n_m rings of radius r_m over length l_m, each carrying
//   I_m = (B_r/μ0)·l_m/n_m, i.e. a uniformly magnetised cylinder with remanence B_r.
// - The probe is one ring of radius a. All rings stay parallel to the coil (axis along z).
// - Induction is quasi-static and resistive: I_ind = EMF / R_circuit. Self-inductance is neglected
//   (valid while ωL ≪ R) and the driven coil is an ideal current source.
// - Fluxes use reciprocity: the flux of source S through circuit C is I_S times their mutual
//   inductance M, computed as ∮A·dl of the coil's own field around the other circuit.
import { MU0 } from '../../../lib/physics/loop.js';
import { stackTable, addStackField, fluxThroughLoop } from '../../../lib/physics/axisym.js';

export const G = 9.80665; // standard gravity, m/s²
export const BOX = { rho: 0.3, z: 0.4 }; // scene half-extent, m

export const DEFAULTS = {
  N: 40, R: 0.04, L: 0.16,                 // coil: turns, radius (m), length (m)
  I0: 2, f: 0,                             // coil drive amplitude (A) and frequency (Hz, 0 = DC)
  mode: 'probe',                           // 'probe' (driven coil, pickup loop) | 'magnet' (pickup coil)
  a: 0.025, Rp: 0.05,                      // probe radius (m), probe resistance (Ω)
  Br: 1.2, pol: 1, rm: 0.012, lm: 0.04,    // magnet remanence (T), polarity (+1: N up), radius, length
  mass: 0.12, Rc: 0.5,                     // magnet mass (kg), coil circuit resistance (Ω; Infinity = open)
};

const MAGNET_RINGS = 12;

export function createModel() {
  const M = { p: { ...DEFAULTS }, coil: null, probe: null, magnet: null, key: {} };

  M.configure = (p) => {
    Object.assign(M.p, p);
    const q = M.p, k = M.key;
    const span = (n, len) => (n > 1 ? len * (n - 1) / n : 0); // centre-to-centre span of n turns over len
    if (k.N !== q.N || k.R !== q.R || k.L !== q.L) {
      M.coil = stackTable({ a: q.R, N: q.N, length: span(q.N, q.L), rhoMax: 0.6, zMax: 1.0, hMax: 0.003 });
      Object.assign(k, { N: q.N, R: q.R, L: q.L });
    }
    if (k.a !== q.a) {
      M.probe = stackTable({ a: q.a, N: 1, length: 0, rhoMax: 0.6, zMax: 1.0, hMax: Math.min(0.003, q.a / 6) });
      k.a = q.a;
    }
    if (k.rm !== q.rm || k.lm !== q.lm) {
      M.magnet = stackTable({ a: q.rm, N: MAGNET_RINGS, length: span(MAGNET_RINGS, q.lm), rhoMax: 0.8, zMax: 1.4, hMax: 0.002 });
      Object.assign(k, { rm: q.rm, lm: q.lm });
    }
    return M;
  };

  // Equivalent ring current of the magnet (A per ring) and its dipole moment (A·m²).
  M.magnetRingCurrent = () => M.p.pol * (M.p.Br / MU0) * M.p.lm / MAGNET_RINGS;
  M.magnetMoment = () => M.p.pol * (M.p.Br / MU0) * Math.PI * M.p.rm ** 2 * M.p.lm;

  // Drive current and its rate at time t.
  M.drive = (t) => {
    const { I0, f } = M.p;
    if (!f) return { I: I0, dI: 0 };
    const w = 2 * Math.PI * f;
    return { I: I0 * Math.sin(w * t), dI: I0 * w * Math.cos(w * t) };
  };

  // Mutual inductance (H) between the coil and the moving object at position (x, y, z):
  // the probe ring, or the whole magnet (sum over its rings).
  M.mutual = (x, y, z) => {
    if (M.p.mode === 'probe') return fluxThroughLoop(M.coil, 0, 0, 0, x, y, z, M.p.a);
    let s = 0;
    const l = M.p.lm * (MAGNET_RINGS - 1) / MAGNET_RINGS;
    for (let j = 0; j < MAGNET_RINGS; j++)
      s += fluxThroughLoop(M.coil, 0, 0, 0, x, y, z - l / 2 + l * j / (MAGNET_RINGS - 1), M.p.rm, 24);
    return s;
  };
  // On the axis the transverse gradient vanishes by symmetry (and costs 4 off-axis quadratures).
  M.mutualGrad = (x, y, z, h = 2e-4) => [
    x || y ? (M.mutual(x + h, y, z) - M.mutual(x - h, y, z)) / (2 * h) : 0,
    x || y ? (M.mutual(x, y + h, z) - M.mutual(x, y - h, z)) / (2 * h) : 0,
    (M.mutual(x, y, z + h) - M.mutual(x, y, z - h)) / (2 * h),
  ];

  // Full electrical/mechanical state for a kinematic snapshot.
  // kin = { t, pos: [x, y, z], vel: [vx, vy, vz] }.
  // Probe mode: Φ = I_coil·M through the probe, I_ind flows in the probe.
  // Magnet mode: Φ = I_m·M through the coil, I_ind flows in the coil (not driven).
  M.evaluate = (kin) => {
    const [x, y, z] = kin.pos, [vx, vy, vz] = kin.vel;
    const Mu = M.mutual(x, y, z), g = M.mutualGrad(x, y, z);
    const dMdt = g[0] * vx + g[1] * vy + g[2] * vz;
    let I, dI = 0, R;
    if (M.p.mode === 'probe') { ({ I, dI } = M.drive(kin.t)); R = M.p.Rp; }
    else { I = M.magnetRingCurrent(); R = M.p.Rc; }
    const phi = I * Mu;
    const emf = -(dI * Mu + I * dMdt);
    const iInd = Number.isFinite(R) ? emf / R : 0;
    // Force on the object from the interaction energy I_source·I_ind·M: F = I_s·I_ind·∇M.
    const F = [I * iInd * g[0], I * iInd * g[1], I * iInd * g[2]];
    return {
      phi, emf, iInd, F, M: Mu, gradM: g,
      iCoil: M.p.mode === 'probe' ? I : iInd,     // current actually flowing in the coil
      iProbe: M.p.mode === 'probe' ? iInd : 0,
      pJoule: Number.isFinite(R) ? iInd * iInd * R : 0,  // electrical power dissipated
      pMech: F[0] * vx + F[1] * vy + F[2] * vz,           // mechanical power delivered to the object
    };
  };

  // Magnetic field (T) at (x, y, z) for a snapshot: coil current iCoil, object at pos, probe current iProbe.
  // Writes into b = [Bx, By, Bz] and returns the azimuthal potentials summed as a scalar diagnostic.
  M.field = (x, y, z, s, b) => {
    b[0] = b[1] = b[2] = 0;
    if (s.iCoil) addStackField(M.coil, s.iCoil, 0, 0, 0, x, y, z, b);
    const [px, py, pz] = s.pos;
    if (M.p.mode === 'magnet') addStackField(M.magnet, M.magnetRingCurrent(), px, py, pz, x, y, z, b);
    else if (s.iProbe) addStackField(M.probe, s.iProbe, px, py, pz, x, y, z, b);
    return b;
  };

  // Induced electric field (V/m) at (x, y, z): E = -∂A/∂t.
  // Coil part: -(dI/dt)·A_coil. Translating magnet: A(x - p(t)) gives E = (v·∇)A.
  const ta = [0, 0, 0], tb = [0, 0, 0];
  M.efield = (x, y, z, s, e) => {
    e[0] = e[1] = e[2] = 0;
    const phiHat = (cx, cy, k) => {
      const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
      if (r > 0) { e[0] += -k * dy / r; e[1] += k * dx / r; }
    };
    if (M.p.mode === 'probe' && s.dI) phiHat(0, 0, -s.dI * addStackField(M.coil, 1, 0, 0, 0, x, y, z, ta));
    if (M.p.mode === 'magnet') {
      const [px, py, pz] = s.pos, [vx, vy, vz] = s.vel, h = 1e-4, Im = M.magnetRingCurrent();
      if (vx || vy || vz) {
        // (v·∇)A for an azimuthal A: differentiate the Cartesian components numerically
        const Acart = (xx, yy, zz, out) => {
          const a = addStackField(M.magnet, Im, px, py, pz, xx, yy, zz, tb);
          const dx = xx - px, dy = yy - py, r = Math.hypot(dx, dy);
          out[0] = r > 0 ? -a * dy / r : 0; out[1] = r > 0 ? a * dx / r : 0;
          return out;
        };
        const ap = Acart(x + h * vx, y + h * vy, z + h * vz, [0, 0]);
        const am = Acart(x - h * vx, y - h * vy, z - h * vz, [0, 0]);
        e[0] += (ap[0] - am[0]) / (2 * h); e[1] += (ap[1] - am[1]) / (2 * h);
      }
    }
    return e;
  };

  // On-axis Bz of the coil per the continuous finite-solenoid formula (reference curve), T.
  M.solenoidAxis = (z, I) => {
    const { N, R, L } = M.p;
    if (N === 1) return MU0 * I * R * R / (2 * Math.pow(R * R + z * z, 1.5));
    const n = N / L, u = z + L / 2, w = z - L / 2;
    return 0.5 * MU0 * n * I * (u / Math.hypot(u, R) - w / Math.hypot(w, R));
  };

  return M.configure({});
}

// ---------------------------------------------------------------------------- motion -------------

// Smooth move from z0 to z1 between t0 and t0 + T (raised-cosine velocity profile).
export function scripted({ x = 0, z0, z1, t0 = 0.2, T }) {
  return (t) => {
    const u = Math.min(Math.max((t - t0) / T, 0), 1);
    const z = z0 + (z1 - z0) * (u - Math.sin(2 * Math.PI * u) / (2 * Math.PI));
    const vz = u > 0 && u < 1 ? (z1 - z0) / T * (1 - Math.cos(2 * Math.PI * u)) : 0;
    return { pos: [x, 0, z], vel: [0, 0, vz] };
  };
}

// Magnet dropped from rest at z0 along x = const: m·z'' = -m·g + F_z(z, z'), RK4 with step dt.
// Returns samples { t[], z[], v[] } up to tEnd or until the magnet leaves the box.
export function simulateDrop(model, { x = 0, z0, tEnd = 1.5, dt = 5e-4 }) {
  const m = model.p.mass, t = [0], zs = [z0], vs = [0];
  const acc = (z, v) => model.evaluate({ t: 0, pos: [x, 0, z], vel: [0, 0, v] }).F[2] / m - G;
  let z = z0, v = 0;
  for (let k = 1; k * dt <= tEnd + 1e-12 && z > -BOX.z - 0.1; k++) {
    const k1v = acc(z, v), k1z = v;
    const k2v = acc(z + 0.5 * dt * k1z, v + 0.5 * dt * k1v), k2z = v + 0.5 * dt * k1v;
    const k3v = acc(z + 0.5 * dt * k2z, v + 0.5 * dt * k2v), k3z = v + 0.5 * dt * k2v;
    const k4v = acc(z + dt * k3z, v + dt * k3v), k4z = v + dt * k3v;
    z += dt / 6 * (k1z + 2 * k2z + 2 * k3z + k4z);
    v += dt / 6 * (k1v + 2 * k2v + 2 * k3v + k4v);
    t.push(k * dt); zs.push(z); vs.push(v);
  }
  return { t, z: zs, v: vs, dt };
}
