// Signals through a deep stack of dense layers at initialisation: how the spread of the activations and the
// size of the gradients change from layer to layer, for each activation and weight scale. Width W, a batch
// of standard normal inputs, a random gradient arriving at the top. Pure, no DOM.
import { rng, gauss } from '../../lib/random.js';

export const INITS = { small: { label: '0.1/√n', k: 0.1 }, xavier: { label: 'Xavier 1/√n', k: 1 }, he: { label: 'He √2/√n', k: Math.SQRT2 }, large: { label: '3/√n', k: 3 } };
const F = { tanh: [Math.tanh, (a) => 1 - a * a], sigmoid: [(z) => 1 / (1 + Math.exp(-z)), (a) => a * (1 - a)], relu: [(z) => (z > 0 ? z : 0), (a) => (a > 0 ? 1 : 0)], linear: [(z) => z, () => 1] };

export function probe({ depth = 10, width = 64, act = 'tanh', init = 'xavier', batch = 200, seed = 1 }) {
  const r = rng(seed), [f, df] = F[act], s = INITS[init].k / Math.sqrt(width);
  const Ws = Array.from({ length: depth }, () => Float64Array.from({ length: width * width }, () => s * gauss(r)));
  let A = Array.from({ length: batch }, () => Float64Array.from({ length: width }, () => gauss(r)));
  const acts = [];
  for (const W of Ws) {
    A = A.map((a) => { const o = new Float64Array(width); for (let j = 0; j < width; j++) { let z = 0; for (let i = 0; i < width; i++) z += W[j * width + i] * a[i]; o[j] = f(z); } return o; });
    acts.push(A);
  }
  // backward: δ at the top is random; δ_prev = (Wᵀδ)·f′(a_prev); ‖∂L/∂W_l‖ = ‖δ_l a_{l−1}ᵀ‖ summed over the batch
  const gnorm = new Array(depth).fill(0);
  for (let n = 0; n < batch; n++) {
    let d = Float64Array.from({ length: width }, () => gauss(r)).map((v, j) => v * df(acts[depth - 1][n][j]));
    for (let l = depth - 1; l >= 0; l--) {
      const prev = l ? acts[l - 1][n] : null; let dn = 0, pn = 0;
      for (let j = 0; j < width; j++) dn += d[j] * d[j];
      if (prev) for (let i = 0; i < width; i++) pn += prev[i] * prev[i]; else pn = width; // inputs have unit variance
      gnorm[l] += dn * pn;
      if (l) { const W = Ws[l], nd = new Float64Array(width); for (let j = 0; j < width; j++) for (let i = 0; i < width; i++) nd[i] += W[j * width + i] * d[j]; d = nd.map((v, i) => v * df(prev[i])); }
    }
  }
  const stats = acts.map((A2) => { const v = A2.flatMap((a) => Array.from(a)), m = v.reduce((p, q) => p + q, 0) / v.length; return { values: v, mean: m, std: Math.sqrt(v.reduce((p, q) => p + (q - m) ** 2, 0) / v.length) }; });
  return { stats, grad: gnorm.map((g) => Math.sqrt(g / batch)) };
}
