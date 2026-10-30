// Heat engines: one mole of a monatomic ideal gas taken round a cycle of isothermal, adiabatic,
// isochoric and isobaric legs. Per leg: the sampled path (V, p, T, S), the work done by the gas W, the
// heat taken in Q and ΔU. SI units (V in m³). Pure, no DOM.
export const R = 8.314462618, CV = 1.5 * R, GAMMA = 5 / 3;
const n = 1;
export const entropy = (T, V) => n * CV * Math.log(T) + n * R * Math.log(V); // up to a constant

// A leg from state a = { T, V } of the given kind to the end state b = { T, V } (already consistent).
function leg(kind, a, b, N = 200) {
  const V = [], T = [], P = [], S = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N; let v, t;
    if (kind === 'isochoric') { v = a.V; t = a.T + (b.T - a.T) * u; }
    else {
      v = a.V * (b.V / a.V) ** u; // geometric spacing in V
      t = kind === 'isothermal' ? a.T : kind === 'adiabatic' ? a.T * (a.V / v) ** (GAMMA - 1) : a.T * v / a.V; // isobaric: T ∝ V
    }
    V.push(v); T.push(t); P.push(n * R * t / v); S.push(entropy(t, v));
  }
  const dU = n * CV * (b.T - a.T);
  const W = kind === 'isothermal' ? n * R * a.T * Math.log(b.V / a.V) : kind === 'adiabatic' ? -dU : kind === 'isobaric' ? n * R * (b.T - a.T) : 0;
  return { kind, a, b, V, T, P, S, W, Q: dU + W, dU };
}

// Carnot between Th and Tc; the hot isothermal expands from Va by the ratio r.
export function carnot({ Th, Tc, Va = 0.01, r = 2 }) {
  const k = (Th / Tc) ** (1 / (GAMMA - 1)), A = { T: Th, V: Va }, B = { T: Th, V: Va * r }, C = { T: Tc, V: Va * r * k }, D = { T: Tc, V: Va * k };
  return [leg('isothermal', A, B), leg('adiabatic', B, C), leg('isothermal', C, D), leg('adiabatic', D, A)];
}
// Otto: compression ratio r from (T1, V1), heated at constant volume to T3.
export function otto({ r = 8, T1 = 300, T3 = 2400, V1 = 0.01 }) {
  const V2 = V1 / r, T2 = T1 * r ** (GAMMA - 1), T4 = T3 / r ** (GAMMA - 1);
  const s1 = { T: T1, V: V1 }, s2 = { T: T2, V: V2 }, s3 = { T: T3, V: V2 }, s4 = { T: T4, V: V1 };
  return [leg('adiabatic', s1, s2), leg('isochoric', s2, s3), leg('adiabatic', s3, s4), leg('isochoric', s4, s1)];
}
export function totals(legs) {
  let W = 0, Qin = 0, Qout = 0, dU = 0, dS = 0;
  for (const l of legs) { W += l.W; dU += l.dU; if (l.Q > 0) Qin += l.Q; else Qout -= l.Q; dS += l.S.at(-1) - l.S[0]; }
  return { W, Qin, Qout, dU, dS, eta: W / Qin };
}
// Area enclosed by the sampled p–V loop (shoelace), independent of the analytic W.
export function loopArea(legs) {
  const V = legs.flatMap((l) => l.V), P = legs.flatMap((l) => l.P); let A = 0;
  for (let i = 0; i < V.length; i++) { const j = (i + 1) % V.length; A += V[i] * P[j] - V[j] * P[i]; }
  return -A / 2; // clockwise loop on (V, p) = positive work
}
