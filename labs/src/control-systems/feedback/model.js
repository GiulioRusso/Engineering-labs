// Plants for the feedback topics and the steady-state error of a unity-feedback loop. Pure, no DOM.
export const TYPES = {
  0: { label: '1 / ((s + 1)(0.5s + 1))', num: [1], den: [0.5, 1.5, 1] },
  1: { label: '1 / (s(s + 1))', num: [1], den: [1, 1, 0] },
  2: { label: '(2s + 1) / (s²(s + 2))', num: [2, 1], den: [1, 2, 0, 0] },
};
export const PLANTS = {
  p3: { label: '1 / (s(s + 1)(s + 3))', num: [1], den: [1, 4, 3, 0], zeros: [], poles: [[0, 0], [-1, 0], [-3, 0]] },
  p2: { label: '1 / (s(s + 2))', num: [1], den: [1, 2, 0], zeros: [], poles: [[0, 0], [-2, 0]] },
  zero: { label: '(s + 2) / (s(s + 1)(s + 4))', num: [1, 2], den: [1, 5, 4, 0], zeros: [[-2, 0]], poles: [[0, 0], [-1, 0], [-4, 0]] },
};
export const INPUT = { step: (t) => 1, ramp: (t) => t, parabola: (t) => t * t / 2 };

// steady-state error from the error constants (unity feedback, stable loop)
export function ssError(type, input, K) {
  const n = { step: 0, ramp: 1, parabola: 2 }[input], c = type === 2 ? K / 2 : K; // Kp, Kv or Ka of the chosen plants
  if (type < n) return Infinity;
  if (type > n) return 0;
  return n === 0 ? 1 / (1 + c) : 1 / c;
}
