// A bead on a track: kinetic, potential and heat. The track is a turtle path of straight pieces and
// circular arcs (so the tangent angle θ and the curvature κ are exact); the bead moves along the arc
// length s and leaves the track where the normal force would pull it in. SI units, per kg unless noted.
// Pure, no DOM.
export const G = 9.81;
const DS = 0.004; // track sample spacing (m)

// pieces: ['line', length] or ['arc', radius, turn (rad, + = left)]
function turtle(x0, y0, th0, pieces) {
  const x = [x0], y = [y0], th = [th0], k = [0], S = [0];
  for (const [kind, a, b] of pieces) {
    const len = kind === 'line' ? a : a * Math.abs(b), n = Math.max(1, Math.round(len / DS)), kap = kind === 'line' ? 0 : Math.sign(b) / a;
    for (let i = 0; i < n; i++) {
      const t0 = th.at(-1), t1 = t0 + kap * len / n;
      // exact chord of a straight piece or an arc
      const dx = kap ? (Math.sin(t1) - Math.sin(t0)) / kap : len / n * Math.cos(t0), dy = kap ? (Math.cos(t0) - Math.cos(t1)) / kap : len / n * Math.sin(t0);
      x.push(x.at(-1) + dx); y.push(y.at(-1) + dy); th.push(t1); k.push(kap); S.push(S.at(-1) + len / n);
    }
  }
  return { x, y, th, k, S, L: S.at(-1) };
}

// ramp: down at angle ang from height h, a fillet of radius r, then a flat. loop: the same, then a full
// vertical circle of radius R. valley: down at ang, round a bottom arc, up at ang.
export function track({ kind, h, ang, R = 1 }) {
  const r = 0.6, drop = h - r * (1 - Math.cos(ang)), ramp = drop / Math.sin(ang);
  if (kind === 'valley') {
    const rb = 1.5, down = (h - rb * (1 - Math.cos(ang))) / Math.sin(ang);
    return { ...turtle(0, h, -ang, [['line', down], ['arc', rb, 2 * ang], ['line', down + 1.2]]), kind };
  }
  if (kind === 'loop') {
    const T = turtle(0, h, -ang, [['line', ramp], ['arc', r, ang], ['line', 1.5], ['arc', R, 2 * Math.PI], ['line', 3]]);
    const i0 = T.S.findIndex((v) => v >= ramp + r * ang + 1.5 - 1e-9); // loop start: the centre is R above it
    return { ...T, kind, centre: [T.x[i0], T.y[i0] + R], R };
  }
  return { ...turtle(0, h, -ang, [['line', ramp], ['arc', r, ang], ['line', 7]]), kind };
}

// θ and κ at arc length s (θ linear between samples, κ of the piece)
const at = (T, s) => {
  const S = T.S; let lo = 0, hi = S.length - 1; s = Math.max(0, Math.min(T.L, s));
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
  const i = lo, f = (s - S[i]) / (S[i + 1] - S[i]); return { th: T.th[i] + (T.th[i + 1] - T.th[i]) * f, k: T.k[i + 1], x: T.x[i] + (T.x[i + 1] - T.x[i]) * f, y: T.y[i] + (T.y[i + 1] - T.y[i]) * f }; };
// normal force per kg from the track (along the left normal): N/m = v²κ + g cos θ
export const normal = (th, k, v) => v * v * k + G * Math.cos(th);

// Simulate from rest at s = 0 for up to tMax. Samples every `every` steps:
// { t, x, y, v (speed), N (per kg), K, U, Q (per kg), phase: 'track' | 'air' | 'stuck' | 'end' }
export function simulate(T, { mu = 0, tMax = 12, dt = 1e-3, every = 10 } = {}) {
  const y0 = Math.min(...T.y), out = { t: [], x: [], y: [], v: [], N: [], K: [], U: [], Q: [], phase: [] };
  const acc = (s, v) => { // friction opposes the motion; at rest, the way the slope would start it
    const p = at(T, s), N = normal(p.th, p.k, v), dir = v ? Math.sign(v) : -Math.sign(Math.sin(p.th));
    return [v, -G * Math.sin(p.th) - mu * Math.abs(N) * dir, mu * Math.abs(N) * Math.abs(v)];
  };
  let s = 0, v = 0, Q = 0, t = 0, phase = 'track', px = 0, py = 0, vx = 0, vy = 0, n = 0;
  const push = () => {
    const p = phase === 'air' ? { x: px, y: py } : at(T, s), sp = phase === 'air' ? Math.hypot(vx, vy) : Math.abs(v);
    const q = at(T, s), N = phase === 'track' ? normal(q.th, q.k, v) : 0;
    out.t.push(t); out.x.push(p.x); out.y.push(p.y); out.v.push(sp); out.N.push(N); out.K.push(0.5 * sp * sp); out.U.push(G * (p.y - y0)); out.Q.push(Q); out.phase.push(phase);
  };
  // static friction is taken equal to kinetic: starting at rest, the bead slides only if tan θ > μ
  if (Math.abs(Math.tan(at(T, 0).th)) <= mu) phase = 'stuck';
  push();
  while (t < tMax - 1e-12 && (phase === 'track' || phase === 'air')) {
    if (phase === 'track') {
      const k1 = acc(s, v), k2 = acc(s + k1[0] * dt / 2, v + k1[1] * dt / 2), k3 = acc(s + k2[0] * dt / 2, v + k2[1] * dt / 2), k4 = acc(s + k3[0] * dt, v + k3[1] * dt);
      const vn = v + (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) * dt / 6;
      // came to rest (friction flips sign inside the step, so check the Euler guess too): stays if friction can hold it
      if (mu > 0 && v !== 0 && (vn * v <= 0 || (v + k1[1] * dt) * v <= 0)) {
        const p = at(T, s); if (Math.abs(Math.sin(p.th)) <= mu * Math.cos(p.th)) { v = 0; phase = 'stuck'; }
      }
      if (phase === 'track') {
        s += (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) * dt / 6; Q += (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]) * dt / 6; v = vn;
        const p = at(T, s);
        if (s >= T.L || s <= 0) { s = Math.max(0, Math.min(T.L, s)); phase = 'end'; }
        else if (normal(p.th, p.k, v) < 0) { phase = 'air'; px = p.x; py = p.y; vx = v * Math.cos(p.th); vy = v * Math.sin(p.th); }
      }
    } else if (phase === 'air') { // projectile, exact; stops when it meets the loop again
      px += vx * dt; py += vy * dt - 0.5 * G * dt * dt; vy -= G * dt;
      if (T.centre ? Math.hypot(px - T.centre[0], py - T.centre[1]) >= T.R : py < y0) phase = 'end';
    }
    t += dt;
    if (++n % every === 0 || phase === 'end' || phase === 'stuck') push();
  }
  return out;
}

// Theory. Loop of radius R from height h (above its bottom): completes if h ≥ 5R/2, else leaves the
// track at height R(1 − cos φ) with cos φ = (2 − 2h/R)/3 (φ from the bottom).
export const loopMinHeight = (R) => 2.5 * R;
export const detachHeight = (h, R) => R * (1 - (2 - 2 * h / R) / 3);
export const rampAccel = (ang, mu) => G * (Math.sin(ang) - mu * Math.cos(ang));
