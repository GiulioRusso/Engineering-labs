// One artificial neuron, piece by piece: weighted sum, bias, activation; logic gates as neurons; and
// Rosenblatt's perceptron learning rule. Pure, no DOM.
export const ACTS = {
  step: { label: 'Step', f: (z) => (z >= 0 ? 1 : 0), d: () => 0 },
  sigmoid: { label: 'Sigmoid', f: (z) => 1 / (1 + Math.exp(-z)), d: (z) => { const s = 1 / (1 + Math.exp(-z)); return s * (1 - s); } },
  tanh: { label: 'tanh', f: Math.tanh, d: (z) => 1 - Math.tanh(z) ** 2 },
  relu: { label: 'ReLU', f: (z) => Math.max(0, z), d: (z) => (z > 0 ? 1 : 0) },
  linear: { label: 'Linear', f: (z) => z, d: () => 1 },
};
export function neuron(x, w, b, act) {
  const parts = x.map((xi, i) => w[i] * xi), z = parts.reduce((s, p) => s + p, b);
  return { parts, z, y: ACTS[act].f(z), slope: ACTS[act].d(z) };
}
export const GATES = { and: [0, 0, 0, 1], or: [0, 1, 1, 1], nand: [1, 1, 1, 0], nor: [1, 0, 0, 0], xor: [0, 1, 1, 0] };
export const INPUTS = [[0, 0], [0, 1], [1, 0], [1, 1]];
// Perceptron rule: show the examples in turn; when the step neuron is wrong, w ← w + η(t − y)x, b ← b + η(t − y)
export function perceptron(gate, eta = 0.5, steps = 80) {
  let w = [0, 0], b = 0; const hist = [];
  for (let k = 0; k < steps; k++) {
    const i = k % 4, x = INPUTS[i], t = GATES[gate][i], y = w[0] * x[0] + w[1] * x[1] + b >= 0 ? 1 : 0, e = t - y;
    hist.push({ w: [...w], b, i, wrong: e !== 0, errors: INPUTS.filter((q, j) => (w[0] * q[0] + w[1] * q[1] + b >= 0 ? 1 : 0) !== GATES[gate][j]).length });
    w = [w[0] + eta * e * x[0], w[1] + eta * e * x[1]]; b += eta * e;
  }
  return hist;
}
