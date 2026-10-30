// Small dense networks for the deep-learning labs: forward pass, backpropagation, SGD or Adam.
// Hidden layers share one activation; the output is a sigmoid (binary, cross-entropy), a softmax
// (classes, cross-entropy) or linear (regression, squared error). Pure, no DOM.
import { rng, gauss } from '../../lib/random.js';

export const ACT = {
  tanh: { f: Math.tanh, d: (a) => 1 - a * a },
  relu: { f: (z) => (z > 0 ? z : 0), d: (a, z) => (z > 0 ? 1 : 0) },
  sigmoid: { f: (z) => 1 / (1 + Math.exp(-z)), d: (a) => a * (1 - a) },
  linear: { f: (z) => z, d: () => 1 },
};

// sizes = [inputs, hidden…, outputs]. init: weights ~ N(0, scale²·k/n_in), k = 2 for ReLU (He), else 1 (Xavier)
export function createNet(sizes, { act = 'tanh', out = 'sigmoid', seed = 1, scale = 1 } = {}) {
  const r = rng(seed), W = [], b = [];
  for (let l = 1; l < sizes.length; l++) {
    const nin = sizes[l - 1], s = scale * Math.sqrt((act === 'relu' ? 2 : 1) / nin);
    W.push(Float64Array.from({ length: sizes[l] * nin }, () => s * gauss(r))); b.push(new Float64Array(sizes[l]));
  }
  return { sizes, act, out, W, b };
}
// a[0] = x; a[l], z[l] per layer
export function forward(net, x) {
  const a = [x], z = [null], L = net.W.length, f = ACT[net.act].f;
  for (let l = 0; l < L; l++) {
    const nin = net.sizes[l], nout = net.sizes[l + 1], W = net.W[l], prev = a[l], zl = new Float64Array(nout);
    for (let j = 0; j < nout; j++) { let s = net.b[l][j]; const o = j * nin; for (let i = 0; i < nin; i++) s += W[o + i] * prev[i]; zl[j] = s; }
    let al;
    if (l < L - 1) al = zl.map(f);
    else if (net.out === 'softmax') { const m = Math.max(...zl); al = zl.map((v) => Math.exp(v - m)); const S = al.reduce((p, q) => p + q, 0); for (let j = 0; j < nout; j++) al[j] /= S; }
    else if (net.out === 'sigmoid') al = zl.map(ACT.sigmoid.f);
    else al = Float64Array.from(zl);
    a.push(al); z.push(zl);
  }
  return { a, z };
}
export const output = (net, x) => forward(net, x).a.at(-1);
export const zeros = (net) => ({ W: net.W.map((w) => new Float64Array(w.length)), b: net.b.map((v) => new Float64Array(v.length)) });

// loss of one example, and its gradient added into G. Also returns δ per layer (∂loss/∂z).
export function backward(net, F, y, G) {
  const L = net.W.length, out = F.a[L], d = ACT[net.act].d, delta = new Array(L + 1);
  let loss;
  if (net.out === 'softmax') { loss = -Math.log(Math.max(out[y], 1e-12)); delta[L] = Float64Array.from(out, (p, j) => p - (j === y)); }
  else if (net.out === 'sigmoid') { const p = Math.min(1 - 1e-12, Math.max(1e-12, out[0])); loss = -(y ? Math.log(p) : Math.log(1 - p)); delta[L] = Float64Array.of(out[0] - y); }
  else { const t = typeof y === 'number' ? [y] : y; loss = 0; delta[L] = Float64Array.from(out, (o, j) => { loss += 0.5 * (o - t[j]) ** 2; return o - t[j]; }); }
  for (let l = L; l >= 1; l--) {
    const nin = net.sizes[l - 1], nout = net.sizes[l], W = net.W[l - 1], prev = F.a[l - 1], dl = delta[l];
    if (G) for (let j = 0; j < nout; j++) { G.b[l - 1][j] += dl[j]; const o = j * nin; for (let i = 0; i < nin; i++) G.W[l - 1][o + i] += dl[j] * prev[i]; }
    if (l > 1) { const dp = new Float64Array(nin); for (let j = 0; j < nout; j++) { const o = j * nin; for (let i = 0; i < nin; i++) dp[i] += W[o + i] * dl[j]; } for (let i = 0; i < nin; i++) dp[i] *= d(prev[i], F.z[l - 1][i]); delta[l - 1] = dp; }
  }
  return { loss, delta };
}
// apply the summed gradient G of n examples. opt: 'sgd' or 'adam' (state kept in o.state)
export function update(net, G, n, { lr = 0.1, l2 = 0, opt = 'sgd', state = null } = {}) {
  const groups = [...net.W.map((w, l) => [w, G.W[l], true]), ...net.b.map((v, l) => [v, G.b[l], false])];
  if (opt === 'adam' && state) { state.t = (state.t || 0) + 1; state.m ??= groups.map(([p]) => new Float64Array(p.length)); state.v ??= groups.map(([p]) => new Float64Array(p.length)); }
  groups.forEach(([p, g, isW], k) => {
    for (let i = 0; i < p.length; i++) {
      const gi = g[i] / n + (isW ? l2 * p[i] : 0);
      if (opt === 'adam' && state) {
        const m = state.m[k], v = state.v[k]; m[i] = 0.9 * m[i] + 0.1 * gi; v[i] = 0.999 * v[i] + 0.001 * gi * gi;
        p[i] -= lr * (m[i] / (1 - 0.9 ** state.t)) / (Math.sqrt(v[i] / (1 - 0.999 ** state.t)) + 1e-8);
      } else p[i] -= lr * gi;
    }
  });
}
// one pass over the data in shuffled mini-batches; X[i] inputs, Y[i] targets. Returns the mean loss.
export function epoch(net, X, Y, { batch = 16, r = rng(1), ...o } = {}) {
  const idx = Array.from(X, (_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  let tot = 0;
  for (let s = 0; s < idx.length; s += batch) {
    const G = zeros(net), B = idx.slice(s, s + batch);
    for (const i of B) tot += backward(net, forward(net, X[i]), Y[i], G).loss;
    update(net, G, B.length, o);
  }
  return tot / idx.length;
}
export function evaluate(net, X, Y) {
  let loss = 0, hit = 0;
  for (let i = 0; i < X.length; i++) {
    const F = forward(net, X[i]), o = F.a.at(-1); loss += backward(net, F, Y[i], null).loss;
    if (net.out === 'softmax') hit += o.indexOf(Math.max(...o)) === Y[i]; else if (net.out === 'sigmoid') hit += (o[0] > 0.5) === !!Y[i];
  }
  return { loss: loss / X.length, acc: hit / X.length };
}
export const params = (net) => net.W.reduce((s, w) => s + w.length, 0) + net.b.reduce((s, v) => s + v.length, 0);
