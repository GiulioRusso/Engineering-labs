import { MU0 } from '../../../lib/physics/loop.js';
import { createModel, scripted, simulateDrop, G } from './coil.js';
import { near, ok, pct } from '../../../lib/testing.js';

const snap = (M, pos, extra = {}) => ({ t: 0, pos, vel: [0, 0, 0], iCoil: 0, iProbe: 0, ...extra });
const Bz = (M, x, z, s) => M.field(x, 0, z, s, [0, 0, 0])[2];

export const tests = {
  'single loop: on-axis field = μ0·I·R²/(2(R²+z²)^3/2)'() {
    const M = createModel().configure({ N: 1, R: 0.05, L: 0.001, I0: 2 });
    let worst = 0;
    for (const z of [0, 0.02, 0.06, 0.15]) {
      const want = MU0 * 2 * 0.05 ** 2 / (2 * Math.pow(0.05 ** 2 + z * z, 1.5));
      worst = Math.max(worst, near(Bz(M, 0, z, snap(M, [0.2, 0, 0.3], { iCoil: 2 })), want, 1e-3, `z=${z}`));
    }
    return `worst ${pct(worst)}, budget 0.1 %`;
  },
  'long solenoid: centre field = μ0·n·I'() {
    const M = createModel().configure({ N: 400, R: 0.01, L: 0.8, I0: 1.5 });
    const e = near(Bz(M, 0, 0, snap(M, [0.2, 0, 0.3], { iCoil: 1.5 })), MU0 * 400 / 0.8 * 1.5, 1e-2, 'B centre');
    const out = Math.abs(Bz(M, 0.03, 0, snap(M, [0.2, 0, 0.3], { iCoil: 1.5 }))) / (MU0 * 500 * 1.5);
    ok(out < 0.01, `outside/inside = ${out}`);
    return `error ${pct(e)}, budget 1 %; field 2R outside = ${pct(out)} of inside`;
  },
  'finite solenoid: on-axis field = continuous formula'() {
    const M = createModel();
    let worst = 0;
    for (let z = -0.3; z <= 0.3; z += 0.01) {
      const s = snap(M, [0.25, 0, 0.35], { iCoil: 2 });
      worst = Math.max(worst, near(Bz(M, 0, z, s), M.solenoidAxis(z, 2), 1e-2, `z=${z.toFixed(2)}`));
    }
    return `worst ${pct(worst)} over |z| ≤ 0.3 m, budget 1 %`;
  },
  'Amperian magnet: far field = dipole μ0·m/(2π·z³)'() {
    const M = createModel().configure({ mode: 'magnet' });
    const z = 0.5, m = M.magnetMoment();
    const e = near(Bz(M, 0, z, snap(M, [0, 0, 0])), MU0 * m / (2 * Math.PI * z ** 3), 1e-2, 'Bz');
    return `m = ${m.toFixed(2)} A·m², error ${pct(e)}`;
  },
  '∇·B ≈ 0 for coil + magnet together'() {
    const M = createModel().configure({ mode: 'magnet' });
    const s = snap(M, [0.01, 0, 0.12], { iCoil: 3 }), h = 1e-3;
    const B = (x, y, z) => M.field(x, y, z, s, [0, 0, 0]);
    let worst = 0;
    for (const [x, y, z] of [[0.02, 0.01, 0], [0.07, -0.02, 0.1], [0.03, 0.03, 0.2], [0.12, 0, -0.15]]) {
      const d = [B(x + h, y, z)[0] - B(x - h, y, z)[0], B(x, y + h, z)[1] - B(x, y - h, z)[1], B(x, y, z + h)[2] - B(x, y, z - h)[2]];
      worst = Math.max(worst, Math.abs(d[0] + d[1] + d[2]) / (Math.abs(d[0]) + Math.abs(d[1]) + Math.abs(d[2])));
    }
    ok(worst < 0.02, `relative divergence ${worst}`);
    return `worst ${worst.toExponential(1)}`;
  },
  'EMF = -dΦ/dt by finite difference (moving probe, DC coil; still probe, AC coil)'() {
    const M = createModel();
    const move = scripted({ x: 0.01, z0: -0.25, z1: 0.1, T: 0.4 });
    const at = (t) => M.evaluate({ t, ...move(t) });
    let worst = 0;
    for (const t of [0.25, 0.3, 0.4, 0.5]) {
      const d = 1e-5;
      worst = Math.max(worst, near(at(t).emf, -(at(t + d).phi - at(t - d).phi) / (2 * d), 1e-3, `t=${t}`));
    }
    M.configure({ f: 50 });
    const still = (t) => M.evaluate({ t, pos: [0, 0, 0.03], vel: [0, 0, 0] });
    for (const t of [0.001, 0.0037, 0.011]) {
      const d = 1e-7;
      worst = Math.max(worst, near(still(t).emf, -(still(t + d).phi - still(t - d).phi) / (2 * d), 1e-3, `AC t=${t}`));
    }
    return `worst ${pct(worst)}`;
  },
  "Lenz: induced current opposes the change, force opposes the motion"() {
    const M = createModel().configure({ mode: 'magnet', pol: 1 });
    // N pole up, magnet below the coil moving up: flux (+z) through the coil grows.
    const s = M.evaluate({ t: 0, pos: [0, 0, -0.12], vel: [0, 0, 1] });
    ok(s.phi > 0 && s.iInd < 0, `Φ = ${s.phi}, I_ind = ${s.iInd} (want I_ind < 0: B_ind along -z)`);
    ok(s.F[2] < 0, `F_z = ${s.F[2]} (want < 0, against v)`);
    const out = M.evaluate({ t: 0, pos: [0, 0, 0.12], vel: [0, 0, 1] }); // leaving through the top
    ok(out.iInd > 0 && out.F[2] < 0, `leaving: I_ind = ${out.iInd}, F_z = ${out.F[2]}`);
    M.configure({ mode: 'probe', f: 0 });
    const p = M.evaluate({ t: 0, pos: [0, 0, -0.15], vel: [0, 0, 0.5] });
    ok(p.iProbe < 0 && p.F[2] < 0, `probe entering DC coil: I = ${p.iProbe}, F_z = ${p.F[2]}`);
  },
  'energy balance: mechanical power = -Joule power'() {
    const M = createModel().configure({ mode: 'magnet', Rc: 0.3 });
    const s = M.evaluate({ t: 0, pos: [0.005, 0, -0.07], vel: [0.1, 0, 0.8] });
    const e = near(-s.pMech, s.pJoule, 1e-9, 'power');
    return `P_J = ${(s.pJoule * 1e3).toFixed(3)} mW, error ${e.toExponential(1)}`;
  },
  'magnet still inside the coil: maximum flux, zero EMF'() {
    const M = createModel().configure({ mode: 'magnet' });
    const s = M.evaluate({ t: 0, pos: [0, 0, 0], vel: [0, 0, 0] });
    ok(Math.abs(s.gradM[2]) < 1e-3 * Math.abs(s.M) / 0.01, `∂M/∂z at centre = ${s.gradM[2]}`);
    ok(s.emf === 0 && s.phi > 0, `EMF = ${s.emf}, Φ = ${s.phi}`);
  },
  'drop: open circuit = free fall; closed circuit brakes and conserves energy'() {
    const M = createModel().configure({ mode: 'magnet', Rc: Infinity });
    const free = simulateDrop(M, { z0: 0.3, tEnd: 0.3 });
    const k = free.t.length - 1;
    near(free.z[k], 0.3 - 0.5 * G * free.t[k] ** 2, 1e-9, 'free fall z');
    M.configure({ Rc: 0.05 });
    const d = simulateDrop(M, { z0: 0.3, tEnd: 0.45 });
    const j = d.t.length - 1;
    ok(d.z[j] > 0.3 - 0.5 * G * d.t[j] ** 2 + 0.01, 'closed circuit should fall measurably slower');
    // m·g·Δh = ½·m·v² + ∫ I²R dt
    let heat = 0;
    for (let i = 0; i < j; i++) heat += M.evaluate({ t: 0, pos: [0, 0, d.z[i]], vel: [0, 0, d.v[i]] }).pJoule * d.dt;
    const m = M.p.mass, e = near(m * G * (0.3 - d.z[j]), 0.5 * m * d.v[j] ** 2 + heat, 1e-2, 'energy');
    return `braked by ${((d.z[j] - (0.3 - 0.5 * G * d.t[j] ** 2)) * 100).toFixed(1)} cm, energy error ${pct(e)}`;
  },
};
