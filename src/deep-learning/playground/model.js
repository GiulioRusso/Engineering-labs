// 2D toy datasets for training small networks: XOR quadrants, circles, two spirals, moons. Points are
// [x, y, class] in about [−1.2, 1.2]². Training uses the shared engine in ../net/model.js. Pure, no DOM.
import { rng, gauss } from '../../lib/random.js';
import { createNet, epoch, evaluate } from '../net/model.js';

export const DATASETS = { xor: 'XOR quadrants', circles: 'Circles', spiral: 'Two spirals', moons: 'Moons' };
export function dataset(kind, n = 240, seed = 1, noise = 0.08) {
  const r = rng(seed), P = [];
  for (let i = 0; i < n; i++) {
    const c = i % 2; let x, y;
    if (kind === 'xor') { do { x = 2.2 * r() - 1.1; y = 2.2 * r() - 1.1; } while (Math.abs(x) < 0.08 || Math.abs(y) < 0.08 || (x * y > 0) !== !!c); }
    else if (kind === 'circles') { const a = 2 * Math.PI * r(), rad = c ? 0.5 * Math.sqrt(r()) : 0.75 + 0.35 * r(); x = rad * Math.cos(a); y = rad * Math.sin(a); }
    else if (kind === 'spiral') { const t = 0.25 + 3 * r(), a = 2.6 * t + c * Math.PI; x = 0.37 * t * Math.cos(a); y = 0.37 * t * Math.sin(a); }
    else { const a = Math.PI * r(); [x, y] = c ? [1 - Math.cos(a), 0.5 - Math.sin(a)] : [Math.cos(a), Math.sin(a)]; x = 0.75 * (x - 0.5); y = 0.75 * (y - 0.25) * 1.4; }
    P.push([x + noise * gauss(r), y + noise * gauss(r), c]);
  }
  return P;
}
export const split = (P) => [P.map((p) => [p[0], p[1]]), P.map((p) => p[2])];
// train a fresh network for a number of epochs (Adam, mini-batches of 16); used by the tests
export function fit(kind, hidden, { act = 'tanh', lr = 0.03, l2 = 0, epochs = 150, seed = 3 } = {}) {
  const [X, Y] = split(dataset(kind, 240, 1)), [Xt, Yt] = split(dataset(kind, 240, 2)), net = createNet([2, ...hidden, 1], { act, seed }), state = {}, r = rng(seed);
  for (let e = 0; e < epochs; e++) epoch(net, X, Y, { lr, l2, opt: 'adam', state, r });
  return { net, train: evaluate(net, X, Y), test: evaluate(net, Xt, Yt) };
}
