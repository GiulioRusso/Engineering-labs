// Loss surfaces in two parameters and the optimizers that walk them: plain gradient descent, momentum,
// RMSProp and Adam, optionally with noisy (stochastic) gradients. Pure, no DOM.
import { rng } from '../neuron/model.js';

export const SURFACES = {
  ravine: { label: 'Narrow ravine', f: (x, y) => 0.5 * (x * x + 12 * y * y), g: (x, y) => [x, 12 * y], start: [-2.6, 0.9], box: 3 },
  rosen: { label: 'Banana valley (Rosenbrock)', f: (x, y) => (1 - x) ** 2 + 4 * (y - x * x) ** 2, g: (x, y) => [-2 * (1 - x) - 16 * x * (y - x * x), 8 * (y - x * x)], start: [-1.6, 2.2], box: 2.6 },
  saddle: { label: 'Saddle', f: (x, y) => x * x - y * y + 0.12 * y ** 4 + 2.1, g: (x, y) => [2 * x, -2 * y + 0.48 * y ** 3], start: [-2.4, 0.02], box: 3 },
  wells: { label: 'Two valleys', f: (x, y) => 2.2 - 1.2 * Math.exp(-((x - 1.4) ** 2 + (y - 1) ** 2)) - 2 * Math.exp(-((x + 1.2) ** 2 + (y + 1.2) ** 2) / 0.8) + 0.04 * (x * x + y * y), g: null, start: [2.5, 2.4], box: 3 },
};
// numerical gradient where none is given
export const grad = (S, x, y) => (S.g ? S.g(x, y) : [(S.f(x + 1e-5, y) - S.f(x - 1e-5, y)) / 2e-5, (S.f(x, y + 1e-5) - S.f(x, y - 1e-5)) / 2e-5]);

export const OPTS = ['gd', 'momentum', 'rmsprop', 'adam'];
// run one optimizer for n steps; noise = std of gaussian noise added to the gradient
export function run(S, kind, { lr = 0.05, beta = 0.9, n = 200, noise = 0, seed = 11 } = {}) {
  const r = rng(seed), gn = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  let [x, y] = S.start; const P = [[x, y]]; let vx = 0, vy = 0, sx = 0, sy = 0;
  for (let t = 1; t <= n; t++) {
    let [gx, gy] = grad(S, x, y); gx += noise * gn(); gy += noise * gn();
    if (kind === 'gd') { x -= lr * gx; y -= lr * gy; }
    else if (kind === 'momentum') { vx = beta * vx + gx; vy = beta * vy + gy; x -= lr * vx; y -= lr * vy; }
    else if (kind === 'rmsprop') { sx = 0.9 * sx + 0.1 * gx * gx; sy = 0.9 * sy + 0.1 * gy * gy; x -= lr * gx / (Math.sqrt(sx) + 1e-8); y -= lr * gy / (Math.sqrt(sy) + 1e-8); }
    else { vx = beta * vx + (1 - beta) * gx; vy = beta * vy + (1 - beta) * gy; sx = 0.999 * sx + 0.001 * gx * gx; sy = 0.999 * sy + 0.001 * gy * gy; const c1 = 1 - beta ** t, c2 = 1 - 0.999 ** t; x -= lr * (vx / c1) / (Math.sqrt(sy * 0 + sx / c2) + 1e-8); y -= lr * (vy / c1) / (Math.sqrt(sy / c2) + 1e-8); }
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 50 || Math.abs(y) > 50) { P.push([NaN, NaN]); break; }
    P.push([x, y]);
  }
  return P;
}
