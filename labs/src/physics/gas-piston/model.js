// Kinetic theory in a box: N point particles (argon) bouncing elastically off the walls of a
// [0,a]×[0,a]×[0,h] box whose lid (the piston) can move. Pressure is measured from the momentum
// delivered to all six walls. Each simulated particle stands for `weight` real atoms. SI units.
// Atom–atom collisions are modelled as isotropic scattering: at rate nu each atom's direction is
// randomised and its speed kept. That conserves energy and shares it between x, y and z as real
// collisions do (without it, squeezing along z would heat only the z motion).
export const KB = 1.380649e-23, NA = 6.02214076e23, M_AR = 6.6335209e-26;

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function createGas({ N = 600, moles = 0.01, T = 300, a = 0.1, h = 0.1, seed = 7 }) {
  const r = rng(seed), g = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  const s = Math.sqrt(KB * T / M_AR), x = new Float64Array(3 * N), v = new Float64Array(3 * N);
  for (let i = 0; i < N; i++) { x[3 * i] = r() * a; x[3 * i + 1] = r() * a; x[3 * i + 2] = r() * h; for (let k = 0; k < 3; k++) v[3 * i + k] = s * g(); }
  return { N, a, h, x, v, weight: moles * NA / N, impulse: 0, tImp: 0, rand: r };
}
// Advance by dt with the lid at height h moving at speed u (m/s, + = outward).
export function step(G, dt, h, u, nu = 1e5) {
  const { N, a, x, v, rand } = G, pScatter = nu * dt;
  let imp = 0;
  for (let i = 0; i < N; i++) {
    if (rand() < pScatter) { // isotropic scattering, speed kept
      const sp = Math.hypot(v[3 * i], v[3 * i + 1], v[3 * i + 2]), c = 2 * rand() - 1, ph = 2 * Math.PI * rand(), sn = Math.sqrt(1 - c * c);
      v[3 * i] = sp * sn * Math.cos(ph); v[3 * i + 1] = sp * sn * Math.sin(ph); v[3 * i + 2] = sp * c;
    }
    for (let k = 0; k < 3; k++) {
      const o = 3 * i + k;
      x[o] += v[o] * dt;
      const top = k === 2 ? h : a;
      if (x[o] < 0) { x[o] = -x[o]; imp += 2 * Math.abs(v[o]); v[o] = -v[o]; }
      else if (x[o] > top) {
        const w = k === 2 ? u : 0, vr = v[o] - w;           // velocity relative to the wall
        if (vr > 0) { imp += 2 * vr; v[o] = 2 * w - v[o]; }  // elastic bounce off a moving wall
        x[o] = 2 * top - x[o];
      }
    }
  }
  G.h = h; G.impulse += imp * M_AR * G.weight; G.tImp += dt;
}
export const temperature = (G) => { let s = 0; for (let i = 0; i < G.v.length; i++) s += G.v[i] * G.v[i]; return M_AR * s / (3 * KB * G.N); };
export function rescaleTo(G, T) { const f = Math.sqrt(T / temperature(G)); for (let i = 0; i < G.v.length; i++) G.v[i] *= f; }
// Pressure since the last reading: impulse / (time · total wall area); resets the counter.
export function readPressure(G) { const A = 2 * G.a * G.a + 4 * G.a * G.h, P = G.impulse / (G.tImp * A); G.impulse = 0; G.tImp = 0; return P; }
export const idealPressure = (G) => G.N * G.weight * KB * temperature(G) / (G.a * G.a * G.h);
export const maxwell = (v, T) => { const m = M_AR, c = m / (2 * KB * T); return 4 * Math.PI * (c / Math.PI) ** 1.5 * v * v * Math.exp(-c * v * v); };
