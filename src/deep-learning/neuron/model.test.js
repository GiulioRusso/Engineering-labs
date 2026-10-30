import { blobs, moons, logLoss, logGrad, descend, accuracy, sigmoid, trainMLP, mlpForward } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'logistic gradient matches finite differences'() { const P = blobs(), h = 1e-6, [g1] = logGrad(P, 0.3, -0.2, 0.1); near(g1, (logLoss(P, 0.3 + h, -0.2, 0.1) - logLoss(P, 0.3 - h, -0.2, 0.1)) / (2 * h), 1e-5, 'dL/dw1'); },
  'gradient descent lowers the loss and separates the blobs'() { const P = blobs(), path = descend(P, [0, 0, 0], 0.5, 200), [a, c, b] = path.at(-1); ok(logLoss(P, a, c, b) < logLoss(P, 0, 0, 0) - 0.3, 'loss falls'); ok(accuracy(P, (x, y) => sigmoid(a * x + c * y + b)) > 0.9, 'accuracy'); },
  'a linear neuron cannot solve the moons, a hidden layer can'() { const P = moons(); const [a, c, b] = descend(P, [0, 0, 0], 0.5, 400).at(-1); const lin = accuracy(P, (x, y) => sigmoid(a * x + c * y + b)); const T = trainMLP(P, { H: 8, epochs: 800 }); const nn = accuracy(P, (x, y) => mlpForward(T.snaps.at(-1), x, y).out); ok(lin < 0.9, `linear ${lin}`); ok(nn > 0.95, `network ${nn}`); },
};
